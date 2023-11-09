import { IsString, IsNumber, IsArray } from 'class-validator';
import { GetShareRequest, GetShareResponse, Share } from "./orders.pb";

export class ShareDTO implements GetShareResponse{
  status: number;
  shares: Share[];
  error: string[];
  @IsString()
  _id: string;

  @IsString()
  userId: string;

  @IsString()
  companyId: string;

  @IsNumber()
  askPrice: number;

  @IsArray()
  pendingShares: string[];
}
