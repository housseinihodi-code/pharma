import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MedicationsService } from './medications.service';
import { MedicationsController } from './medications.controller';
import { MedicationIdentifyService } from './medication-identify.service';
import { MedicationIdentifyController } from './medication-identify.controller';
import { PrescriptionAnalyzeService } from './prescription-analyze.service';
import { PrescriptionAnalyzeController } from './prescription-analyze.controller';
import { Medication, MedicationSchema } from './schemas/medication.schema';
import { PharmaciesModule } from '../pharmacies/pharmacies.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Medication.name, schema: MedicationSchema }]),
    PharmaciesModule,
  ],
  controllers: [MedicationsController, MedicationIdentifyController, PrescriptionAnalyzeController],
  providers: [MedicationsService, MedicationIdentifyService, PrescriptionAnalyzeService],
  exports: [MedicationsService],
})
export class MedicationsModule {}
