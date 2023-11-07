import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../../../user-management/src/users/entity/users.entity';
import { Share } from '../../../../shares-management/entity/shares.entity'

@Schema({ timestamps: true })
export class SellOrders extends Document {
  @Prop({ type: Types.ObjectId, ref:() => User })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref:() => Share })
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
