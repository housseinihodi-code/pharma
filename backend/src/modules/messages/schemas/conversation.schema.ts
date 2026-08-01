import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  clientId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Pharmacy' })
  pharmacyId: Types.ObjectId;

  @Prop({ default: '' })
  lastMessage: string;

  @Prop({ default: Date.now })
  lastMessageAt: Date;

  @Prop({ default: 0 })
  clientUnread: number;

  @Prop({ default: 0 })
  pharmacyUnread: number;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ clientId: 1, pharmacyId: 1 }, { unique: true });
ConversationSchema.index({ clientId: 1, lastMessageAt: -1 });
ConversationSchema.index({ pharmacyId: 1, lastMessageAt: -1 });
