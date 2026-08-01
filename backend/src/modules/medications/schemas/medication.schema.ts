import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MedicationDocument = Medication & Document;

@Schema({ timestamps: true })
export class Medication {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  genericName?: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0, default: 0 })
  stock: number;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Pharmacy' })
  pharmacyId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['antibiotiques', 'analgésiques', 'vitamines', 'cardiovasculaire', 'diabète', 'respiratoire', 'dermatologie', 'gastroentérologie', 'neurologie', 'autre'],
    default: 'autre',
  })
  category: string;

  @Prop({ default: false })
  requiresPrescription: boolean;

  @Prop({ default: false })
  isHospitalOnly: boolean;

  @Prop({
    type: String,
    enum: ['diabete', 'vih', 'tuberculose', 'hypertension', 'cancer', 'epilepsie', 'drepanocytose', 'insuffisance_renale', 'hepatite', 'autre_chronique'],
  })
  chronicDiseaseCategory?: string;

  @Prop()
  manufacturer?: string;

  @Prop()
  dosageForm?: string;

  @Prop()
  strength?: string;

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop()
  imageUrl?: string;

  @Prop()
  expiryDate?: Date;

  @Prop({ default: 0 })
  minStock: number;
}

export const MedicationSchema = SchemaFactory.createForClass(Medication);
MedicationSchema.index({ name: 'text', genericName: 'text', description: 'text' });
MedicationSchema.index({ pharmacyId: 1 });
MedicationSchema.index({ category: 1 });
