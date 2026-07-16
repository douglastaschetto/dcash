import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export type FeatureKey =
  | 'trial_days'
  | 'max_categories'
  | 'max_cards'
  | 'fixed_bills'
  | 'export_reports'
  | 'family_group'
  | 'dreams_goals'
  | 'whatsapp_alerts'
  | 'google_calendar'
  | 'financial_challenges';

export interface FeatureValue {
  enabled: boolean;
  numValue: number | null;
  label: string;
  description: string | null;
}

export type PlanFeatureMap = Record<string, FeatureValue>;

const PLAN_ORDER = ['free', 'basico', 'intermediario', 'pro'];

function higherPlan(a: string, b: string): string {
  const ai = PLAN_ORDER.indexOf(a.toLowerCase());
  const bi = PLAN_ORDER.indexOf(b.toLowerCase());
  return bi > ai ? b.toLowerCase() : a.toLowerCase();
}

@Injectable()
export class PlanService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Resolves the effective plan for a user.
   * If the user is in a family, returns the higher of: own plan vs family owner's plan.
   */
  async getEffectivePlan(userId: string): Promise<string> {
    const res = await this.db.query(
      `SELECT u.plan,
              u.family_group_id,
              fg.owner_id,
              owner.plan AS owner_plan
       FROM db_dtasc.users u
       LEFT JOIN db_dtasc.family_groups fg ON fg.id = u.family_group_id
       LEFT JOIN db_dtasc.users owner ON owner.id = fg.owner_id
       WHERE u.id = $1`,
      [userId],
    );
    const row = res[0];
    if (!row) return 'free';

    const ownPlan = (row.plan ?? 'free').toLowerCase();
    if (row.family_group_id && row.owner_plan) {
      return higherPlan(ownPlan, row.owner_plan);
    }
    return ownPlan;
  }

  async getFeatures(plan: string): Promise<PlanFeatureMap> {
    const rows = await this.db.query(
      `SELECT feature_key AS "featureKey", enabled, num_value AS "numValue", label, description
       FROM db_dtasc.plan_features WHERE plan = $1`,
      [plan.toLowerCase()],
    );
    const map: PlanFeatureMap = {};
    for (const row of rows) {
      map[row.featureKey] = {
        enabled: row.enabled,
        numValue: row.numValue,
        label: row.label,
        description: row.description,
      };
    }
    return map;
  }

  async hasFeature(userId: string, featureKey: FeatureKey): Promise<boolean> {
    const plan = await this.getEffectivePlan(userId);
    const features = await this.getFeatures(plan);
    return features[featureKey]?.enabled ?? false;
  }

  /** Full user context: plan + all features. Used by frontend /plan/me endpoint. */
  async getUserPlanContext(userId: string) {
    const plan = await this.getEffectivePlan(userId);
    const features = await this.getFeatures(plan);
    return { plan, features };
  }

  async getAllPlanFeatures() {
    return this.db.query(
      `SELECT plan, feature_key AS "featureKey", enabled,
              num_value AS "numValue", label, description, updated_at AS "updatedAt"
       FROM db_dtasc.plan_features
       ORDER BY
         CASE plan WHEN 'free' THEN 1 WHEN 'basico' THEN 2 WHEN 'intermediario' THEN 3 WHEN 'pro' THEN 4 END,
         feature_key`,
      [],
    );
  }

  async updateFeature(
    plan: string,
    featureKey: string,
    enabled: boolean,
    numValue?: number | null,
  ) {
    await this.db.query(
      `UPDATE db_dtasc.plan_features
       SET enabled = $1, num_value = $2, updated_at = NOW()
       WHERE plan = $3 AND feature_key = $4`,
      [enabled, numValue ?? null, plan.toLowerCase(), featureKey],
    );
    return { success: true };
  }
}
