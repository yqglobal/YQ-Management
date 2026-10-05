import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class CreateFlowDto {
  @IsString()
  serviceId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  allowPartialCompletion?: boolean;

  /** Where payment is collected: at booking (CHECKIN), at the counter on completion (CHECKOUT) or never. */
  @IsOptional()
  @IsIn(['CHECKIN', 'CHECKOUT', 'NONE'])
  paymentTiming?: 'CHECKIN' | 'CHECKOUT' | 'NONE';

  @IsOptional()
  @IsIn(['ONLINE_ONLY', 'ONLINE_OR_COUNTER'])
  checkinPayMode?: 'ONLINE_ONLY' | 'ONLINE_OR_COUNTER';

  @IsOptional()
  @IsBoolean()
  autoSendInvoice?: boolean;

  @IsOptional()
  @IsBoolean()
  allowUnpaidCheckout?: boolean;
}
