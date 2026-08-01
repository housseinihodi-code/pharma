import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ _id: false })
class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Medication' })
  medicationId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop()
  imageUrl?: string;
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Pharmacy' })
  pharmacyId: Types.ObjectId;

  @Prop({ required: true, type: [OrderItem] })
  items: OrderItem[];

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({
    type: String,
    enum: [
      'pending_prescription', 'pending', 'confirmed', 'preparing',
      'ready', 'in_delivery', 'delivered', 'cancelled', 'prescription_rejected',
    ],
    default: 'pending',
  })
  status: string;

  @Prop({
    type: String,
    enum: ['not_required', 'pending_review', 'approved', 'rejected'],
    default: 'not_required',
  })
  prescriptionStatus: string;

  @Prop()
  prescriptionRejectionReason?: string;

  @Prop({ type: String, enum: ['delivery', 'pickup'], default: 'delivery' })
  deliveryType: string;

  @Prop()
  deliveryAddress?: string;

  @Prop(raw({
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number] },
  }))
  deliveryLocation?: { type: string; coordinates: [number, number] };

  @Prop()
  prescriptionUrl?: string;

  @Prop()
  notes?: string;

  @Prop({ type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' })
  paymentStatus: string;

  @Prop({ type: String, enum: ['mobile_money', 'orange_money', 'card', 'cash'], default: 'cash' })
  paymentMethod: string;

  @Prop()
  paymentReference?: string;

  @Prop({ default: 0 })
  deliveryFee: number;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ userId: 1 });
OrderSchema.index({ pharmacyId: 1 });
OrderSchema.index({ status: 1 });
