import { IsNumber, IsString, IsNotEmpty, Min, Max } from 'class-validator';

export class UpsertCategoryLimitDto {
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  @Min(2000)
  year: number;
}