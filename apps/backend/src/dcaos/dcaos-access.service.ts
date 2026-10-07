import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export const DCAOS_ADDON = 'dcaos';

/** Monthly price in BRL; yearly gets the same 20% discount as DCash plans. */
export const DCAOS_PRICE = {
  monthly: 12.9,
  yearlyDiscount: 0.8,
  label: 'DCaos · Gestão do caos familiar',
};

export type AddonStatus = {
  hasAccess: boolean;
  source: 'subscription' | 'admin' | null;
  status: string | null;
  billingCycle: string | null;
  expiresAt: string | null;
  purchasedBy: string | null;
  isPurchaser: boolean;
};

/**
 * DCaos is billed as an add-on, independent of the DCash plan. A single
 * active subscription covers the whole family group (or just the buyer when
 * they have no family). Admins always have access, so the module can be
 * operated/tested without a Stripe purchase.
 */
@Injectable()
export class DcaosAccessService {
  constructor(private readonly db: DatabaseService) {}

  async getStatus(userId: string): Promise<AddonStatus> {
    const [user] = await this.db.query<{
      family_group_id: string | null;
      is_admin: boolean;
    }>(`SELECT family_group_id, is_admin FROM db_dtasc.users WHERE id = $1`, [
      userId,
    ]);
    const familyGroupId = user?.family_group_id ?? null;

    const [sub] = await this.db.query<{
      user_id: string;
      status: string;
      billing_cycle: string | null;
      expires_at: Date | null;
    }>(
      `SELECT user_id, status, billing_cycle, expires_at
       FROM db_dtasc.addon_subscriptions
       WHERE addon = $1
         AND status IN ('active', 'past_due', 'canceling')
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (${familyGroupId ? 'family_group_id = $2' : 'user_id = $2 AND family_group_id IS NULL'})
       ORDER BY expires_at DESC NULLS FIRST
       LIMIT 1`,
      [DCAOS_ADDON, familyGroupId ?? userId],
    );

    if (sub) {
      return {
        hasAccess: true,
        source: 'subscription',
        status: sub.status,
        billingCycle: sub.billing_cycle,
        expiresAt: sub.expires_at
          ? new Date(sub.expires_at).toISOString()
          : null,
        purchasedBy: sub.user_id,
        isPurchaser: sub.user_id === userId,
      };
    }

    return {
      hasAccess: !!user?.is_admin,
      source: user?.is_admin ? 'admin' : null,
      status: null,
      billingCycle: null,
      expiresAt: null,
      purchasedBy: null,
      isPurchaser: false,
    };
  }

  async hasAccess(userId: string): Promise<boolean> {
    return (await this.getStatus(userId)).hasAccess;
  }
}

/** Route guard for every DCaos feature endpoint (must run after JwtAuthGuard). */
@Injectable()
export class DcaosGuard implements CanActivate {
  constructor(private readonly access: DcaosAccessService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.id;
    if (userId && (await this.access.hasAccess(userId))) return true;
    throw new ForbiddenException({
      code: 'DCAOS_ADDON_REQUIRED',
      message: 'Contrate o DCaos para usar este recurso.',
    });
  }
}
