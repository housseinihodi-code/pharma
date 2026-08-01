import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PharmaciesModule } from './modules/pharmacies/pharmacies.module';
import { MedicationsModule } from './modules/medications/medications.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CartModule } from './modules/cart/cart.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { GeolocationModule } from './modules/geolocation/geolocation.module';
import { UploadModule } from './modules/upload/upload.module';
import { MessagesModule } from './modules/messages/messages.module';
import { ReviewsModule } from './modules/reviews/reviews.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy_db',
    ),
    AuthModule,
    UsersModule,
    PharmaciesModule,
    MedicationsModule,
    OrdersModule,
    CartModule,
    DeliveriesModule,
    PaymentsModule,
    NotificationsModule,
    AnalyticsModule,
    GeolocationModule,
    UploadModule,
    MessagesModule,
    ReviewsModule,
  ],
})
export class AppModule {}
