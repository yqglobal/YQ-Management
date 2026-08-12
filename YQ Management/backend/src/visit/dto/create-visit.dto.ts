import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  IsObject,
} from 'class-validator';
import { VisitSource, VisitState } from '@prisma/client';

export class CreateVisitDto {
  @IsString()
  tenantId: string;

  @IsString()
  customerId: string;

  @IsString()
  locationId: string;

  @IsString()
  serviceId: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsOptional()
  @IsEnum(VisitSource)
  source?: VisitSource;

  @IsOptional()
  @IsDateString()
  scheduledTime?: Date;

  @IsOptional()
  @IsString()
  assignedStaffId?: string;

  @IsOptional()
  @IsString()
  assignedResourceId?: string;

  @IsOptional()
  @IsEnum(VisitState)
  currentState?: VisitState;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsString()
  queueId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: any;
}
