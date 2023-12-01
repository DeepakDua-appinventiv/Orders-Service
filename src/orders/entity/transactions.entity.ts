import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum OrderTypeEnum {
    BUY = 'buy',
    SELL = 'sell',
}

@Schema({ timestamps: true })
export class Transactions extends Document {
  @Prop({ type: Types.ObjectId })
  user: Types.ObjectId;

  @Prop({
    type: [Types.ObjectId],
    default: [],
})
  shares: Types.ObjectId[];

  @Prop({ type: String, enum: Object.values(OrderTypeEnum) })
  orderType: OrderTypeEnum;

  @Prop({ type: Number }) 
  quantity: number;

  @Prop({ type: Number }) 
  transactionAmount: number;
}


export const TransactionsSchema = SchemaFactory.createForClass(Transactions);