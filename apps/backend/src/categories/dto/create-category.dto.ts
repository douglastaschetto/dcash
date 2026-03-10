import { IsString, IsNotEmpty, IsEnum, IsHexColor } from 'class-validator';

export enum CategoryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(CategoryType)
  @IsNotEmpty()
  type: CategoryType; // Verifique se o nome é exatamente 'type'

  @IsHexColor()
  @IsNotEmpty()
  color: string;

  @IsString()
  @IsNotEmpty()
  icon: string;
}