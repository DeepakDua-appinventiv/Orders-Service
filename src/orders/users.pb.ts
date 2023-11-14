/* eslint-disable */
import { GrpcMethod, GrpcStreamMethod } from "@nestjs/microservices";
import { Observable } from "rxjs";

export const protobufPackage = "users";

/** SignUp */
export interface SignUpRequest {
  name: string;
  email: string;
  password: string;
  dateOfBirth: string;
  phoneNumber: string;
}

export interface SignUpResponse {
  status: number;
  error: string[];
}

/** Login */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: number;
  error: string[];
  token: string;
}

export interface ValidateRequest {
  token: string;
}

export interface ValidateResponse {
  status: number;
  error: string[];
  userId: string;
}

/** Logout */
export interface LogoutRequest {
  token: string;
}

export interface LogoutResponse {
  status: number;
  error: string[];
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

export const USERS_PACKAGE_NAME = "users";

export interface UsersServiceClient {
  signUp(request: SignUpRequest): Observable<SignUpResponse>;

  login(request: LoginRequest): Observable<LoginResponse>;

  validate(request: ValidateRequest): Observable<ValidateResponse>;

  logout(request: LogoutRequest): Observable<LogoutResponse>;
}

export interface UsersServiceController {
  signUp(request: SignUpRequest): Promise<SignUpResponse> | Observable<SignUpResponse> | SignUpResponse;

  login(request: LoginRequest): Promise<LoginResponse> | Observable<LoginResponse> | LoginResponse;

  validate(request: ValidateRequest): Promise<ValidateResponse> | Observable<ValidateResponse> | ValidateResponse;

  logout(request: LogoutRequest): Promise<LogoutResponse> | Observable<LogoutResponse> | LogoutResponse;
}

export function UsersServiceControllerMethods() {
  return function (constructor: Function) {
    const grpcMethods: string[] = ["signUp", "login", "validate", "logout"];
    for (const method of grpcMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcMethod("UsersService", method)(constructor.prototype[method], method, descriptor);
    }
    const grpcStreamMethods: string[] = [];
    for (const method of grpcStreamMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcStreamMethod("UsersService", method)(constructor.prototype[method], method, descriptor);
    }
  };
}

export const USERS_SERVICE_NAME = "UsersService";

export interface WalletServiceClient {
  getBalance(request: GetBalanceRequest): Observable<GetBalanceResponse>;

  updateBalance(request: UpdateBalanceRequest): Observable<UpdateBalanceResponse>;
}

export interface WalletServiceController {
  getBalance(
    request: GetBalanceRequest,
  ): Promise<GetBalanceResponse> | Observable<GetBalanceResponse> | GetBalanceResponse;

  updateBalance(
    request: UpdateBalanceRequest,
  ): Promise<UpdateBalanceResponse> | Observable<UpdateBalanceResponse> | UpdateBalanceResponse;
}

export function WalletServiceControllerMethods() {
  return function (constructor: Function) {
    const grpcMethods: string[] = ["getBalance", "updateBalance"];
    for (const method of grpcMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcMethod("WalletService", method)(constructor.prototype[method], method, descriptor);
    }
    const grpcStreamMethods: string[] = [];
    for (const method of grpcStreamMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcStreamMethod("WalletService", method)(constructor.prototype[method], method, descriptor);
    }
  };
}

export const WALLET_SERVICE_NAME = "WalletService";
