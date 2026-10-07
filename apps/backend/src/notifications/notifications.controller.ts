import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { ConfigService } from '@nestjs/config';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  private getUserId(req: any): string {
    const id = req.user?.id;
    if (!id) throw new UnauthorizedException('Sessão inválida.');
    return id;
  }

  /* ── Google Calendar ─────────────────────────────────────────── */
  @Get('google/auth-url')
  @UseGuards(JwtAuthGuard)
  getGoogleAuthUrl(@Request() req) {
    const url = this.notificationsService.getGoogleAuthUrl(this.getUserId(req));
    return { url };
  }

  @Get('google/status')
  @UseGuards(JwtAuthGuard)
  async getGoogleStatus(@Request() req) {
    const connected = await this.notificationsService.isGoogleConnected(
      this.getUserId(req),
    );
    return { connected };
  }

  // Public — Google redirects here after consent
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    try {
      await this.notificationsService.handleGoogleCallback(code, state);
      return res.redirect(`${frontendUrl}/calendar?google=connected`);
    } catch (err) {
      return res.redirect(`${frontendUrl}/calendar?google=error`);
    }
  }

  /* ── Google Calendar event sync ──────────────────────────────── */
  @Post('google/sync-event')
  @UseGuards(JwtAuthGuard)
  async syncEvent(@Request() req, @Body() body: any) {
    const googleEventId = await this.notificationsService.syncEventToGoogle(
      this.getUserId(req),
      body,
    );
    return { googleEventId };
  }

  /* ── WhatsApp ────────────────────────────────────────────────── */
  /** Test message — always to the logged user's own phone, fixed text (no open relay). */
  @Post('whatsapp/test')
  @UseGuards(JwtAuthGuard)
  async testWhatsapp(@Request() req) {
    return this.notificationsService.sendWhatsappTest(this.getUserId(req));
  }

  /* ── Today's summary (fixed bills due today) ─────────────── */
  @Get('today')
  @UseGuards(JwtAuthGuard)
  async getTodaySummary(@Request() req) {
    return this.notificationsService.getTodaySummary(this.getUserId(req));
  }

  @Get('today/send')
  @UseGuards(JwtAuthGuard)
  async sendTodaySummary(@Request() req) {
    return this.notificationsService.sendTodaySummaryToUser(
      this.getUserId(req),
    );
  }

  // Manually trigger reminders (admin/debug)
  @Post('run-reminders')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async runReminders() {
    await this.notificationsService.runDailyReminders();
    return { success: true };
  }
}
