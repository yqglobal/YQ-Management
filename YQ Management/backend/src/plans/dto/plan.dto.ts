import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionStatus } from '@prisma/client';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['TRIAL', 'STANDARD', 'PREMIUM', 'ENTERPRISE', 'CUSTOM'])
  @IsOptional()
  type?: 'TRIAL' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE' | 'CUSTOM';

  @IsEnum(['ACTIVE', 'INACTIVE', 'ARCHIVED'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

  @IsEnum(['MONTHLY', 'YEARLY'])
  @IsOptional()
  billingInterval?: 'MONTHLY' | 'YEARLY';

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  annualPrice?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  trialDays?: number;

  @IsObject()
  @IsOptional()
  features?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  limits?: Record<string, unknown>;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsString()
  @IsOptional()
  id?: string;

  @IsOptional()
  createdAt?: any;

  @IsOptional()
  updatedAt?: any;

  @IsOptional()
  maxVisits?: number;

  @IsOptional()
  maxQueues?: number;
}

export class UpdatePlanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['MONTHLY', 'YEARLY'])
  @IsOptional()
  billingInterval?: 'MONTHLY' | 'YEARLY';

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  annualPrice?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  trialDays?: number;

  @IsObject()
  @IsOptional()
  features?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  limits?: Record<string, unknown>;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsString()
  @IsOptional()
  type?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsString()
  @IsOptional()
  id?: string;

  @IsOptional()
  createdAt?: any;

  @IsOptional()
  updatedAt?: any;

  @IsOptional()
  maxVisits?: number;

  @IsOptional()
  maxQueues?: number;
}

export class ChangePlanStatusDto {
  @IsEnum(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'active', 'inactive', 'archived'])
  status: string;
}

export class DuplicatePlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
