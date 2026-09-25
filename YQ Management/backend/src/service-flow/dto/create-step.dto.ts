import {
  IsString, IsOptional, IsBoolean, IsInt, IsNumber, IsEnum, IsArray, IsObject,
} from 'class-validator';

export enum StepTypeDto {
  SERVICE = 'SERVICE',
  CHECKPOINT = 'CHECKPOINT',
  COLLECTION = 'COLLECTION',
  WAITING_PERIOD = 'WAITING_PERIOD',
  NOTIFICATION = 'NOTIFICATION',
  PAYMENT = 'PAYMENT',
  FORM = 'FORM',
}

export enum StepTriggerDto {
  AUTOMATIC = 'AUTOMATIC',
  MANUAL_STAFF = 'MANUAL_STAFF',
  MANUAL_CUSTOMER = 'MANUAL_CUSTOMER',
  SCHEDULED = 'SCHEDULED',
  CONDITION = 'CONDITION',
}

export class CreateStepDto {
  @IsInt()
  stepOrder: number;

  @IsString()
  name: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsEnum(StepTypeDto)
  type?: StepTypeDto;

  @IsOptional() @IsEnum(StepTriggerDto)
  trigger?: StepTriggerDto;

  @IsOptional() @IsString()
  serviceId?: string;

  @IsOptional() @IsString()
  queueId?: string;

  @IsOptional() @IsBoolean()
  isOptional?: boolean;

  @IsOptional() @IsBoolean()
  isRepeatable?: boolean;

  @IsOptional() @IsBoolean()
  requiresQrScan?: boolean;

  @IsOptional() @IsBoolean()
  requiresStaffAction?: boolean;

  @IsOptional()
  prerequisites?: any;

  @IsOptional() @IsInt()
  deferredByDays?: number;

  @IsOptional() @IsInt()
  deferredByHours?: number;

  @IsOptional() @IsInt()
  expiresAfterDays?: number;

  @IsOptional() @IsString()
  entitlementUnit?: string;

  @IsOptional() @IsInt()
  entitlementFixed?: number;

  @IsOptional() @IsString()
  entitlementFormula?: string;

  @IsOptional() @IsBoolean()
  allowPartialRedemption?: boolean;

  @IsOptional() @IsBoolean()
  preventDoubleRedemption?: boolean;

  @IsOptional() @IsString()
  customerInstruction?: string;

  @IsOptional() @IsString()
  staffInstruction?: string;

  @IsOptional() @IsString()
  locationDescription?: string;

  @IsOptional() @IsInt()
  floorNumber?: number;

  @IsOptional() @IsString()
  roomNumber?: string;

  @IsOptional() @IsString()
  buildingWing?: string;

  @IsOptional() @IsString()
  mapImageUrl?: string;

  @IsOptional() @IsBoolean()
  notifyCustomerOnActivation?: boolean;

  @IsOptional() @IsString()
  notificationTemplate?: string;

  @IsOptional() @IsBoolean()
  notifyStaffOnActivation?: boolean;

  @IsOptional() @IsNumber()
  stepPrice?: number;

  @IsOptional() @IsString()
  stepPriceCurrency?: string;

  @IsOptional() @IsBoolean()
  isPriceVariable?: boolean;

  @IsOptional()
  outcomeOptions?: string[];

  @IsOptional()
  transitions?: {
    toStepId?: string;
    condition?: any;
    label?: string;
    isDefault?: boolean;
    priority?: number;
  }[];
}
