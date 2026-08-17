import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class RequestOtpDto {
  @IsOptional()
  @IsUUID()
  queueId?: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class JoinQueueDto {
  @IsString()
  @IsNotEmpty()
  queueId: string;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  otp?: string;

  @IsOptional()
  formResponses?: any;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  scheduledFor?: string;
}

export class CancelTokenDto {
  @IsUUID()
  @IsNotEmpty()
  tokenId: string;
}

export class CheckInTokenDto {
  @IsUUID()
  @IsNotEmpty()
  tokenId: string;
}

export class ValidateTokenDto {
  @IsString()
  @IsNotEmpty()
  tokenId: string;
}

export class TransferTokenDto {
  @IsUUID()
  @IsNotEmpty()
  nextQueueId: string;
}
