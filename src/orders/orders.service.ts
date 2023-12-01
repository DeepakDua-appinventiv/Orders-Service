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
  ShareUpdate,
  SubmitAgreementRequest,
  SubmitAgreementResponse,
  CheckAgreementStatusRequest,
  CheckAgreementStatusResponse,
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
import { ClientGrpc, Payload } from '@nestjs/microservices';
import { Observable, firstValueFrom } from 'rxjs';
import { Transactions } from './entity/transactions.entity';
import { Kafka, logLevel } from 'kafkajs';
import { KafkaProducerService } from 'src/kafka/producer.service';
import { KafkaConsumerService } from 'src/kafka/consumer.service';
import { SHARES_SERVICE_NAME, SharesServiceClient } from './shares.pb';
import { Types } from 'mongoose';
import { RESPONSE_MESSAGES } from 'src/common/orders.constants';
import { Agreement } from './entity/agreement.entity';
import puppeteer from 'puppeteer';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import config from 'src/common/config.common';

@Injectable()
export class OrdersService implements OnModuleInit {
  constructor(
    @InjectModel(Investments.name)
    private readonly investmentModel: Model<Investments>,
    @InjectModel(SellOrders.name)
    private readonly sellOrdersModel: Model<SellOrders>,
    @InjectModel(Transactions.name)
    private readonly transactionsModel: Model<Transactions>,
    @InjectModel(Agreement.name)
    private readonly agreementModel: Model<Agreement>,
    @Inject(USERS_SERVICE_NAME)
    private readonly client: ClientGrpc,
    @Inject(SHARES_SERVICE_NAME)
    private readonly sharesClient: ClientGrpc,
    
    private readonly kafkaProducerService : KafkaProducerService,
    private readonly consumerService: KafkaConsumerService
  ) {}
  private svc: WalletServiceClient;
  private sharesSvc: SharesServiceClient;

  public onModuleInit(): void {
    this.svc = this.client.getService<WalletServiceClient>(WALLET_SERVICE_NAME);
    this.sharesSvc = this.sharesClient.getService<SharesServiceClient>(SHARES_SERVICE_NAME);
  }

  public async retrieveShares(
    payload: GetShareRequest,
  ): Promise<GetShareResponse> {
    try {
      const userId = new mongoose.Types.ObjectId(payload.userId);
      const companyId = new mongoose.Types.ObjectId(payload.companyId);
      console.log(companyId);
      const companyShares: any = await this.sellOrdersModel.aggregate([
        {
          $match: {
            companyId,
            userId: { $ne: userId }
          }
        },
        {
          $project: {
            companyId: 1,
            askPrice: 1,
            pendingShares: 1,
            _id: 0 
          }
        }
      ]).exec();
      console.log(companyShares);

      return { status: 200, shares: companyShares, error: [] };
    } catch {
      return { status: 500, shares: [], error: [RESPONSE_MESSAGES.SHARES_ERROR] };
    }
  }

  public async checkAgreementStatus(payload: CheckAgreementStatusRequest): Promise<CheckAgreementStatusResponse> {  
    try {
      const { userId, sellOrderId } = payload;
      const uid = new mongoose.Types.ObjectId(userId);
      const sid = new mongoose.Types.ObjectId(sellOrderId);
      
      const existingAgreement = await this.agreementModel
      .findOne({ userId: uid, sellOrderId: sid })
      .populate('sellOrderId'); 

      if (existingAgreement) {
        return {status: true};
      } else {
        return {status: false};
      }
    } catch (error) {
      console.error('Error checking agreement status:', error);
      return {status: false};
    }
  }

  public async submitAgreement(payload: SubmitAgreementRequest): Promise<SubmitAgreementResponse> {
    try{
    const { userId, sellOrderId, signature  } = payload;

    const uid = new mongoose.Types.ObjectId(userId);
    const sid = new mongoose.Types.ObjectId(sellOrderId);

    const agreementData = new this.agreementModel({
      userId: uid,
      sellOrderId: sid,
      signature: signature
    });

    const savedAgreement = await agreementData.save();  
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const filePath = path.join(__dirname, 'utils', 'templates', 'agreementForm.html');
    await page.goto(`file://${filePath}`); 
 
    await page.type('#userId', userId);
    await page.type('#sellOrderId', sellOrderId);
    await page.type('#buyerSignature', signature);

    const pdfBuffer = await page.pdf({ format: 'A4' });

    const transporter = nodemailer.createTransport({
      service: 'gmail', 
      auth: {
        user: config.EMAIL,
        pass: config.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: config.EMAIL,
      to: 'deepak.dua@appinventiv.com',
      subject: 'Agreement Submission',
      text: 'Please find the attached agreement PDF.',
      attachments: [{ filename: 'agreement.pdf', content: pdfBuffer }],
    }

    const emailResponse = await transporter.sendMail(mailOptions);

    await browser.close();
    return { status: 200, message: RESPONSE_MESSAGES.AGREEMENT_SUCCESS };
  }catch (error) {
    return { status: 500, message: RESPONSE_MESSAGES.AGREEMENT_ERROR };
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
          grandTotalInvestment: 0,
          investments: [],
          error: [RESPONSE_MESSAGES.INVESTMENT_NOT_FOUND],
        };
      }

      const grandTotalInvestment = result[0].grandTotalInvestment;
      const investments = result[0].investments.map((investment) => ({
        ...investment,
        grandTotalInvestment: grandTotalInvestment,
      }));

      return {
        status: HttpStatus.OK,
        grandTotalInvestment: grandTotalInvestment,
        investments: investments,
        error: null,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        grandTotalInvestment: null,
        investments: null,
        error: [RESPONSE_MESSAGES.INVESTMENTS_ERROR],
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

  private async updateBuyerInvestment(userId: string, sellOrder: any, numberOfSharesToBuy: number, totalCost: number): Promise<void> {
    const data = await this.getDataByUserIdAndCompanyId(new mongoose.Types.ObjectId(userId), sellOrder.companyId);
    if (!data) {
      const buyerInvestment = new this.investmentModel({
        userId: new mongoose.Types.ObjectId(userId),
        companyId: sellOrder.companyId,
        myShares: sellOrder.pendingShares.slice(0, numberOfSharesToBuy),
        totalInvestment: totalCost,
      });

      await buyerInvestment.save();

    } else {
      data.myShares.push(...sellOrder.pendingShares.slice(0, numberOfSharesToBuy));
      data.totalInvestment += totalCost;
      await data.save();
    }
  }

  private async updateSellerInvestment(sellOrder: any, numberOfSharesToBuy: number): Promise<void> {
    const { userId: sellerUserId, companyId } = sellOrder;

    const sellerInvestment = await this.investmentModel.findOne({
      userId: sellerUserId,
      companyId,
    });

    if(sellerInvestment) {
      const sellerShares = sellerInvestment.myShares;
      const sellerSharesCount = sellerShares.length;
      const currentTotalInvestment = sellerInvestment.totalInvestment/sellerSharesCount;

      function removeItems(arr:any, n:any) {
        arr.splice(0, n);
        return arr;
      };
  
      const updatedShares = removeItems(sellerShares,numberOfSharesToBuy);
      const remainingSharesCount = updatedShares.length;
      const remainingInvestment = currentTotalInvestment * remainingSharesCount;
      
      await this.investmentModel.findOneAndUpdate(
        { userId: sellerUserId, companyId },
        { myShares: updatedShares, totalInvestment: remainingInvestment },
      );
    }
  }

  private async updateSellOrder(sellOrder: any, numberOfSharesToBuy: number){
    const { userId: sellerUserId, companyId, pendingShares, soldShares } = sellOrder;
    const shareBought = pendingShares.slice(0, numberOfSharesToBuy);
    const newPendingShares = pendingShares.filter((shareId) => !shareBought.includes(shareId));
    const newSoldShares = [...sellOrder.soldShares, ...shareBought];
  
    await this.sellOrdersModel.findOneAndUpdate(
      { userId: sellerUserId, companyId },
      {
        pendingShares: newPendingShares,
        soldShares: newSoldShares,
      });
  }

  private async updateSharesAndTransactions(userId: string, sellOrder: any, numberOfSharesToBuy: number, totalCost: number){
    const { pendingShares } = sellOrder;
    const shareBought = pendingShares.slice(0, numberOfSharesToBuy);
    const sharesBought = pendingShares.slice(0, numberOfSharesToBuy).map(id => ({
      shareId: id.toHexString(),
    }));

    await firstValueFrom(this.sharesSvc.updateShare({
      userId: userId,
      sharesBought: sharesBought,
      askPrice: sellOrder.askPrice
    })
  )
    const transactionData = new this.transactionsModel({
    user: new mongoose.Types.ObjectId(userId),
    shares: pendingShares.slice(0, numberOfSharesToBuy),
    orderType: OrderTypeEnum.BUY,
    quantity: shareBought.length,
    transactionAmount: totalCost
  });
  
    await transactionData.save();

    const sellTransaction = new this.transactionsModel({
    user: sellOrder.sellerUserId,
    shares: pendingShares.slice(0, numberOfSharesToBuy),
    orderType: OrderTypeEnum.SELL,
    quantity: shareBought.length,
    transactionAmount: totalCost
  });

    await sellTransaction.save();

    return transactionData;
}

  public async buyShare(payload: BuyShareRequest): Promise<BuyShareResponse> {
    const { userId, sellOrderId, numberOfSharesToBuy } = payload;
    const hasAgreement = await this.checkAgreementStatus(payload);

    if(!hasAgreement.status) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: RESPONSE_MESSAGES.AGREEMENT_REQUIRED,
      }
    }else{
      const sellOrder = await this.sellOrdersModel.findById(sellOrderId);

      const sellerUserId = sellOrder.userId;
      const pendingShares = sellOrder.pendingShares;
      const askPrice = sellOrder.askPrice;
      const companyId = sellOrder.companyId;
  
      if (numberOfSharesToBuy > pendingShares.length) {
        return { status: HttpStatus.BAD_REQUEST, message: RESPONSE_MESSAGES.INSUFFICIENT_SHARES };
    }
  
      const buyerWallet: GetBalanceResponse = await firstValueFrom(
        this.svc.getBalance({ userId: payload.userId }),
      );
      const buyerAmount = buyerWallet.walletAmount;
      const totalCost = numberOfSharesToBuy * askPrice;
  
      if (buyerAmount < totalCost) {
        return { status: HttpStatus.BAD_REQUEST, message: RESPONSE_MESSAGES.INSUFFICIENT_FUNDS };
      }
  
      const updateBuyerWallet: UpdateBalanceResponse = await firstValueFrom(
        this.svc.updateBalance({
          userId: payload.userId,
          walletAmount: -totalCost,
        }),
      );
  
      await this.updateBuyerInvestment(payload.userId, sellOrder, numberOfSharesToBuy, totalCost);
      await this.updateSellerInvestment(sellOrder, numberOfSharesToBuy);
  
      const updatedSellOrder = await this.updateSellOrder(sellOrder, numberOfSharesToBuy);
  
      const transactionData = await this.updateSharesAndTransactions(payload.userId, sellOrder, numberOfSharesToBuy,totalCost);
  
      await this.kafkaProducerService.sendToKafka('transaction', transactionData);
  
      return { status: HttpStatus.OK, message: RESPONSE_MESSAGES.SHARES_BOUGHT_SUCCESS };
    }
  }

  public async sellShare(
    payload: SellShareRequest,
  ): Promise<SellShareResponse> {
    try{
    const { userId, companyId, sharesToSell, askPrice } = payload;
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const companyIdObj = new mongoose.Types.ObjectId(companyId);

    const investment = await this.investmentModel.findOne({
      userId: userIdObj,
      companyId: companyIdObj,
    });

    if (!investment) {
      return { status: HttpStatus.NOT_FOUND, message: RESPONSE_MESSAGES.INVESTMENT_NOT_FOUND };
    }

    const totalSharesOwned = investment.myShares.length;
    const soldSharesCount = await this.sellOrdersModel.aggregate([
      {
        $match: {
          userId: userIdObj,
          companyId: companyIdObj,
        },
      },
      {
        $project: {
          _id: 0,
          soldSharesCount: {$size: '$pendingShares'},
        },
      },
      {
        $group: {
          _id: null,
          totalSoldShares: { $sum: '$soldSharesCount' },
        },
      },
    ]);

    const soldShares = soldSharesCount.length > 0 ? soldSharesCount[0].totalSoldShares : 0;

    const remainingShares = totalSharesOwned - soldShares;

    if (sharesToSell > remainingShares) {
      return { status: HttpStatus.BAD_REQUEST, message: RESPONSE_MESSAGES.TOO_MANY_SHARES_TO_SELL };
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
      message: RESPONSE_MESSAGES.SHARES_SOLD_SUCCESS,
    };
  }catch (error){
    console.error('Error selling shares:', error);
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Error selling shares' };
  }
  }
}