import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import MercadoPagoConfig, { Preference, Payment } from 'mercadopago';
import Stripe from 'stripe';

export const PLAN_PRICES: Record<string, { amount: number; label: string }> = {
  basico:        { amount: 9.90,  label: 'DCash Básico' },
  intermediario: { amount: 19.90, label: 'DCash Intermediário' },
  pro:           { amount: 34.90, label: 'DCash Pro' },
};

/** Same 20% discount already advertised on the /plans pricing page. */
const YEARLY_DISCOUNT = 0.8;

type BillingCycle = 'monthly' | 'yearly';

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
  async createStripeSession(userId: string, plan: string, billingCycle: BillingCycle = 'monthly') {
    if (!this.stripeClient) {
      throw new BadRequestException('Stripe não configurado. Defina STRIPE_SECRET_KEY.');
    }
    if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
      throw new BadRequestException('Ciclo de cobrança inválido.');
    }

    const planKey = plan.toLowerCase();
    const planInfo = PLAN_PRICES[planKey];
    if (!planInfo) throw new BadRequestException('Plano inválido');

    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const unitAmount = billingCycle === 'yearly'
      ? Math.round(planInfo.amount * YEARLY_DISCOUNT * 12 * 100)
      : Math.round(planInfo.amount * 100);

    const session = await this.stripeClient.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: { name: planInfo.label },
            unit_amount: unitAmount,
            recurring: { interval: billingCycle === 'yearly' ? 'year' : 'month' },
          },
          quantity: 1,
        },
      ],
      // billingCycle is appended so the webhook can tell renewals apart —
      // subscription/invoice events carry no client_reference_id at all, so
      // this is the only place that information is ever recorded.
      client_reference_id: `${userId}:${planKey}:${billingCycle}`,
      success_url: `${frontendUrl}/payment/success?plan=${planKey}&preference_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/payment/failure?plan=${planKey}`,
    });

    const chargedAmount = unitAmount / 100;

    await this.db.query(
      `INSERT INTO db_dtasc.payments
         (user_id, plan, amount, provider_preference_id, status, provider)
       VALUES ($1, $2, $3, $4, 'pending', 'stripe')`,
      [userId, planKey, chargedAmount, session.id],
    );

    return {
      checkoutUrl: session.url,
      plan: planKey,
      amount: chargedAmount,
      billingCycle,
      label: planInfo.label,
    };
  }

  /**
   * Called by the Stripe webhook. Stripe is the sole source of truth for
   * recurring billing — this handler is what keeps `users.plan_expires_at`/
   * `plan_status` in sync with what's actually happening on Stripe's side.
   *
   * `invoice.paid`/`invoice.payment_failed`/`customer.subscription.deleted`
   * carry no `client_reference_id` (that field only exists on the initial
   * Checkout Session), so those three are correlated back to a user via
   * `stripe_subscription_id` instead — captured on `checkout.session.completed`.
   *
   * `customer.subscription.updated` is intentionally not handled yet (no
   * Stripe customer portal in this app to generate that event meaningfully).
   */
  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!this.stripeClient) return;
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.error('Stripe webhook received but STRIPE_WEBHOOK_SECRET is not set.');
      return;
    }

    try {
      const event = this.stripeClient.webhooks.constructEvent(rawBody, signature, webhookSecret);

      switch (event.type) {
        case 'checkout.session.completed':
          await this.onCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case 'invoice.paid':
          await this.onInvoicePaid(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.onInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        case 'customer.subscription.deleted':
          await this.onSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        default:
        // ignored — includes customer.subscription.updated, see doc comment above
      }
    } catch (err: any) {
      this.logger.error(`Stripe webhook error: ${err.message}`);
    }
  }

  private async onCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const [userId, plan, billingCycleRaw] = (session.client_reference_id ?? '').split(':');
    const billingCycle: BillingCycle = billingCycleRaw === 'yearly' ? 'yearly' : 'monthly';
    if (!userId || !plan) return;

    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null;

    let expiresAt: Date | null = null;
    if (subscriptionId && this.stripeClient) {
      const subscription = await this.stripeClient.subscriptions.retrieve(subscriptionId);
      const periodEnd = subscription.items.data[0]?.current_period_end;
      if (periodEnd) expiresAt = new Date(periodEnd * 1000);
    }

    await this.db.query(
      `UPDATE db_dtasc.payments
       SET status = 'approved', provider_payment_id = $1, updated_at = NOW()
       WHERE user_id = $2 AND plan = $3 AND provider_preference_id = $4`,
      [String(session.payment_intent ?? subscriptionId ?? ''), userId, plan, session.id],
    );

    await this.db.query(
      `UPDATE db_dtasc.users
       SET plan = $1, plan_billing_cycle = $2, plan_expires_at = $3, plan_status = 'active',
           stripe_customer_id = $4, stripe_subscription_id = $5
       WHERE id = $6`,
      [plan, billingCycle, expiresAt, customerId, subscriptionId, userId],
    );
    this.logger.log(`Plan upgraded: user ${userId} → ${plan} (${billingCycle}, stripe session ${session.id})`);
  }

  private async onInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const subRef = invoice.parent?.subscription_details?.subscription;
    const subscriptionId = typeof subRef === 'string' ? subRef : subRef?.id;
    if (!subscriptionId) return;

    const expiresAt = invoice.period_end ? new Date(invoice.period_end * 1000) : null;
    const rows = await this.db.query(
      `UPDATE db_dtasc.users SET plan_expires_at = $1, plan_status = 'active'
       WHERE stripe_subscription_id = $2 RETURNING id`,
      [expiresAt, subscriptionId],
    );
    if (rows.length === 0) {
      // Can race with checkout.session.completed on the very first invoice —
      // that handler already seeds plan_expires_at independently, so this is
      // only a real problem from the 2nd renewal onward.
      this.logger.warn(`invoice.paid for unknown subscription ${subscriptionId} — no matching user.`);
    } else {
      this.logger.log(`Subscription renewed: ${subscriptionId} → expires ${expiresAt?.toISOString()}`);
    }
  }

  private async onInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subRef = invoice.parent?.subscription_details?.subscription;
    const subscriptionId = typeof subRef === 'string' ? subRef : subRef?.id;
    if (!subscriptionId) return;

    // Deliberately does NOT touch plan/plan_expires_at — Stripe's own dunning
    // retries continue, and access keeps running until plan_expires_at
    // naturally lapses (caught by the cron sweep) or Stripe gives up and
    // fires customer.subscription.deleted.
    await this.db.query(
      `UPDATE db_dtasc.users SET plan_status = 'past_due' WHERE stripe_subscription_id = $1`,
      [subscriptionId],
    );
    this.logger.warn(`Payment failed for subscription ${subscriptionId} — marked past_due.`);
  }

  private async onSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    await this.db.query(
      `UPDATE db_dtasc.users
       SET plan = 'free', plan_status = 'active', plan_expires_at = NULL,
           plan_billing_cycle = NULL, stripe_subscription_id = NULL
       WHERE stripe_subscription_id = $1`,
      [subscription.id],
    );
    this.logger.log(`Subscription cancelled: ${subscription.id} → downgraded to free.`);
  }

  /**
   * Cancels a Stripe subscription. `immediate: false` (self-service) schedules
   * cancellation for the end of the already-paid period — the customer keeps
   * access until then, matching standard SaaS UX. `immediate: true` (admin
   * override) cancels right away, since the admin is changing the plan now.
   * DB updates are the caller's responsibility.
   */
  async cancelStripeSubscription(subscriptionId: string, opts: { immediate: boolean }): Promise<void> {
    if (!this.stripeClient) return;
    if (opts.immediate) {
      await this.stripeClient.subscriptions.cancel(subscriptionId);
    } else {
      await this.stripeClient.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    }
  }

  /** Self-service cancellation, called from the logged-in user's profile page. */
  async cancelSubscription(userId: string) {
    const rows = await this.db.query<{ stripe_subscription_id: string | null }>(
      `SELECT stripe_subscription_id FROM db_dtasc.users WHERE id = $1`,
      [userId],
    );
    const subscriptionId = rows[0]?.stripe_subscription_id;
    if (!subscriptionId) {
      throw new BadRequestException('Nenhuma assinatura Stripe ativa encontrada.');
    }
    if (!this.stripeClient) {
      throw new BadRequestException('Stripe não configurado.');
    }

    await this.cancelStripeSubscription(subscriptionId, { immediate: false });
    await this.db.query(
      `UPDATE db_dtasc.users SET plan_status = 'canceling' WHERE id = $1`,
      [userId],
    );
    return { success: true, status: 'canceling' as const };
  }

  /**
   * Daily safety net — Stripe webhooks are the primary mechanism for
   * downgrading lapsed subscriptions; this only catches cases where a webhook
   * never arrived. plan_expires_at IS NULL (free plan, MP-grandfathered, or a
   * manual admin override) is never swept.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async sweepExpiredSubscriptions(): Promise<void> {
    const rows = await this.db.query(
      `UPDATE db_dtasc.users
       SET plan = 'free', plan_status = 'active', plan_expires_at = NULL,
           plan_billing_cycle = NULL, stripe_subscription_id = NULL
       WHERE plan_expires_at < NOW() AND plan != 'free'
       RETURNING id`,
    );
    if (rows.length > 0) {
      this.logger.log(`Cron sweep: downgraded ${rows.length} expired subscription(s).`);
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

  // ── Admin: Stripe product/price management ────────────────────────────

  private async formatStripeProduct(product: Stripe.Product) {
    const prices = await this.stripeClient!.prices.list({ product: product.id, limit: 100 });
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      active: product.active,
      metadata: product.metadata,
      defaultPriceId: typeof product.default_price === 'string' ? product.default_price : product.default_price?.id ?? null,
      prices: prices.data.map((p) => ({
        id: p.id,
        active: p.active,
        unitAmount: p.unit_amount,
        currency: p.currency,
        interval: p.recurring?.interval ?? null,
      })),
    };
  }

  async listStripeProducts() {
    if (!this.stripeClient) throw new BadRequestException('Stripe não configurado.');
    const products = await this.stripeClient.products.list({ limit: 100 });
    return Promise.all(products.data.map((p) => this.formatStripeProduct(p)));
  }

  async createStripeProduct(dto: {
    name: string;
    description?: string;
    amount?: number;
    currency?: string;
    interval?: 'month' | 'year';
  }) {
    if (!this.stripeClient) throw new BadRequestException('Stripe não configurado.');
    if (!dto.name?.trim()) throw new BadRequestException('Nome do produto é obrigatório.');

    const product = await this.stripeClient.products.create({
      name: dto.name.trim(),
      description: dto.description?.trim() || undefined,
    });

    if (dto.amount != null) {
      const price = await this.stripeClient.prices.create({
        product: product.id,
        currency: (dto.currency || 'brl').toLowerCase(),
        unit_amount: Math.round(dto.amount * 100),
        ...(dto.interval ? { recurring: { interval: dto.interval } } : {}),
      });
      await this.stripeClient.products.update(product.id, { default_price: price.id });
    }

    const refreshed = await this.stripeClient.products.retrieve(product.id);
    return this.formatStripeProduct(refreshed);
  }

  async addStripePrice(productId: string, dto: { amount: number; currency?: string; interval?: 'month' | 'year' }) {
    if (!this.stripeClient) throw new BadRequestException('Stripe não configurado.');
    await this.stripeClient.prices.create({
      product: productId,
      currency: (dto.currency || 'brl').toLowerCase(),
      unit_amount: Math.round(dto.amount * 100),
      ...(dto.interval ? { recurring: { interval: dto.interval } } : {}),
    });
    return this.formatStripeProduct(await this.stripeClient.products.retrieve(productId));
  }

  async updateStripeProduct(id: string, dto: { name?: string; description?: string; active?: boolean }) {
    if (!this.stripeClient) throw new BadRequestException('Stripe não configurado.');
    const product = await this.stripeClient.products.update(id, {
      ...(dto.name ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description?.trim() || '' } : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
    });
    return this.formatStripeProduct(product);
  }

  /**
   * Stripe won't hard-delete a product once any price has ever been attached
   * to it, so "delete" here archives the product and all of its prices — it
   * disappears from checkout/new subscriptions but stays in Stripe's records.
   */
  async archiveStripeProduct(id: string) {
    if (!this.stripeClient) throw new BadRequestException('Stripe não configurado.');
    const prices = await this.stripeClient.prices.list({ product: id, active: true, limit: 100 });
    await Promise.all(prices.data.map((p) => this.stripeClient!.prices.update(p.id, { active: false })));
    await this.stripeClient.products.update(id, { active: false });
    return { success: true };
  }

  /**
   * One-click setup: creates (or reuses, matched via metadata.plan_key) a
   * Stripe Product per DCash plan with monthly + yearly recurring Prices
   * matching PLAN_PRICES/YEARLY_DISCOUNT. Idempotent — safe to re-run after
   * changing prices, it only adds whichever price combination is missing
   * rather than duplicating what's already there.
   */
  async syncPlanProducts() {
    if (!this.stripeClient) throw new BadRequestException('Stripe não configurado.');
    const existing = await this.stripeClient.products.list({ limit: 100 });
    const results: Awaited<ReturnType<PaymentService['formatStripeProduct']>>[] = [];

    for (const [planKey, info] of Object.entries(PLAN_PRICES)) {
      let product = existing.data.find((p) => p.metadata?.plan_key === planKey);
      if (!product) {
        product = await this.stripeClient.products.create({
          name: info.label,
          metadata: { plan_key: planKey },
        });
      }

      const prices = await this.stripeClient.prices.list({ product: product.id, active: true, limit: 100 });
      const wants: { interval: 'month' | 'year'; unitAmount: number }[] = [
        { interval: 'month', unitAmount: Math.round(info.amount * 100) },
        { interval: 'year', unitAmount: Math.round(info.amount * YEARLY_DISCOUNT * 12 * 100) },
      ];

      for (const want of wants) {
        const already = prices.data.some(
          (p) => p.recurring?.interval === want.interval && p.unit_amount === want.unitAmount && p.currency === 'brl',
        );
        if (!already) {
          await this.stripeClient.prices.create({
            product: product.id,
            currency: 'brl',
            unit_amount: want.unitAmount,
            recurring: { interval: want.interval },
          });
        }
      }

      results.push(await this.formatStripeProduct(await this.stripeClient.products.retrieve(product.id)));
    }

    return results;
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
