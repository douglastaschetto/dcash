import { IsString, IsNumber, IsUUID, Min, Max, IsOptional } from 'class-validator';

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
  categoryId: string;

  @IsString()
  @IsOptional()
  paymentMethodType?: string;

  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}