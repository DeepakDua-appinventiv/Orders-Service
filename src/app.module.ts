import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersModule } from './orders/orders.module';
import { InvestmentSchema, Investments } from './orders/entity/Investment.entity';
import { KafkaModule } from './kafka/kafka.module';

@Module({
  imports: [
    MongooseModule.forRoot("mongodb://localhost:27017/ordersDB"),
    OrdersModule,
],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
