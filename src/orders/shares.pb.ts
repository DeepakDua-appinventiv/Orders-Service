/* eslint-disable */
import { GrpcMethod, GrpcStreamMethod } from "@nestjs/microservices";
import { Observable } from "rxjs";

export const protobufPackage = "shares";

/** Get Share */
export interface Share {
  id: string;
  name: string;
  exchange: string;
  currentPrice: number;
  quantity: number;
}

export interface GetShareRequest {
  userId: string;
  name: string;
}

export interface GetShareResponse {
  status: number;
  shares: Share | undefined;
  error: string[];
}

export const SHARES_PACKAGE_NAME = "shares";

export interface SharesServiceClient {
  getShare(request: GetShareRequest): Observable<GetShareResponse>;
}

export interface SharesServiceController {
  getShare(request: GetShareRequest): Promise<GetShareResponse> | Observable<GetShareResponse> | GetShareResponse;
}

export function SharesServiceControllerMethods() {
  return function (constructor: Function) {
    const grpcMethods: string[] = ["getShare"];
    for (const method of grpcMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcMethod("SharesService", method)(constructor.prototype[method], method, descriptor);
    }
    const grpcStreamMethods: string[] = [];
    for (const method of grpcStreamMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcStreamMethod("SharesService", method)(constructor.prototype[method], method, descriptor);
    }
  };
}

export const SHARES_SERVICE_NAME = "SharesService";
