import { IsArray, IsUUID, IsOptional, IsString, IsInt, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ImportInstallmentDto {
  @IsInt()
  @Min(1)
  current: number;

  @IsInt()
  @Min(1)
  @Max(48)
  total: number;
}

class ImportConfirmItem {
  @IsString()
  id: string;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ImportInstallmentDto)
  installment?: ImportInstallmentDto;
}

export class ImportConfirmDto {
  @IsArray()
  items: ImportConfirmItem[];
}
