import { IsString, IsOptional } from 'class-validator';

export class CreateResourceDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  locationId?: string;
}
