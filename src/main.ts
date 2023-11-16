import { INestMicroservice, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';
import { protobufPackage } from './orders/orders.pb';
import { KafkaConsumerService } from './kafka/consumer.service';

async function bootstrap() {
  const app: INestMicroservice = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.GRPC,
    options: {
      url: '0.0.0.0:50053',
      package: protobufPackage,
      protoPath: join('node_modules/grpc-nest-proto/proto/orders.proto'),
    }
  });
  const kafkaConsumerService = app.get(KafkaConsumerService);
  await kafkaConsumerService.startConsumer()
  await app.listen();
}
bootstrap();
