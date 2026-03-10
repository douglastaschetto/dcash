import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateWishDto {
  @IsString()
  @IsOptional()
  product?: string;

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
}