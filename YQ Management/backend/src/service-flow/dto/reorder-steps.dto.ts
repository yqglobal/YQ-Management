import { IsArray, IsString } from 'class-validator';

export class ReorderStepsDto {
  @IsArray()
  @IsString({ each: true })
  orderedStepIds: string[];
}
