/* eslint-disable */
import { GrpcMethod, GrpcStreamMethod } from "@nestjs/microservices";
import { Observable } from "rxjs";

export const protobufPackage = "shares";

/** Get Shares of a company */
export interface Share {
  Id: string;
  userId: string;
  companyId: string;
  askPrice: number;
  pendingShares: string[];
}

/** Get Company */
export interface Company {
  Id: string;
  name: string;
  industry: string;
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

export interface GetCompanyRequest {
  name: string;
}

export interface GetCompanyResponse {
  status: number;
  companies: Company[];
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

export const SHARES_PACKAGE_NAME = "shares";

export interface SharesServiceClient {
  searchCompany(request: GetCompanyRequest): Observable<GetCompanyResponse>;

  getShare(request: GetShareRequest): Observable<GetShareResponse>;

  updateShare(request: UpdateShareRequest): Observable<UpdateShareResponse>;
}

export interface SharesServiceController {
  searchCompany(
    request: GetCompanyRequest,
  ): Promise<GetCompanyResponse> | Observable<GetCompanyResponse> | GetCompanyResponse;

  getShare(request: GetShareRequest): Promise<GetShareResponse> | Observable<GetShareResponse> | GetShareResponse;

  updateShare(
    request: UpdateShareRequest,
  ): Promise<UpdateShareResponse> | Observable<UpdateShareResponse> | UpdateShareResponse;
}

export function SharesServiceControllerMethods() {
  return function (constructor: Function) {
    const grpcMethods: string[] = ["searchCompany", "getShare", "updateShare"];
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
