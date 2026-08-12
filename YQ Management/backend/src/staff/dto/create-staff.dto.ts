import { IsString, IsOptional } from 'class-validator';

export class CreateStaffDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
