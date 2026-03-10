import { IsNumberString, IsOptional } from 'class-validator';

export class DashboardQueryDto {
  @IsOptional()
  @IsNumberString()
  month?: string;

  @IsOptional()
  @IsNumberString()
  year?: string;
}