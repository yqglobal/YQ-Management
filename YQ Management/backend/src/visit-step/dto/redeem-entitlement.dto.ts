import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RedeemEntitlementDto {
  @IsInt() @Min(1)
  quantity: number;

  @IsOptional() @IsString()
  notes?: string;
}
