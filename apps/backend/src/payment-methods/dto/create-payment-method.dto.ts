import { IsString, IsOptional, IsNumber, IsHexColor } from 'class-validator';

export class CreatePaymentMethodDto {
  @IsString()
  name: string;

  @IsString()
  type: string; // 'CREDIT_CARD' ou 'CASH'

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  closingDay?: number;

  @IsOptional()
  @IsNumber()
  dueDay?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;
}