import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ type: String, enum: ['client', 'pharmacist', 'driver', 'admin'], default: 'client' })
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  address?: string;

  @Prop(raw({
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number] },
  }))
  location?: { type: string; coordinates: [number, number] };

  @Prop()
  profilePicture?: string;

  @Prop()
  refreshToken?: string;

  @Prop({ type: Types.ObjectId, ref: 'Pharmacy', default: null })
  pharmacyId?: Types.ObjectId;

  // Validation admin pour les pharmaciens inscrits publiquement
  @Prop({ default: true })
  isApproved: boolean;

  @Prop()
  rejectionReason?: string;

  // Profil médical (clients)
  @Prop()
  bloodType?: string;

  @Prop({ type: [String], default: [] })
  allergies: string[];

  @Prop({ type: [String], default: [] })
  chronicConditions: string[];

  @Prop()
  doctorName?: string;

  @Prop()
  doctorPhone?: string;

  @Prop()
  emergencyContact?: string;

  @Prop()
  emergencyPhone?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ location: '2dsphere' }, { sparse: true });
UserSchema.index({ pharmacyId: 1 });
UserSchema.index({ role: 1, isApproved: 1 });
