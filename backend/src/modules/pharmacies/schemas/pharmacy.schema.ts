import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PharmacyDocument = Pharmacy & Document;

@Schema({ timestamps: true })
export class Pharmacy {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  phone: string;

  @Prop()
  email?: string;

  @Prop(raw({
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number] },
  }))
  location: { type: string; coordinates: [number, number] };

  @Prop({ default: true })
  isOpen: boolean;

  @Prop({
    type: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String },
    },
  })
  openingHours?: {
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
    sunday?: { open: string; close: string };
  };

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  licenseNumber?: string;

  @Prop()
  description?: string;

  @Prop()
  imageUrl?: string;

  @Prop({ default: 0, min: 0, max: 5 })
  rating: number;

  @Prop({ default: 0 })
  reviewCount: number;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  ownerId?: Types.ObjectId;

  @Prop({ default: true })
  hasDelivery: boolean;

  @Prop({ default: 0 })
  deliveryRadius: number;

  @Prop({ default: 0 })
  deliveryFee: number;

  @Prop({ default: false })
  isHospitalPharmacy: boolean;

  @Prop()
  hospitalName?: string;

  @Prop({ type: [String], default: [] })
  chronicSpecialties: string[];

  @Prop({ default: false })
  isOnDuty: boolean;

  @Prop()
  dutyStart?: Date;

  @Prop()
  dutyEnd?: Date;

  @Prop({ default: false })
  is24_7: boolean;

  @Prop({ default: false })
  openAllDays: boolean;
}

export const PharmacySchema = SchemaFactory.createForClass(Pharmacy);
PharmacySchema.index({ location: '2dsphere' }, { sparse: true });
PharmacySchema.index({ name: 'text', address: 'text' });
