import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SellOrders } from './sellOrders.entity';

@Schema({ timestamps: true })
export class Agreement extends Document {
  @Prop({ type: Types.ObjectId })
  userId: Types.ObjectId;

  @Prop({ ref:() => SellOrders })
  sellOrderId: Types.ObjectId;

  @Prop()
  signature: string;

}

export const AgreementSchema = SchemaFactory.createForClass(Agreement);