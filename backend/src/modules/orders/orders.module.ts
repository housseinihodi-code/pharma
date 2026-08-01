import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import { Pharmacy, PharmacySchema } from '../pharmacies/schemas/pharmacy.schema';
import { MedicationsModule } from '../medications/medications.module';
import { CartModule } from '../cart/cart.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InvoiceModule } from '../invoices/invoice.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Pharmacy.name, schema: PharmacySchema },
    ]),
    MedicationsModule,
    CartModule,
    NotificationsModule,
    InvoiceModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
