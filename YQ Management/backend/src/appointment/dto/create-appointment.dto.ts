import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsObject,
  IsInt,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { AppointmentStatus, VisitSource } from '@prisma/client';

export class CreateAppointmentDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  queueId?: string;

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
  @Transform(({ value }) => {
    if (value === 'RECEPTION_MANUAL') return VisitSource.RECEPTION;
    return value;
  })
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

  @IsOptional()
  @IsInt()
  accompanyingGuests?: number;

  @IsOptional()
  @IsString()
  cancelReason?: string;

  @IsOptional()
  refundApplicable?: boolean;
}
