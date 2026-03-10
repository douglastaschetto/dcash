import { IsString, IsNumber, IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  description: string;

  @IsNumber()
  amount: number;

  @IsEnum(['INCOME', 'EXPENSE'])
  type: 'INCOME' | 'EXPENSE';

  @IsISO8601() // Garante formato de data YYYY-MM-DD ou ISO
  date: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;

  /**
   * NOVO CAMPO: Identifica a forma de pagamento (PIX, CREDIT_CARD, BOLETO, etc.)
   * Isso resolve o erro no TransactionsService e permite o agrupamento da fatura.
   */
  @IsOptional()
  @IsString()
  paymentMethodType?: string;

  @IsOptional()
  @IsUUID()
  piggyBankId?: string;

  @IsOptional()
  @IsNumber()
  installments?: number;
}