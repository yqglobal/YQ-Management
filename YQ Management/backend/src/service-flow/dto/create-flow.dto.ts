import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class CreateFlowDto {
  @IsOptional()
  @IsString()
  serviceId?: string;

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

  /** Where payment is collected: during booking flow (BOOKING), at physical check-in (CHECKIN), at counter check-out (CHECKOUT) or never (NONE). */
  @IsOptional()
  @IsIn(['BOOKING', 'CHECKIN', 'CHECKOUT', 'NONE'])
  paymentTiming?: 'BOOKING' | 'CHECKIN' | 'CHECKOUT' | 'NONE';

  @IsOptional()
  @IsIn(['COUNTER_ONLY', 'STRIPE_ONLY', 'BOTH'])
  checkinPayMode?: 'COUNTER_ONLY' | 'STRIPE_ONLY' | 'BOTH';

  @IsOptional()
  @IsBoolean()
  autoSendInvoice?: boolean;

  @IsOptional()
  @IsBoolean()
  allowUnpaidCheckout?: boolean;
}
