import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class SellOrders extends Document {
  @Prop({ type: Types.ObjectId })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  companyId: Types.ObjectId;

  @Prop({ type: Number }) 
  askPrice: number;

  @Prop({
    type: [Types.ObjectId],
    default: [],
  })
  pendingShares: Types.ObjectId[];

  @Prop({
    type: [Types.ObjectId],
    default: [],
  })
  soldShares: Types.ObjectId[];
}

export const SellOrdersSchema = SchemaFactory.createForClass(SellOrders);
