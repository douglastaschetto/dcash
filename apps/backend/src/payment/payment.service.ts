import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import MercadoPagoConfig, { Preference, Payment } from 'mercadopago';
import Stripe from 'stripe';

export const PLAN_PRICES: Record<string, { amount: number; label: string }> = {
  basico:        { amount: 9.90,  label: 'DCash Básico' },
  intermediario: { amount: 19.90, label: 'DCash Intermediário' },
  pro:           { amount: 34.90, label: 'DCash Pro' },
};

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly mpClient: MercadoPagoConfig;
  private readonly stripeClient: Stripe | null;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
  ) {
    this.mpClient = new MercadoPagoConfig({
      accessToken: this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN') ?? '',
    });

    const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY');
    this.stripeClient = stripeKey ? new Stripe(stripeKey) : null;
  }

  async createPreference(userId: string, plan: string) {
    const planKey = plan.toLowerCase();
    const planInfo = PLAN_PRICES[planKey];
    if (!planInfo) throw new BadRequestException('Plano inválido');

    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const apiUrl = this.config.get<string>('NEXT_PUBLIC_API_URL') || 'http://localhost:3001/api';

    const preference = new Preference(this.mpClient);
    const result = await preference.create({
      body: {
        items: [
          {
            id: planKey,
            title: planInfo.label,
            quantity: 1,
            unit_price: planInfo.amount,
            currency_id: 'BRL',
          },
        ],
        payer: {},
        back_urls: {
          success: `${frontendUrl}/payment/success?plan=${planKey}`,
          failure: `${frontendUrl}/payment/failure?plan=${planKey}`,
          pending: `${frontendUrl}/payment/pending?plan=${planKey}`,
        },
        external_reference: `${userId}:${planKey}`,
        notification_url: `${apiUrl}/payment/webhook`,
        statement_descriptor: 'DCASH',
      },
    });

    await this.db.query(
      `INSERT INTO db_dtasc.payments
         (user_id, plan, amount, provider_preference_id, status)
       VALUES ($1, $2, $3, $4, 'pending')`,
      [userId, planKey, planInfo.amount, result.id],
    );

    return {
      preferenceId: result.id,
      checkoutUrl: result.init_point,
      sandboxUrl: result.sandbox_init_point,
      plan: planKey,
      amount: planInfo.amount,
      label: planInfo.label,
    };
  }

  /** Create a Stripe Checkout session (subscription mode, inline price). */
  async createStripeSession(userId: string, plan: string) {
    if (!this.stripeClient) {
      throw new BadRequestException('Stripe não configurado. Defina STRIPE_SECRET_KEY.');
    }

    const planKey = plan.toLowerCase();
    const planInfo = PLAN_PRICES[planKey];
    if (!planInfo) throw new BadRequestException('Plano inválido');

    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const session = await this.stripeClient.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: { name: planInfo.label },
            unit_amount: Math.round(planInfo.amount * 100),
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      client_reference_id: `${userId}:${planKey}`,
      success_url: `${frontendUrl}/payment/success?plan=${planKey}&preference_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/payment/failure?plan=${planKey}`,
    });

    await this.db.query(
      `INSERT INTO db_dtasc.payments
         (user_id, plan, amount, provider_preference_id, status, provider)
       VALUES ($1, $2, $3, $4, 'pending', 'stripe')`,
      [userId, planKey, planInfo.amount, session.id],
    );

    return {
      checkoutUrl: session.url,
      plan: planKey,
      amount: planInfo.amount,
      label: planInfo.label,
    };
  }

  /** Called by Stripe webhook when a checkout session completes. */
  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!this.stripeClient) return;
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.error('Stripe webhook received but STRIPE_WEBHOOK_SECRET is not set.');
      return;
    }

    try {
      const event = this.stripeClient.webhooks.constructEvent(rawBody, signature, webhookSecret);
      if (event.type !== 'checkout.session.completed') return;

      const session = event.data.object as Stripe.Checkout.Session;
      const [userId, plan] = (session.client_reference_id ?? '').split(':');
      if (!userId || !plan) return;

      await this.db.query(
        `UPDATE db_dtasc.payments
         SET status = 'approved', provider_payment_id = $1, updated_at = NOW()
         WHERE user_id = $2 AND plan = $3 AND provider_preference_id = $4`,
        [String(session.payment_intent ?? session.subscription ?? ''), userId, plan, session.id],
      );

      await this.db.query(
        'UPDATE db_dtasc.users SET plan = $1 WHERE id = $2',
        [plan, userId],
      );
      this.logger.log(`Plan upgraded: user ${userId} → ${plan} (stripe session ${session.id})`);
    } catch (err: any) {
      this.logger.error(`Stripe webhook error: ${err.message}`);
    }
  }

  /** Called by MP webhook when payment status changes. */
  async handleWebhook(body: any): Promise<void> {
    try {
      if (body.type !== 'payment') return;

      const paymentId = String(body.data?.id ?? '');
      if (!paymentId) return;

      const mpPayment = new Payment(this.mpClient);
      const payment = await mpPayment.get({ id: paymentId });

      const externalRef = payment.external_reference ?? '';
      const [userId, plan] = externalRef.split(':');
      if (!userId || !plan) return;

      const status = payment.status; // approved | pending | rejected | cancelled

      await this.db.query(
        `UPDATE db_dtasc.payments
         SET status = $1, provider_payment_id = $2, updated_at = NOW()
         WHERE user_id = $3 AND plan = $4
           AND id = (
             SELECT id FROM db_dtasc.payments
             WHERE user_id = $3 AND plan = $4
             ORDER BY created_at DESC LIMIT 1
           )`,
        [status, paymentId, userId, plan],
      );

      if (status === 'approved') {
        await this.db.query(
          'UPDATE db_dtasc.users SET plan = $1 WHERE id = $2',
          [plan, userId],
        );
        this.logger.log(`Plan upgraded: user ${userId} → ${plan} (payment ${paymentId})`);
      }
    } catch (err: any) {
      this.logger.error(`Webhook error: ${err.message}`);
    }
  }

  /** Manual plan activation after redirect (fallback when webhook hasn't fired yet). */
  async activateAfterRedirect(userId: string, plan: string, preferenceId: string) {
    const planKey = plan.toLowerCase();
    if (!PLAN_PRICES[planKey]) throw new BadRequestException('Plano inválido');

    const rows = await this.db.query(
      `SELECT status FROM db_dtasc.payments
       WHERE user_id = $1 AND plan = $2 AND provider_preference_id = $3`,
      [userId, planKey, preferenceId],
    );

    if (rows[0]?.status === 'approved') {
      return { alreadyActivated: true, plan: planKey };
    }

    // Webhook hasn't fired yet — return pending so frontend knows to wait
    return { alreadyActivated: false, plan: planKey, status: rows[0]?.status ?? 'pending' };
  }

  async getHistory(userId: string) {
    return this.db.query(
      `SELECT id, plan, amount, status, provider, provider_payment_id,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM db_dtasc.payments WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );
  }
}
