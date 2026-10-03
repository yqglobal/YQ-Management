import { IsOptional, IsString, IsBoolean, IsObject } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  subdomain?: string;

  @IsOptional()
  @IsString()
  businessType?: string;

  @IsOptional()
  @IsString()
  operatingMode?: string;

  @IsOptional()
  branding?: any;

  @IsOptional()
  customerExperience?: any;

  @IsOptional()
  @IsBoolean()
  chatbotEnabled?: boolean;

  @IsOptional()
  chatbotConfig?: any;

  @IsOptional()
  @IsString()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  supportPhone?: string;

  @IsOptional()
  @IsBoolean()
  showSupportInfo?: boolean;

  @IsOptional()
  aiConfig?: any;
  @IsOptional()
  @IsBoolean()
  selfServeModeEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  selfServeOtpEnabled?: boolean;
}
