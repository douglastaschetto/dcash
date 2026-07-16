import { IsArray, IsUUID, IsOptional, IsString } from 'class-validator';

class ImportConfirmItem {
  @IsString()
  id: string;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;
}

export class ImportConfirmDto {
  @IsArray()
  items: ImportConfirmItem[];
}
