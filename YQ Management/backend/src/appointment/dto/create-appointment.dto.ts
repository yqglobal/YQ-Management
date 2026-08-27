import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsObject,
} from 'class-validator';
import { AppointmentStatus, VisitSource } from '@prisma/client';

export class CreateAppointmentDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  customerId: string;

  @IsString()
  locationId: string;

  @IsString()
  serviceId: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsDateString()
  scheduledStart: Date;

  @IsDateString()
  scheduledEnd: Date;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsEnum(VisitSource)
  bookingSource?: VisitSource;

  @IsOptional()
  @IsString()
  customerNotes?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  formData?: any;
}
