import {
  IsBoolean,
  IsEmail,
  IsString,
  IsOptional,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'A senha precisa ter pelo menos 8 caracteres.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'A senha precisa ter letras e números.',
  })
  password: string;

  @IsOptional()
  @IsString()
  inviteCode?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  inviteCode?: string;

  /** "Lembrar este dispositivo" token from a previous verified login. */
  @IsOptional()
  @IsString()
  deviceToken?: string;
}

export class VerifyCodeDto {
  @IsString()
  challenge: string;

  @Matches(/^\d{6}$/, { message: 'O código tem 6 números.' })
  code: string;

  @IsOptional()
  @IsBoolean()
  trustDevice?: boolean;
}

export class ResendCodeDto {
  @IsString()
  challenge: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  challenge: string;

  @Matches(/^\d{6}$/, { message: 'O código tem 6 números.' })
  code: string;

  @IsString()
  @MinLength(8, { message: 'A senha precisa ter pelo menos 8 caracteres.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'A senha precisa ter letras e números.',
  })
  password: string;
}

export class OAuthExchangeDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  code: string;
}
