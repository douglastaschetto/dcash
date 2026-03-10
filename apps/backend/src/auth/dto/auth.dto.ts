import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  inviteCode?: string; // Código para entrar na família
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class GoogleLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsOptional()
  avatar?: string;

  @IsOptional()
  inviteCode?: string;
}