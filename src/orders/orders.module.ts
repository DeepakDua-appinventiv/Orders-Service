import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Investments, InvestmentSchema } from './entity/Investment.entity';
import { SellOrders, SellOrdersSchema } from './entity/sellOrders.entity';
import { USERS_PACKAGE_NAME, USERS_SERVICE_NAME } from './users.pb';
import { Transactions, TransactionsSchema } from './entity/transactions.entity';
import { KafkaModule } from 'src/kafka/kafka.module';
import { SHARES_PACKAGE_NAME, SHARES_SERVICE_NAME } from './shares.pb';
import { Agreement, AgreementSchema } from './entity/agreement.entity';


@Module({
  imports: [
    KafkaModule,
    MongooseModule.forFeature([
      { name: Agreement.name, schema: AgreementSchema },
      { name: Investments.name, schema: InvestmentSchema},
      { name: SellOrders.name, schema: SellOrdersSchema },
      { name: Transactions.name, schema: TransactionsSchema }
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
    ClientsModule.register([
      {
        name: SHARES_SERVICE_NAME,
        transport: Transport.GRPC,
        options: {
          url: '0.0.0.0:50052',
          package: SHARES_PACKAGE_NAME,
          protoPath: 'node_modules/grpc-nest-proto/proto/shares.proto',
        },
      },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService]
})
export class OrdersModule {}
