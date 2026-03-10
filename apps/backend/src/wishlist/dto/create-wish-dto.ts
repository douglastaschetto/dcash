import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateWishDto {
  @IsString()
  @IsNotEmpty()
  product: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  link?: string;

  @IsString() // Adicione este
  @IsOptional()
  imageUrl?: string;

  @IsBoolean() // Adicione este
  @IsOptional()
  bought?: boolean;

  @IsOptional()
  categoryId?: string;
}