/* eslint-disable */
import { GrpcMethod, GrpcStreamMethod } from "@nestjs/microservices";
import { Observable } from "rxjs";

export const protobufPackage = "orders";

/** Get Shares of a company */
export interface Share {
  Id: string;
  userId: string;
  companyId: string;
  askPrice: number;
  pendingShares: string[];
}

export interface Investment {
  userId: string;
  companyId: string;
  myShares: string[];
  totalInvestment: number;
}

export interface GetShareRequest {
  userId: string;
  companyId: string;
}

export interface GetShareResponse {
  status: number;
  shares: Share[];
  error: string[];
}

export interface GetInvestmentRequest {
  userId: string;
}

export interface GetInvestmentResponse {
  status: number;
  grandTotalInvestment: number;
  investments: Investment[];
  error: string[];
}

/** SellShare */
export interface SellShareRequest {
  userId: string;
  companyId: string;
  sharesToSell: number;
  askPrice: number;
}

export interface SellShareResponse {
  status: number;
  message: string;
}

/** BuyShare */
export interface BuyShareRequest {
  userId: string;
  sellOrderId: string;
  numberOfSharesToBuy: number;
}

export interface BuyShareResponse {
  status: number;
  message: string;
}

/** GetBalance */
export interface GetBalanceRequest {
  userId: string;
}

export interface GetBalanceResponse {
  status: number;
  error: string[];
  walletAmount: number;
}

/** UpdateBalance */
export interface UpdateBalanceRequest {
  userId: string;
  walletAmount: number;
}

export interface UpdateBalanceResponse {
  status: number;
  error: string[];
}

export interface ShareUpdate {
  shareId: string;
}

export interface UpdateShareRequest {
  userId: string;
  sharesBought: ShareUpdate[];
  askPrice: number;
}

export interface UpdateShareResponse {
  status: number;
  message: string;
}

export const ORDERS_PACKAGE_NAME = "orders";

export interface OrdersServiceClient {
  getShare(request: GetShareRequest): Observable<GetShareResponse>;

  sellShare(request: SellShareRequest): Observable<SellShareResponse>;

  getMyInvestment(request: GetInvestmentRequest): Observable<GetInvestmentResponse>;

  buyShare(request: BuyShareRequest): Observable<BuyShareResponse>;

  getBalance(request: GetBalanceRequest): Observable<GetBalanceResponse>;

  updateBalance(request: UpdateBalanceRequest): Observable<UpdateBalanceResponse>;

  updateShare(request: UpdateShareRequest): Observable<UpdateShareResponse>;
}

export interface OrdersServiceController {
  getShare(request: GetShareRequest): Promise<GetShareResponse> | Observable<GetShareResponse> | GetShareResponse;

  sellShare(request: SellShareRequest): Promise<SellShareResponse> | Observable<SellShareResponse> | SellShareResponse;

  getMyInvestment(
    request: GetInvestmentRequest,
  ): Promise<GetInvestmentResponse> | Observable<GetInvestmentResponse> | GetInvestmentResponse;

  buyShare(request: BuyShareRequest): Promise<BuyShareResponse> | Observable<BuyShareResponse> | BuyShareResponse;

  getBalance(
    request: GetBalanceRequest,
  ): Promise<GetBalanceResponse> | Observable<GetBalanceResponse> | GetBalanceResponse;

  updateBalance(
    request: UpdateBalanceRequest,
  ): Promise<UpdateBalanceResponse> | Observable<UpdateBalanceResponse> | UpdateBalanceResponse;

  updateShare(
    request: UpdateShareRequest,
  ): Promise<UpdateShareResponse> | Observable<UpdateShareResponse> | UpdateShareResponse;
}

export function OrdersServiceControllerMethods() {
  return function (constructor: Function) {
    const grpcMethods: string[] = [
      "getShare",
      "sellShare",
      "getMyInvestment",
      "buyShare",
      "getBalance",
      "updateBalance",
      "updateShare",
    ];
    for (const method of grpcMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcMethod("OrdersService", method)(constructor.prototype[method], method, descriptor);
    }
    const grpcStreamMethods: string[] = [];
    for (const method of grpcStreamMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcStreamMethod("OrdersService", method)(constructor.prototype[method], method, descriptor);
    }
  };
}

export const ORDERS_SERVICE_NAME = "OrdersService";
