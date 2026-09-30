import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { PlanService } from '../plan/plan.service';
import { FamilyScopeService } from '../common/scope/family-scope.service';

const MARKET_URL = process.env.MARKET_SERVICE_URL || 'http://127.0.0.1:8000';

@Injectable()
export class InvestmentsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly planService: PlanService,
    private readonly familyScope: FamilyScopeService,
  ) {}

  /* ── Plan gate ─────────────────────────────────────────────── */
  async assertPro(userId: string) {
    const plan = await this.planService.getEffectivePlan(userId);
    if (plan.toLowerCase() !== 'pro') {
      throw new ForbiddenException(
        'Módulo de investimentos disponível apenas no plano Pro.',
      );
    }
  }

  /* ── Market proxy ──────────────────────────────────────────── */
  private async market<T = any>(path: string): Promise<T> {
    const res = await fetch(`${MARKET_URL}${path}`);
    if (!res.ok) throw new Error(`Market service: ${res.status}`);
    return res.json() as T;
  }

  getStockDashboard(ticker: string) {
    return this.market(`/stock/${ticker}/dashboard`);
  }

  getStockHistory(ticker: string, period = '12mo') {
    return this.market(
      `/stock/${ticker}/history?period=${encodeURIComponent(period)}`,
    );
  }

  getStockDividends(ticker: string) {
    return this.market(`/stock/${ticker}/dividends`);
  }

  getStockDividendMap(ticker: string) {
    return this.market(`/stock/${ticker}/dividends/map`);
  }

  /* ── Portfolio ─────────────────────────────────────────────── */
  async getPortfolio(userId: string) {
    const scope = await this.familyScope.getScope(userId);
    return this.db.query(
      `SELECT id, ticker, company_name AS "companyName",
              quantity, avg_price AS "avgPrice",
              target_buy AS "targetBuy", target_sell AS "targetSell",
              notes, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM db_dtasc.investments
       WHERE ${scope.filter}
       ORDER BY ticker ASC`,
      [scope.param],
    );
  }

  async upsertPortfolioItem(
    userId: string,
    data: {
      ticker: string;
      companyName?: string;
      quantity?: number;
      avgPrice?: number;
      targetBuy?: number | null;
      targetSell?: number | null;
      notes?: string;
    },
  ) {
    const scope = await this.familyScope.getScope(userId);
    const ticker = data.ticker.toUpperCase().trim();
    const rows = await this.db.query(
      `INSERT INTO db_dtasc.investments
         (id, user_id, family_group_id, ticker, company_name, quantity, avg_price, target_buy, target_sell, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (user_id, ticker) DO UPDATE
         SET company_name = COALESCE(EXCLUDED.company_name, db_dtasc.investments.company_name),
             quantity     = EXCLUDED.quantity,
             avg_price    = EXCLUDED.avg_price,
             target_buy   = EXCLUDED.target_buy,
             target_sell  = EXCLUDED.target_sell,
             notes        = EXCLUDED.notes,
             updated_at   = NOW()
       RETURNING id, ticker, company_name AS "companyName",
                 quantity, avg_price AS "avgPrice",
                 target_buy AS "targetBuy", target_sell AS "targetSell", notes`,
      [
        randomUUID(),
        userId,
        scope.familyGroupId,
        ticker,
        data.companyName ?? null,
        data.quantity ?? 0,
        data.avgPrice ?? 0,
        data.targetBuy ?? null,
        data.targetSell ?? null,
        data.notes ?? null,
      ],
    );
    return rows[0];
  }

  async updatePortfolioItem(userId: string, id: string, data: any) {
    const scope = await this.familyScope.getScope(userId);
    const rows = await this.db.query(
      `UPDATE db_dtasc.investments
       SET company_name = COALESCE($3, company_name),
           quantity     = COALESCE($4::decimal, quantity),
           avg_price    = COALESCE($5::decimal, avg_price),
           target_buy   = $6,
           target_sell  = $7,
           notes        = $8,
           updated_at   = NOW()
       WHERE id = $1 AND ${this.familyScope.filterAt(scope, 2)}
       RETURNING id, ticker, company_name AS "companyName",
                 quantity, avg_price AS "avgPrice",
                 target_buy AS "targetBuy", target_sell AS "targetSell", notes`,
      [
        id,
        scope.param,
        data.companyName ?? null,
        data.quantity ?? null,
        data.avgPrice ?? null,
        data.targetBuy ?? null,
        data.targetSell ?? null,
        data.notes ?? null,
      ],
    );
    if (!rows[0]) throw new NotFoundException('Item não encontrado.');
    return rows[0];
  }

  async removePortfolioItem(userId: string, id: string) {
    const scope = await this.familyScope.getScope(userId);
    await this.db.query(
      `DELETE FROM db_dtasc.investments WHERE id = $1 AND ${this.familyScope.filterAt(scope, 2)}`,
      [id, scope.param],
    );
    return { success: true };
  }

  /* ── Alerts ────────────────────────────────────────────────── */
  async getAlerts(userId: string) {
    const scope = await this.familyScope.getScope(userId);
    return this.db.query(
      `SELECT id, ticker, target_price AS "targetPrice", direction,
              message, is_active AS "isActive",
              triggered_at AS "triggeredAt", created_at AS "createdAt"
       FROM db_dtasc.investment_alerts
       WHERE ${scope.filter}
       ORDER BY created_at DESC`,
      [scope.param],
    );
  }

  async createAlert(
    userId: string,
    data: {
      ticker: string;
      targetPrice: number;
      direction: 'above' | 'below';
      message?: string;
    },
  ) {
    const scope = await this.familyScope.getScope(userId);
    const rows = await this.db.query(
      `INSERT INTO db_dtasc.investment_alerts
         (id, user_id, family_group_id, ticker, target_price, direction, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, ticker, target_price AS "targetPrice", direction,
                 message, is_active AS "isActive", created_at AS "createdAt"`,
      [
        randomUUID(),
        userId,
        scope.familyGroupId,
        data.ticker.toUpperCase(),
        data.targetPrice,
        data.direction,
        data.message ?? null,
      ],
    );
    return rows[0];
  }

  async toggleAlert(userId: string, id: string) {
    const scope = await this.familyScope.getScope(userId);
    const rows = await this.db.query(
      `UPDATE db_dtasc.investment_alerts
       SET is_active = NOT is_active
       WHERE id = $1 AND ${this.familyScope.filterAt(scope, 2)}
       RETURNING id, is_active AS "isActive"`,
      [id, scope.param],
    );
    if (!rows[0]) throw new NotFoundException('Alerta não encontrado.');
    return rows[0];
  }

  async deleteAlert(userId: string, id: string) {
    const scope = await this.familyScope.getScope(userId);
    await this.db.query(
      `DELETE FROM db_dtasc.investment_alerts WHERE id = $1 AND ${this.familyScope.filterAt(scope, 2)}`,
      [id, scope.param],
    );
    return { success: true };
  }

  /* ── Alert checker (call from cron / webhook) ──────────────── */
  async checkAlerts() {
    const alerts = await this.db.query(
      `SELECT a.id, a.user_id, a.ticker, a.target_price, a.direction, a.message,
              u.name AS "userName"
       FROM db_dtasc.investment_alerts a
       JOIN db_dtasc.users u ON u.id = a.user_id
       WHERE a.is_active = true AND a.triggered_at IS NULL`,
      [],
    );

    const byTicker: Record<string, typeof alerts> = {};
    for (const a of alerts) {
      if (!byTicker[a.ticker]) byTicker[a.ticker] = [];
      byTicker[a.ticker].push(a);
    }

    const fired: string[] = [];
    for (const [ticker, group] of Object.entries(byTicker)) {
      try {
        const data: any = await this.market(`/stock/${ticker}/dashboard`);
        const price: number = data?.indicators?.current_price;
        if (!price) continue;

        for (const alert of group) {
          const hit =
            (alert.direction === 'above' &&
              price >= Number(alert.target_price)) ||
            (alert.direction === 'below' &&
              price <= Number(alert.target_price));

          if (hit) {
            await this.db.query(
              `UPDATE db_dtasc.investment_alerts
               SET triggered_at = NOW(), is_active = false
               WHERE id = $1`,
              [alert.id],
            );
            fired.push(alert.id);
          }
        }
      } catch {}
    }

    return { checked: alerts.length, fired: fired.length, firedIds: fired };
  }
}
