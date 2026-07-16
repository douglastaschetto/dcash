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

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsBoolean()
  @IsOptional()
  bought?: boolean;

  @IsString()
  @IsOptional()
  categoryId?: string;
}
