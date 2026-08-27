import {
  IsEmail,
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class CreateInvitationDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxUses?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  expiresInDays?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedLocationIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedServiceIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedPages?: string[];
}
