import {
  Controller, Post, Get, Body, Query, Request, Res, Headers,
  UseGuards, HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import type { Response, Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /** Create a Mercado Pago checkout preference */
  @Post('create-preference')
  @UseGuards(JwtAuthGuard)
  async createPreference(
    @Request() req,
    @Body() body: { plan: string },
  ) {
    return this.paymentService.createPreference(req.user.id, body.plan);
  }

  /** Check if plan was activated after redirect (frontend polling) */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async checkStatus(
    @Request() req,
    @Query('plan') plan: string,
    @Query('preference_id') preferenceId: string,
  ) {
    return this.paymentService.activateAfterRedirect(req.user.id, plan, preferenceId);
  }

  /** Payment history for current user */
  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getHistory(@Request() req) {
    return this.paymentService.getHistory(req.user.id);
  }

  /** Mercado Pago webhook — public endpoint */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Body() body: any, @Query() query: any) {
    // MP may send notification via query param instead of body
    const payload = body?.type ? body : { type: query.topic, data: { id: query.id } };
    await this.paymentService.handleWebhook(payload);
    return { received: true };
  }

  /** Create a Stripe Checkout session */
  @Post('stripe/create-session')
  @UseGuards(JwtAuthGuard)
  async createStripeSession(
    @Request() req,
    @Body() body: { plan: string },
  ) {
    return this.paymentService.createStripeSession(req.user.id, body.plan);
  }

  /** Stripe webhook — public endpoint, needs the raw body for signature verification */
  @Post('stripe/webhook')
  @HttpCode(HttpStatus.OK)
  async stripeWebhook(
    @Request() req: ExpressRequest & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody) throw new BadRequestException('Raw body ausente.');
    await this.paymentService.handleStripeWebhook(req.rawBody, signature);
    return { received: true };
  }
}
