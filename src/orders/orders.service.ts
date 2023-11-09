import { HttpStatus, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Investments } from 'src/orders/entity/Investment.entity';
import { SellOrders } from 'src/orders/entity/sellOrders.entity';
import {
  SellShareRequest,
  SellShareResponse,
  BuyShareRequest,
  BuyShareResponse,
  GetShareRequest,
  GetShareResponse,
  Share,
} from './orders.pb';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Mongoose } from 'mongoose';
import {
  GetBalanceResponse,
  UpdateBalanceRequest,
  WALLET_SERVICE_NAME,
  WalletServiceClient,
} from './users.pb';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, firstValueFrom } from 'rxjs';
import { ShareDTO } from './orders.dto';
import {ObjectId} from 'mongodb';
import { Types } from 'mongoose'; 

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Investments.name)
    private readonly investmentModel: Model<Investments>,
    @InjectModel(SellOrders.name)
    private readonly sellOrdersModel: Model<SellOrders>,
  ) {}
  private svc: WalletServiceClient;

  @Inject(WALLET_SERVICE_NAME)
  private readonly client: ClientGrpc;
  public onModuleInit(): void {
    this.svc = this.client.getService<WalletServiceClient>(WALLET_SERVICE_NAME);
  }

  public async retrieveShares(
    payload: GetShareRequest,
  ): Promise<GetShareResponse> {
    try {
      const companyId = new mongoose.Types.ObjectId(payload.companyId);
      console.log(companyId);
      const companyShares: any = await this.sellOrdersModel
        .find({ companyId })
        .exec();
      console.log(companyShares);

      return { status: 200, shares: companyShares, error: [] };
    } catch {
      return { status: 500, shares: [], error: ['Error retrieving shares'] };
    }
  }

  public async getDataByUserIdAndCompanyId(
    userId: string,
    companyId: object,
  ): Promise<Investments | null> {
    const data = await this.investmentModel.findOne({ userId, companyId }).exec();
    return data;
  }

  public async buyShare(payload: BuyShareRequest): Promise<BuyShareResponse> {
    const { sellOrderId, numberOfSharesToBuy } = payload;
    const sellOrder = await this.sellOrdersModel.findById({ sellOrderId });

    const sellerUserId = sellOrder.userId;
    const pendingShares = sellOrder.pendingShares;
    const askPrice = sellOrder.askPrice;
    const companyId = sellOrder.companyId;

    // const buyerWallet = await Wallet.findOne({ userId: buyerUserId });
    const buyerWallet: GetBalanceResponse = await firstValueFrom(this.svc.getBalance({userId:payload.userId}));
    const buyerAmount = buyerWallet.walletAmount;
    const totalCost = numberOfSharesToBuy * askPrice;

    if (buyerAmount < totalCost) {
      return { status: HttpStatus.BAD_REQUEST , message: 'Insufficient funds' };
    }

    // if (buyerWallet.walletAmount < totalCost) {
    //   return { status: HttpStatus.BAD_REQUEST };
    // }
    // buyerWallet.walletAmount -= totalCost;
    // await buyerWallet.save();
    const body: UpdateBalanceRequest = {payload.userId, buyerAmount}
    const updateBuyerWallet = await firstValueFrom(this.svc.updateBalance({
      userId: payload.userId,
      walletAmount: buyerAmount,
    }));

    const data = await this.getDataByUserIdAndCompanyId(payload.userId, companyId);

    if(data == null){
      const buyerInvestment = new this.investmentModel({
        userId: payload.userId,
        companyId: companyId,
        myShares: pendingShares.slice(0, numberOfSharesToBuy),
        totalInvestment: totalCost,
      });
      await buyerInvestment.save();
    }

    else{
      const sharesToBuy = pendingShares.slice(0, numberOfSharesToBuy);
      data.myShares.push(...pendingShares);
      data.totalInvestment += totalCost;
      await data.save();
    }

    const sellerInvestment = await this.investmentModel.findOne({
      userId: sellerUserId,
      companyId,
    });

    const sellerShares = sellerInvestment.myShares;
    const updatedShares = sellerShares.filter(
      function (shareId){ 
        return !pendingShares.includes(shareId);
      },
    );

    const remainingInvestment = updatedShares.length * askPrice;

    await this.investmentModel.findOneAndUpdate(
      { userId: sellerUserId, companyId },
      { myShares: updatedShares, totalInvestment: remainingInvestment },
    );

    const remainingShares = pendingShares.filter(
      (shareId) => !updatedShares.includes(shareId),
    );

    await this.sellOrdersModel.findOneAndUpdate(
      { userId: sellerUserId, companyId },
      {
        pendingShares: remainingShares,
        soldShares: pendingShares.slice(0, numberOfSharesToBuy),
      },
    );
  }

  public async sellShare(payload: SellShareRequest): Promise<SellShareResponse>{
    
    const { userId, companyId, sharesToSell, askPrice } = payload;
    // const investment = await this.investmentModel.findOne({ userId, companyId});
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const companyIdObj =new  mongoose.Types.ObjectId(companyId);

  const investment = await this.investmentModel.findOne({ userId: userIdObj,  companyId: companyIdObj });
  
  console.log(userId);  console.log(companyId);
  
  
  console.log(investment, 'inside sellShare service');
    if(!investment){
      return { status: HttpStatus.NOT_FOUND, message: 'Investment not found' };
    }
    const myShares = investment.myShares.slice(0, sharesToSell);

    const sellOrder = new this.sellOrdersModel({
      userId: payload.userId,
      companyId,
      askPrice,
      pendingShares: myShares,
      soldShares: []
    });

    const savedSellOrder = await sellOrder.save();

    return { status: HttpStatus.OK, message: 'Shares Put to Sold Successfully' };
  }
}
