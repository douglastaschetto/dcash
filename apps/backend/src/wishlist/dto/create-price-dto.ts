import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreatePriceDto {
  @IsString()
  @IsNotEmpty()
  store: string;

  @IsNumber()
  @IsNotEmpty()
  cashPrice: number;

  @IsNumber()
  @IsOptional()
  installmentPrice?: number;

  @IsNumber()
  @IsOptional()
  installments?: number;

  @IsNumber()
  @IsOptional()
  shipping?: number;

  @IsString()
  @IsOptional()
  link?: string;
}