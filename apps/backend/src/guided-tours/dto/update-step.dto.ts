import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const PLACEMENTS = ['top', 'bottom', 'left', 'right'];
const ACTION_TYPES = ['none', 'click', 'navigate'];

export class UpdateStepDto {
  @IsOptional()
  @IsString()
  target?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsIn(PLACEMENTS)
  placement?: 'top' | 'bottom' | 'left' | 'right';

  @IsOptional()
  @IsIn(ACTION_TYPES)
  actionType?: 'none' | 'click' | 'navigate';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  actionValue?: string;
}
