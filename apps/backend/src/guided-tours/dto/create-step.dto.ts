import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const PLACEMENTS = ['top', 'bottom', 'left', 'right'];
const ACTION_TYPES = ['none', 'click', 'navigate'];

export class CreateStepDto {
  @IsString()
  target: string;

  @IsString()
  @MaxLength(120)
  title: string;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsIn(PLACEMENTS)
  placement: 'top' | 'bottom' | 'left' | 'right';

  @IsIn(ACTION_TYPES)
  actionType: 'none' | 'click' | 'navigate';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  actionValue?: string;
}
