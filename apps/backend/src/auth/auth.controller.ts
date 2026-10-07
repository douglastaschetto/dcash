import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Request,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  RegisterDto,
  LoginDto,
  ResetPasswordDto,
  VerifyCodeDto,
  ResendCodeDto,
  ForgotPasswordDto,
  OAuthExchangeDto,
} from './dto/auth.dto';

/** Tighter than the app-wide default — these are the brute-force targets. */
const AUTH_THROTTLE = { default: { limit: 8, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── Registro ──────────────────────────────────────────────────────────────

  @Post('register')
  @Throttle(AUTH_THROTTLE)
  async register(@Body() data: RegisterDto) {
    return this.authService.register(data);
    // Retorna: { requiresCode, purpose: 'verify_email', email, challenge }
  }

  // ── Login JWT ─────────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  async login(@Body() data: LoginDto) {
    return this.authService.login(data);
    // Retorna { user, token } (dispositivo confiável) ou { requiresCode, challenge, ... }
  }

  // ── Segundo fator (código por e-mail) ─────────────────────────────────────

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  async verifyCode(@Body() data: VerifyCodeDto, @Request() req: any) {
    return this.authService.verifyCode(data, req.headers?.['user-agent']);
  }

  @Post('resend-code')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 4, ttl: 60_000 } })
  async resendCode(@Body() data: ResendCodeDto) {
    return this.authService.resendCode(data.challenge);
  }

  // ── Login Social (Google) ─────────────────────────────────────────────────

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Passport redireciona automaticamente para o Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Request() req: any, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    // Only a single-use code travels in the URL; the token is fetched by POST.
    const code = await this.authService.googleRedirectCode(req.user);
    return res.redirect(`${frontendUrl}/auth-success?code=${code}`);
  }

  @Post('oauth-exchange')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  async oauthExchange(@Body() data: OAuthExchangeDto) {
    return this.authService.exchangeOAuthCode(data.code);
  }

  // ── Recuperação de senha ──────────────────────────────────────────────────

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  async forgotPassword(@Body() data: ForgotPasswordDto) {
    return this.authService.forgotPassword(data.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  async resetPassword(@Body() data: ResetPasswordDto) {
    return this.authService.resetPassword(data);
  }

  // ── Perfil autenticado ────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @Request() req: any,
    @Body()
    body: {
      name?: string;
      phone?: string;
      avatar?: string;
      whatsappConsent?: boolean;
      whatsappAlertHour?: number;
      googleCalendarSync?: boolean;
    },
  ) {
    return this.authService.updateProfile(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('theme')
  async updateTheme(@Request() req: any, @Body() body: { theme: string }) {
    return this.authService.updateTheme(req.user.id, body.theme);
  }

  // Plano: só muda via pagamento confirmado (webhook) ou pelo admin — nunca pelo próprio usuário.
}
