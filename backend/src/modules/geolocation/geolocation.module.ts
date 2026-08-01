import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GeolocationService } from './geolocation.service';
import { GeolocationController } from './geolocation.controller';
import { Pharmacy, PharmacySchema } from '../pharmacies/schemas/pharmacy.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Pharmacy.name, schema: PharmacySchema }])],
  controllers: [GeolocationController],
  providers: [GeolocationService],
  exports: [GeolocationService],
})
export class GeolocationModule {}
