import { IsString, IsNumber, IsOptional, ValidateIf } from 'class-validator';

export class CreateDreamDto {
  @IsString()
  title: string;

  @IsNumber()
  targetValue: number;

  @IsNumber()
  @IsOptional()
  savedValue?: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  deadline?: string;

  @IsOptional()
  @ValidateIf((o, v) => v !== null)
  @IsString()
  piggyBankId?: string | null;

  @IsOptional()
  @ValidateIf((o, v) => v !== null)
  @IsString()
  wishlistId?: string | null;
}
