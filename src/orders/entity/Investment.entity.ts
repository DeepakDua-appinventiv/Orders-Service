import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Investments extends Document {
  @Prop({ type: Types.ObjectId })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  companyId: Types.ObjectId

  @Prop({
    type: [Types.ObjectId],
    default: [],
  })
  myShares: Types.ObjectId[];

  @Prop()
  totalInvestment: number;
}

export const InvestmentSchema = SchemaFactory.createForClass(Investments);
