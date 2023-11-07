import { HttpStatus, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Investment } from 'src/orders/entity/Investment.entity';
import { SellOrders } from 'src/orders/entity/sellOrders.entity';
import {
  SellShareRequest,
  SellShareResponse,
  BuyShareRequest,
  BuyShareResponse,
} from './orders.pb';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Mongoose } from 'mongoose';
import {
  GetBalanceResponse,
  WALLET_SERVICE_NAME,
  WalletServiceClient,
} from './users.pb';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';
// import { Observable } from 'rxjs/internal/Observable';

@Injectable()
export class OrdersService implements OnModuleInit {
  constructor(
    @InjectModel(Investment.name)
    private readonly investmentModel: Model<Investment>,
    @InjectModel(SellOrders.name)
    private readonly sellOrdersModel: Model<SellOrders>,
  ) {}
  private svc: WalletServiceClient;
  @Inject(WALLET_SERVICE_NAME)
  private readonly client: ClientGrpc;
  onModuleInit(): void {
    this.svc = this.client.getService<WalletServiceClient>(WALLET_SERVICE_NAME);
  }

  async getDataByUserIdAndCompanyId(
    userId: string,
    companyId: string,
  ): Promise<Investment | null> {
    const companyId = Types.ObjectId(companyId);
    const data = await this.investmentModel.findOne({ userId, companyId }).exec();
    return data;
  }

  async buyShare(payload: any): Promise<BuyShareResponse> {
    const { sellOrderId, numberOfSharesToBuy } = payload;
    const sellOrder = await this.sellOrdersModel.findById({ sellOrderId });

    const sellerUserId = sellOrder.userId;
    const pendingShares = sellOrder.pendingShares;
    const askPrice = sellOrder.askPrice;
    const companyId = sellOrder.companyId;

    // const buyerWallet = await Wallet.findOne({ userId: buyerUserId });
    // const {status, error, walletAmount} :Promise<Observable<GetBalanceResponse>> = await this.svc.getBalance(payload.userId);
    const buyerWallet = this.svc.getBalance(payload.userId);

    const totalCost = numberOfSharesToBuy * askPrice;
    if (buyerWallet.walletAmount < totalCost) {
      return { status: HttpStatus.BAD_REQUEST };
    }

    // if (buyerWallet.walletAmount < totalCost) {
    //   return { status: HttpStatus.BAD_REQUEST };
    // }
    // buyerWallet.walletAmount -= totalCost;
    // await buyerWallet.save();
    const abc = this.svc.updateBalance(
      payload.userId,
      buyerWallet.walletAmount,
    );

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
      (shareId) => !pendingShares.includes(shareId),
    );

    const remainingInvestment = updatedShares.length * askPrice;
    await Investment.findOneAndUpdate(
      { userId: sellerUserId, companyId },
      { myShares: updatedShares, totalInvestment: remainingInvestment },
    );

    const remainingShares = pendingShares.filter(
      (shareId) => !updatedShares.includes(shareId),
    );

    await SellOrders.findOneAndUpdate(
      { userId: sellerUserId, companyId },
      {
        pendingShares: remainingShares,
        soldShares: pendingShares.slice(0, numberOfSharesToBuy),
      },
    );
  }
}
