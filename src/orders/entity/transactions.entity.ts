import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

enum OrderTypeEnum {
    BUY = 'buy',
    SELL = 'sell',
}

@Schema({ timestamps: true })
export class Transactions extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({
    type: [{
        shareId: { type: Types.ObjectId, ref: 'Share' },
    }],
    default: [],
})
  shares: Array<{ shareId }>[];

  @Prop({ type: String, enum: Object.values(OrderTypeEnum) })
  orderType: OrderTypeEnum;
}


export const TransactionsSchema = SchemaFactory.createForClass(Transactions);