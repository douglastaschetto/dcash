import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PlanService } from '../plan/plan.service';
import { PaymentService } from '../payment/payment.service';

const VALID_PLANS = ['free', 'basico', 'intermediario', 'pro'];

@Injectable()
export class AdminService {
  constructor(
    private readonly db: DatabaseService,
    private readonly planService: PlanService,
    private readonly paymentService: PaymentService,
  ) {}

  async getUsers() {
    return this.db.query(
      `SELECT
         u.id, u.name, u.email,
         u.plan, u.is_admin AS "isAdmin",
         u.phone, u.whatsapp_consent AS "whatsappConsent",
         u.created_at AS "createdAt",
         u.family_group_id AS "familyGroupId",
         fg.name AS "familyGroupName",
         fg.owner_id AS "familyOwnerId",
         owner.plan AS "familyOwnerPlan",
         u.plan_expires_at AS "planExpiresAt",
         u.plan_status AS "planStatus"
       FROM db_dtasc.users u
       LEFT JOIN db_dtasc.family_groups fg ON fg.id = u.family_group_id
       LEFT JOIN db_dtasc.users owner ON owner.id = fg.owner_id
       ORDER BY u.created_at DESC`,
      [],
    );
  }

  /**
   * Manual override always wins over Stripe: if the target user has a live
   * subscription, it's cancelled immediately on Stripe's side too (not just
   * locally) so their card doesn't keep getting charged for a plan we've
   * already zeroed out in our own database. The override itself is left
   * with no expiration, which makes it immune to the daily cron sweep.
   */
  async updateUserPlan(targetUserId: string, plan: string) {
    if (!VALID_PLANS.includes(plan.toLowerCase())) {
      throw new BadRequestException('Plano inválido');
    }

    const rows = await this.db.query<{ stripe_subscription_id: string | null }>(
      `SELECT stripe_subscription_id FROM db_dtasc.users WHERE id = $1`,
      [targetUserId],
    );
    const subscriptionId = rows[0]?.stripe_subscription_id;
    if (subscriptionId) {
      await this.paymentService.cancelStripeSubscription(subscriptionId, { immediate: true });
    }

    await this.db.query(
      `UPDATE db_dtasc.users
       SET plan = $1, plan_status = 'active', plan_expires_at = NULL,
           plan_billing_cycle = NULL, stripe_subscription_id = NULL, stripe_customer_id = NULL
       WHERE id = $2`,
      [plan.toLowerCase(), targetUserId],
    );
    return { success: true };
  }

  async toggleAdmin(targetUserId: string, isAdmin: boolean) {
    await this.db.query(
      'UPDATE db_dtasc.users SET is_admin = $1 WHERE id = $2',
      [isAdmin, targetUserId],
    );
    return { success: true };
  }

  async getAllPlanFeatures() {
    return this.planService.getAllPlanFeatures();
  }

  async updatePlanFeature(
    plan: string,
    featureKey: string,
    enabled: boolean,
    numValue?: number | null,
  ) {
    if (!VALID_PLANS.includes(plan.toLowerCase())) {
      throw new BadRequestException('Plano inválido');
    }
    return this.planService.updateFeature(plan, featureKey, enabled, numValue);
  }

  // ── Stripe product/price management ────────────────────────────────

  async listStripeProducts() {
    return this.paymentService.listStripeProducts();
  }

  async syncStripePlans() {
    return this.paymentService.syncPlanProducts();
  }

  async createStripeProduct(dto: {
    name: string;
    description?: string;
    amount?: number;
    currency?: string;
    interval?: 'month' | 'year';
  }) {
    return this.paymentService.createStripeProduct(dto);
  }

  async addStripePrice(productId: string, dto: { amount: number; currency?: string; interval?: 'month' | 'year' }) {
    return this.paymentService.addStripePrice(productId, dto);
  }

  async updateStripeProduct(id: string, dto: { name?: string; description?: string; active?: boolean }) {
    return this.paymentService.updateStripeProduct(id, dto);
  }

  async archiveStripeProduct(id: string) {
    return this.paymentService.archiveStripeProduct(id);
  }
}
