import { IsString, IsNumber, IsUUID, Min, Max, IsOptional, IsBoolean } from 'class-validator';

export class CreateFixedBillDto {
  @IsString()
  description: string;

  @IsNumber()
  amount: number;

  @IsNumber()
  @Min(1)
  @Max(31)
  dayOfMonth: number;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  paymentMethodType?: string;

  @IsUUID()
  @IsOptional()
  paymentMethodId?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  @IsOptional()
  generateTransactions?: boolean;
}
