import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { CampayService } from './campay.service';
import { Order, OrderSchema } from '../orders/schemas/order.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, CampayService],
  exports: [PaymentsService, CampayService],
})
export class PaymentsModule {}
