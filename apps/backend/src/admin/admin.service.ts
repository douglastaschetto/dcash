import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PlanService } from '../plan/plan.service';

const VALID_PLANS = ['free', 'basico', 'intermediario', 'pro'];

@Injectable()
export class AdminService {
  constructor(
    private readonly db: DatabaseService,
    private readonly planService: PlanService,
  ) {}

  async verifyAdmin(userId: string): Promise<void> {
    const res = await this.db.query(
      'SELECT is_admin FROM db_dtasc.users WHERE id = $1',
      [userId],
    );
    if (!res[0]?.is_admin) throw new ForbiddenException('Acesso restrito a administradores.');
  }

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
         owner.plan AS "familyOwnerPlan"
       FROM db_dtasc.users u
       LEFT JOIN db_dtasc.family_groups fg ON fg.id = u.family_group_id
       LEFT JOIN db_dtasc.users owner ON owner.id = fg.owner_id
       ORDER BY u.created_at DESC`,
      [],
    );
  }

  async updateUserPlan(targetUserId: string, plan: string) {
    if (!VALID_PLANS.includes(plan.toLowerCase())) {
      throw new BadRequestException('Plano inválido');
    }
    await this.db.query(
      'UPDATE db_dtasc.users SET plan = $1 WHERE id = $2',
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
}
