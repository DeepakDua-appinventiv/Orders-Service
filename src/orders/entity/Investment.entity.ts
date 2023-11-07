import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../../../user-management/src/users/entity/users.entity';
import { Share } from '../../../../shares-management/entity/shares.entity'

@Schema({ timestamps: true })
export class Investment extends Document {
  @Prop({ type: Types.ObjectId, ref:() => User })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref:() => Share })
  companyId: Types.ObjectId

  @Prop({
    type: [Types.ObjectId],
    default: [],
  })
  myShares: Types.ObjectId[];

  @Prop()
  totalInvestment: number;
}

export const InvestmentSchema = SchemaFactory.createForClass(Investment);
