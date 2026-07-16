import { IsString, IsNumber, IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  description: string;

  @IsNumber()
  amount: number;

  @IsEnum(['INCOME', 'EXPENSE'])
  type: 'INCOME' | 'EXPENSE';

  @IsISO8601()
  date: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;

  @IsOptional()
  @IsString()
  paymentMethodType?: string;

  @IsOptional()
  @IsUUID()
  piggyBankId?: string;

  @IsOptional()
  @IsNumber()
  installments?: number;

  @IsOptional()
  @IsNumber()
  totalInstallments?: number;

  @IsOptional()
  @IsNumber()
  installmentNumber?: number;

  @IsOptional()
  @IsUUID()
  fixedBillId?: string;
}
