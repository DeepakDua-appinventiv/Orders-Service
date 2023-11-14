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
  GetInvestmentRequest,
  GetInvestmentResponse,
  Investment,
  UpdateBalanceResponse,
} from './orders.pb';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Mongoose } from 'mongoose';
import { OrderTypeEnum } from './entity/transactions.entity';
import {
  GetBalanceResponse,
  USERS_SERVICE_NAME,
  UpdateBalanceRequest,
  WALLET_SERVICE_NAME,
  WalletServiceClient,
} from './users.pb';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, firstValueFrom } from 'rxjs';
import { ShareDTO } from './orders.dto';
import { ObjectId } from 'mongodb';
import { Types } from 'mongoose';
import { Transactions } from './entity/transactions.entity';
import { Kafka, logLevel } from 'kafkajs';

@Injectable()
export class OrdersService implements OnModuleInit {
  constructor(
    @InjectModel(Investments.name)
    private readonly investmentModel: Model<Investments>,
    @InjectModel(SellOrders.name)
    private readonly sellOrdersModel: Model<SellOrders>,
    @InjectModel(Transactions.name)
    private readonly transactionsModel: Model<Transactions>,
    @Inject(USERS_SERVICE_NAME)
    private readonly client: ClientGrpc,
  ) {}
  private svc: WalletServiceClient;

  // @Inject(WALLET_SERVICE_NAME)
  // private readonly client: ClientGrpc;
  public onModuleInit(): void {
    this.svc = this.client.getService<WalletServiceClient>(WALLET_SERVICE_NAME);
  }

  public async retrieveShares(
    payload: GetShareRequest,
  ): Promise<GetShareResponse> {
    try {
      const userId = new mongoose.Types.ObjectId(payload.userId);
      const companyId = new mongoose.Types.ObjectId(payload.companyId);
      console.log(companyId);
      const companyShares: any = await this.sellOrdersModel
        .find({ companyId, userId: { $ne: userId } })
        .exec();
      console.log(companyShares);

      return { status: 200, shares: companyShares, error: [] };
    } catch {
      return { status: 500, shares: [], error: ['Error retrieving shares'] };
    }
  }

  public async getInvestment(
    payload: GetInvestmentRequest,
  ): Promise<GetInvestmentResponse> {
    try {
      const userId = new mongoose.Types.ObjectId(payload.userId);

      const aggregationPipeline = [
        {
          $match: { userId: userId },
        },
        {
          $group: {
            _id: null,
            grandTotalInvestment: { $sum: '$totalInvestment' },
            investments: { $push: '$$ROOT' },
          },
        },
        {
          $project: {
            _id: 0,
            grandTotalInvestment: 1,
            investments: 1,
          },
        },
      ];
      
      const result = await this.investmentModel.aggregate(aggregationPipeline);

      if (result.length === 0 || !result[0].investments) {
        return {
          status: HttpStatus.OK,
          investments: [],
          error: ['No investments found for the user'],
        };
      }

      const grandTotalInvestment = result[0].grandTotalInvestment;
      const investments = result[0].investments.map((investment) => ({
        ...investment,
        grandTotalInvestment: grandTotalInvestment,
      }));

      return {
        status: HttpStatus.OK,
        investments: investments,
        error: null,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        investments: null,
        error: ['Error retrieving investments'],
      };
    }
  }

  public async getDataByUserIdAndCompanyId(
    userId: string,
    companyId: object,
  ): Promise<Investments | null> {
    const data = await this.investmentModel
      .findOne({ userId, companyId })
      .exec();
    return data;
  }

  public async buyShare(payload: BuyShareRequest): Promise<BuyShareResponse> {
    const { sellOrderId, numberOfSharesToBuy } = payload;
    const sellOrder = await this.sellOrdersModel.findById(sellOrderId);

    const sellerUserId = sellOrder.userId;
    const pendingShares = sellOrder.pendingShares;
    const askPrice = sellOrder.askPrice;
    const companyId = sellOrder.companyId;

    const buyerWallet: GetBalanceResponse = await firstValueFrom(
      this.svc.getBalance({ userId: payload.userId }),
    );
    const buyerAmount = buyerWallet.walletAmount;
    const totalCost = numberOfSharesToBuy * askPrice;

    if (buyerAmount < totalCost) {
      return { status: HttpStatus.BAD_REQUEST, message: 'Insufficient funds' };
    }

    const updateBuyerWallet: UpdateBalanceResponse = await firstValueFrom(
      this.svc.updateBalance({
        userId: payload.userId,
        walletAmount: buyerAmount,
      }),
    );

    const buyTransaction = new this.transactionsModel({
      user: new mongoose.Types.ObjectId(payload.userId),
      shares: pendingShares.slice(0, numberOfSharesToBuy),
      orderType: OrderTypeEnum.BUY,
    });
    await buyTransaction.save();

    const sellTransaction = new this.transactionsModel({
      user: sellerUserId,
      shares: pendingShares.slice(0, numberOfSharesToBuy),
      orderType: OrderTypeEnum.SELL,
    });

    await sellTransaction.save();

    const kafka = new Kafka({
      clientId: 'orders-microservice',
      brokers: ['localhost:9092'],
      logLevel: logLevel.INFO,
    });

    const producer = kafka.producer();

    await producer.connect();

    const transactionTopic = 'transaction';

    const transactionData = {
      userId: payload.userId,
      shares: pendingShares.slice(0, numberOfSharesToBuy),
      orderType: 'buy',
    };

    await producer.send({
      topic: transactionTopic,
      messages: [{ value: JSON.stringify(transactionData) }],
    });

    await producer.disconnect();

    const data = await this.getDataByUserIdAndCompanyId(
      payload.userId,
      companyId,
    );

    if (!data) {
      const buyerInvestment = new this.investmentModel({
        userId: new mongoose.Types.ObjectId(payload.userId),
        companyId: companyId,
        myShares: pendingShares.slice(0, numberOfSharesToBuy),
        totalInvestment: totalCost,
      });
      await buyerInvestment.save();
    } else {
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
    const updatedShares = sellerShares.filter(function (shareId) {
      return !pendingShares.includes(shareId);
    });

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
    return { status: HttpStatus.OK, message: 'Shares Bought Successfully' };
  }

  public async sellShare(
    payload: SellShareRequest,
  ): Promise<SellShareResponse> {
    const { userId, companyId, sharesToSell, askPrice } = payload;
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const companyIdObj = new mongoose.Types.ObjectId(companyId);

    const investment = await this.investmentModel.findOne({
      userId: userIdObj,
      companyId: companyIdObj,
    });

    if (!investment) {
      return { status: HttpStatus.NOT_FOUND, message: 'Investment not found' };
    }
    const myShares = investment.myShares.slice(0, sharesToSell);

    const sellOrder = new this.sellOrdersModel({
      userId: userIdObj,
      companyId: companyIdObj,
      askPrice,
      pendingShares: myShares,
      soldShares: [],
    });

    const savedSellOrder = await sellOrder.save();

    return {
      status: HttpStatus.OK,
      message: 'Shares Put to Sold Successfully',
    };
  }
}
