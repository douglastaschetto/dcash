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
  | 'financial_challenges'
  | 'ofx_import';

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

const DEFAULT_FEATURE_SEEDS: Array<{
  plan: string;
  featureKey: string;
  enabled: boolean;
  label: string;
  description: string;
  numValue?: number | null;
}> = [
  {
    plan: 'free',
    featureKey: 'ofx_import',
    enabled: false,
    label: 'Importação de Extrato (OFX/CSV)',
    description:
      'Importar extratos bancários com sugestão automática de categoria via IA.',
  },
  {
    plan: 'basico',
    featureKey: 'ofx_import',
    enabled: false,
    label: 'Importação de Extrato (OFX/CSV)',
    description:
      'Importar extratos bancários com sugestão automática de categoria via IA.',
  },
  {
    plan: 'intermediario',
    featureKey: 'ofx_import',
    enabled: true,
    label: 'Importação de Extrato (OFX/CSV)',
    description:
      'Importar extratos bancários com sugestão automática de categoria via IA.',
  },
  {
    plan: 'pro',
    featureKey: 'ofx_import',
    enabled: true,
    label: 'Importação de Extrato (OFX/CSV)',
    description:
      'Importar extratos bancários com sugestão automática de categoria via IA.',
  },
  // ── Limites numéricos por plano — declarados no FeatureKey há tempo mas
  // nunca aplicados em nenhum lugar do código (ver auditoria). null = sem limite.
  {
    plan: 'free',
    featureKey: 'max_categories',
    enabled: true,
    numValue: 8,
    label: 'Limite de categorias',
    description: 'Quantidade máxima de categorias personalizadas.',
  },
  {
    plan: 'basico',
    featureKey: 'max_categories',
    enabled: true,
    numValue: 20,
    label: 'Limite de categorias',
    description: 'Quantidade máxima de categorias personalizadas.',
  },
  {
    plan: 'intermediario',
    featureKey: 'max_categories',
    enabled: true,
    numValue: 50,
    label: 'Limite de categorias',
    description: 'Quantidade máxima de categorias personalizadas.',
  },
  {
    plan: 'pro',
    featureKey: 'max_categories',
    enabled: true,
    numValue: null,
    label: 'Limite de categorias',
    description: 'Quantidade máxima de categorias personalizadas.',
  },

  {
    plan: 'free',
    featureKey: 'max_cards',
    enabled: true,
    numValue: 2,
    label: 'Limite de cartões/contas',
    description: 'Quantidade máxima de formas de pagamento cadastradas.',
  },
  {
    plan: 'basico',
    featureKey: 'max_cards',
    enabled: true,
    numValue: 5,
    label: 'Limite de cartões/contas',
    description: 'Quantidade máxima de formas de pagamento cadastradas.',
  },
  {
    plan: 'intermediario',
    featureKey: 'max_cards',
    enabled: true,
    numValue: 10,
    label: 'Limite de cartões/contas',
    description: 'Quantidade máxima de formas de pagamento cadastradas.',
  },
  {
    plan: 'pro',
    featureKey: 'max_cards',
    enabled: true,
    numValue: null,
    label: 'Limite de cartões/contas',
    description: 'Quantidade máxima de formas de pagamento cadastradas.',
  },

  {
    plan: 'free',
    featureKey: 'export_reports',
    enabled: false,
    label: 'Exportação de relatórios',
    description: 'Exportar transações em CSV.',
  },
  {
    plan: 'basico',
    featureKey: 'export_reports',
    enabled: true,
    label: 'Exportação de relatórios',
    description: 'Exportar transações em CSV.',
  },
  {
    plan: 'intermediario',
    featureKey: 'export_reports',
    enabled: true,
    label: 'Exportação de relatórios',
    description: 'Exportar transações em CSV.',
  },
  {
    plan: 'pro',
    featureKey: 'export_reports',
    enabled: true,
    label: 'Exportação de relatórios',
    description: 'Exportar transações em CSV.',
  },
];

@Injectable()
export class PlanService {
  private featureDefaultsSeeded = false;

  constructor(private readonly db: DatabaseService) {}

  /**
   * plan_features não tem seed/migration formal (é dado vivo no Postgres).
   * Garante que novas feature keys introduzidas em código existam para todos
   * os planos, sem sobrescrever nenhum valor já customizado via /admin.
   */
  private async ensureFeatureDefaults() {
    if (this.featureDefaultsSeeded) return;
    for (const seed of DEFAULT_FEATURE_SEEDS) {
      await this.db.query(
        `INSERT INTO db_dtasc.plan_features (plan, feature_key, enabled, num_value, label, description, updated_at)
         SELECT $1::text, $2::text, $3, $4::integer, $5, $6, NOW()
         WHERE NOT EXISTS (
           SELECT 1 FROM db_dtasc.plan_features WHERE plan = $1::text AND feature_key = $2::text
         )`,
        [
          seed.plan,
          seed.featureKey,
          seed.enabled,
          seed.numValue ?? null,
          seed.label,
          seed.description,
        ],
      );
    }
    this.featureDefaultsSeeded = true;
  }

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
    await this.ensureFeatureDefaults();
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

  /** Returns the numeric limit for a feature (e.g. max_categories), or null = unlimited. */
  async getNumericLimit(
    userId: string,
    featureKey: FeatureKey,
  ): Promise<number | null> {
    const plan = await this.getEffectivePlan(userId);
    const features = await this.getFeatures(plan);
    return features[featureKey]?.numValue ?? null;
  }

  /** Full user context: plan + all features. Used by frontend /plan/me endpoint. */
  async getUserPlanContext(userId: string) {
    const plan = await this.getEffectivePlan(userId);
    const features = await this.getFeatures(plan);
    return { plan, features };
  }

  async getAllPlanFeatures() {
    await this.ensureFeatureDefaults();
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
