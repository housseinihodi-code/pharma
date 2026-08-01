import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CartDocument = Cart & Document;

@Schema({ _id: false })
class CartItem {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Medication' })
  medicationId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop()
  imageUrl?: string;

  @Prop({ default: false })
  requiresPrescription: boolean;
}

@Schema({ timestamps: true })
export class Cart {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', unique: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Pharmacy' })
  pharmacyId?: Types.ObjectId;

  @Prop({ type: [CartItem], default: [] })
  items: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);
CartSchema.index({ userId: 1 });
