import { Controller, Inject } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ORDERS_SERVICE_NAME, SellShareRequest, SellShareResponse, BuyShareRequest, BuyShareResponse, GetShareResponse, GetShareRequest } from './orders.pb';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
    @Inject(OrdersService)
    private readonly service: OrdersService;

    @GrpcMethod(ORDERS_SERVICE_NAME, 'getShare')
    private retrieveShares(payload: GetShareRequest): Promise<GetShareResponse> {
        console.log(payload);
        return this.service.retrieveShares(payload);
    }

    // @GrpcMethod(ORDERS_SERVICE_NAME, 'buyShare')
    // private buyShare(payload: BuyShareRequest): Promise<BuyShareResponse> {
    //     return this.service.buyShare(payload);
    // }

    @GrpcMethod(ORDERS_SERVICE_NAME, 'sellShare')
    private sellShare(payload: SellShareRequest): Promise<SellShareResponse> {
        return this.service.sellShare(payload);
    }

}
