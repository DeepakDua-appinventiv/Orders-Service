/* eslint-disable */
import { GrpcMethod, GrpcStreamMethod } from "@nestjs/microservices";
import { Observable } from "rxjs";

export const protobufPackage = "orders";

export interface SellShare {
  shareId: string;
  qty: number;
  askPrice: number;
}

export interface BuyShare {
  shareId: string;
  qty: number;
}

/** SellShare */
export interface SellShareRequest {
  userId: string;
  share: SellShare | undefined;
}

export interface SellShareResponse {
  status: string;
  message: string;
}

/** BuyShare */
export interface BuyShareRequest {
  userId: string;
  share: BuyShare | undefined;
}

export interface BuyShareResponse {
  status: string;
  message: string;
}

export const ORDERS_PACKAGE_NAME = "orders";

export interface OrdersServiceClient {
  sellShare(request: SellShareRequest): Observable<SellShareResponse>;

  buyShare(request: BuyShareRequest): Observable<BuyShareResponse>;
}

export interface OrdersServiceController {
  sellShare(request: SellShareRequest): Promise<SellShareResponse> | Observable<SellShareResponse> | SellShareResponse;

  buyShare(request: BuyShareRequest): Promise<BuyShareResponse> | Observable<BuyShareResponse> | BuyShareResponse;
}

export function OrdersServiceControllerMethods() {
  return function (constructor: Function) {
    const grpcMethods: string[] = ["sellShare", "buyShare"];
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
