import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class ReorderStepsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderedStepIds: string[];
}
