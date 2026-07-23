import { IsArray, IsOptional, IsString } from 'class-validator';

export class AnalyzeStagingDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ids?: string[];
}
