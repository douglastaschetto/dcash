import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTourDto {
  @IsString()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
