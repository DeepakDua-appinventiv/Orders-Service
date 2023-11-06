import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../user-management/src/users/entity/users.entity';
import { Share } from '../../shares-management/entity/shares.entity'

@Schema({ timestamps: true })
export class Investment extends Document {
  @Prop({ type: Types.ObjectId, ref:() => User })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref:() => Share })
  company: Types.ObjectId

  @Prop({
    type: [{
        shareId: { type: Types.ObjectId, ref: 'Share' },
  }],
    default: [],
  })
  myShares: Array<{
    shareId: Types.ObjectId;
  }>;

  @Prop()
  totalInvestment: number;
}

export const InvestmentSchema = SchemaFactory.createForClass(Investment);
