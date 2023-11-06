import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../user-management/src/users/entity/users.entity';
import { Share } from '../../shares-management/entity/shares.entity'

@Schema({ timestamps: true })
export class SellOrders extends Document {
  @Prop({ type: Types.ObjectId, ref:() => User })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref:() => Share })
  company: Types.ObjectId

  @Prop({
    type: [{ shareId: { type: Types.ObjectId, ref: 'Share' } }],
    default: [],
  })
  pendingShares: Array<{ shareId: Types.ObjectId }>;

  @Prop({
    type: [{ shareId: { type: Types.ObjectId, ref: 'Share' } }],
    default: [],
  })
  soldShares: Array<{ shareId: Types.ObjectId }>;
}

export const SellOrdersSchema = SchemaFactory.createForClass(SellOrders);
