import { IsString, IsIn, IsOptional, IsBoolean } from 'class-validator';

export class ChangeIndustryDto {
  @IsString()
  newBusinessType: string;

  @IsIn(['KEEP', 'REMOVE_TEMPLATE_ONLY', 'DELETE_ALL'])
  serviceStrategy: 'KEEP' | 'REMOVE_TEMPLATE_ONLY' | 'DELETE_ALL';

  @IsOptional()
  @IsBoolean()
  provisionNewService?: boolean;
}
