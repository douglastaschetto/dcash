import { IsNumber, IsString, IsOptional } from 'class-validator';

export class UpsertChallengeDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  month: string;

  @IsNumber()
  year: number;

  @IsString()
  challenge: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  observations?: string;
}
