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
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── Registro ──────────────────────────────────────────────────────────────

  @Post('register')
  async register(@Body() data: RegisterDto) {
    return this.authService.register(data);
    // Retorna: { user, token, firstLogin: true }
  }

  // ── Login JWT ─────────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() data: LoginDto) {
    return this.authService.login(data);
    // Retorna: { user, token, firstLogin }
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
    const result = await this.authService.loginSocial(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const params = new URLSearchParams({
      token: result.token,
      firstLogin: String(result.firstLogin),
      name: result.user.name,
      email: result.user.email,
    });

    return res.redirect(`${frontendUrl}/auth-success?${params.toString()}`);
  }

  // ── Recuperação de senha ──────────────────────────────────────────────────

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    await this.authService.forgotPassword(email);
    return { success: true };
  }

  // ── Perfil autenticado ────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Request() req: any, @Body() body: {
    name?: string; phone?: string; avatar?: string; whatsappConsent?: boolean;
    whatsappAlertHour?: number; googleCalendarSync?: boolean;
  }) {
    return this.authService.updateProfile(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('theme')
  async updateTheme(@Request() req: any, @Body() body: { theme: string }) {
    return this.authService.updateTheme(req.user.id, body.theme);
  }

  // ── Plano ─────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Patch('plan')
  async updatePlan(@Request() req: any, @Body() body: { plan: string }) {
    return this.authService.updatePlan(req.user.id, body.plan);
  }
}
