import { IsOptional, IsString, IsBoolean, IsObject } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  subdomain?: string;

  @IsOptional()
  branding?: any;

  @IsOptional()
  customerExperience?: any;

  @IsOptional()
  @IsBoolean()
  chatbotEnabled?: boolean;

  @IsOptional()
  chatbotConfig?: any;
}
