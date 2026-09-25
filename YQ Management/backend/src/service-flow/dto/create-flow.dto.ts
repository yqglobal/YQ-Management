import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateFlowDto {
  @IsString()
  serviceId: string;

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
}
