import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DeliveryDocument = Delivery & Document;

@Schema({ timestamps: true })
export class Delivery {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Order', unique: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  driverId?: Types.ObjectId;

  @Prop({
    type: {
      address: String,
      coordinates: [Number],
    },
  })
  pickupLocation: {
    address: string;
    coordinates: [number, number];
  };

  @Prop({
    type: {
      address: String,
      coordinates: [Number],
    },
  })
  deliveryLocation: {
    address: string;
    coordinates: [number, number];
  };

  @Prop({
    type: String,
    enum: ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed'],
    default: 'pending',
  })
  status: string;

  @Prop({
    type: {
      coordinates: [Number],
      updatedAt: Date,
    },
  })
  currentLocation?: {
    coordinates: [number, number];
    updatedAt: Date;
  };

  @Prop()
  estimatedDeliveryTime?: Date;

  @Prop()
  actualDeliveryTime?: Date;

  @Prop()
  notes?: string;

  @Prop({ default: 0 })
  fee: number;

  @Prop({
    type: [{
      _id: false,
      senderId: { type: String },
      senderName: { type: String },
      senderRole: { type: String },
      content: { type: String },
      createdAt: { type: Date, default: Date.now },
    }],
    default: [],
  })
  messages: Array<{
    senderId: string;
    senderName: string;
    senderRole: string;
    content: string;
    createdAt: Date;
  }>;
}

export const DeliverySchema = SchemaFactory.createForClass(Delivery);
DeliverySchema.index({ orderId: 1 });
DeliverySchema.index({ driverId: 1 });
DeliverySchema.index({ status: 1 });
