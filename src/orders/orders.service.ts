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
import { Transactions } from './entity/transactions.entity';
import { Kafka, logLevel } from 'kafkajs';
import { KafkaProducerService } from 'src/kafka/producer.service';
import { KafkaConsumerService } from 'src/kafka/consumer.service';

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
    private readonly kafkaProducerService : KafkaProducerService,
    private readonly consumerService: KafkaConsumerService
  ) {}
  private svc: WalletServiceClient;

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
    userId: object,
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

    const transactionData = new this.transactionsModel({
      user: new mongoose.Types.ObjectId(payload.userId),
      shares: pendingShares.slice(0, numberOfSharesToBuy),
      orderType: OrderTypeEnum.BUY,
    });
    await transactionData.save();

    const sellTransaction = new this.transactionsModel({
      user: sellerUserId,
      shares: pendingShares.slice(0, numberOfSharesToBuy),
      orderType: OrderTypeEnum.SELL,
    });

    await sellTransaction.save();

    await this.kafkaProducerService.sendToKafka('transaction', transactionData);

    const data = await this.getDataByUserIdAndCompanyId(
      new mongoose.Types.ObjectId(payload.userId),
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
      data.myShares.push(...pendingShares.slice(0, numberOfSharesToBuy));
      data.totalInvestment += totalCost;
      await data.save();
    }

    const sellerInvestment = await this.investmentModel.findOne({
      userId: sellerUserId,
      companyId,
    });

    const sellerShares = sellerInvestment.myShares;
    const sellerSharesCount = sellerShares.length;
    const currentTotalInvestment = sellerInvestment.totalInvestment/sellerSharesCount;
    const updatedShares = sellerShares.filter(function (shareId) {
      return !pendingShares.includes(shareId);
    });

    const remainingSharesCount = updatedShares.length;
    const remainingInvestment = currentTotalInvestment * remainingSharesCount;
    
    await this.investmentModel.findOneAndUpdate(
      { userId: sellerUserId, companyId },
      { myShares: updatedShares, totalInvestment: remainingInvestment },
    );

    const sharesBought = pendingShares.slice(0, numberOfSharesToBuy);
    const newPendingShares = pendingShares.filter((shareId) => !sharesBought.includes(shareId));
    const newSoldShares = [...sellOrder.soldShares, ...sharesBought];
  
    await this.sellOrdersModel.findOneAndUpdate(
      { userId: sellerUserId, companyId },
      {
        pendingShares: newPendingShares,
        soldShares: newSoldShares,
      });    
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
