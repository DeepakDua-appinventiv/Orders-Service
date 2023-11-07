import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Investment, InvestmentSchema } from './entity/Investment.entity';
import { SellOrders, SellOrdersSchema } from './entity/sellOrders.entity';
import { USERS_PACKAGE_NAME, USERS_SERVICE_NAME } from './users.pb';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Investment.name, schema: InvestmentSchema},
      { name: SellOrders.name, schema: SellOrdersSchema },
    ]),
    ClientsModule.register([
      {
        name: USERS_SERVICE_NAME,
        transport: Transport.GRPC,
        options: {
          url: '0.0.0.0:50051',
          package: USERS_PACKAGE_NAME,
          protoPath: 'node_modules/grpc-nest-proto/proto/users.proto',
        },
      },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService]
})
export class OrdersModule {}