import { IsString, IsOptional } from 'class-validator';

export class AdvanceStepDto {
  @IsOptional() @IsString()
  outcome?: string;

  @IsOptional() @IsString()
  staffNotes?: string;
}
