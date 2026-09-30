import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FamilyScopeService } from '../common/scope/family-scope.service';
import { UpsertCategoryLimitDto } from './dto/upsert-category-limit.dto';

const S = 'db_dtasc';

@Injectable()
export class CategoryLimitsService {
  private readonly logger = new Logger(CategoryLimitsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly familyScope: FamilyScopeService,
  ) {}

  private async getScope(userId: string, paramIndex: number) {
    const scope = await this.familyScope.getScope(userId);
    return { ...scope, filter: this.familyScope.filterAt(scope, paramIndex) };
  }

  async getDashboard(userId: string, month: number, year: number) {
    try {
      const scopeMain = await this.getScope(userId, 1);
      const scopeSpent = await this.getScope(userId, 6);

      const startDate = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

      const sql = `
        SELECT
          cl.id,
          cl.amount,
          cl.month,
          cl.year,
          cl.category_id AS "categoryId",
          json_build_object(
            'id', c.id,
            'name', c.name,
            'color', c.color,
            'icon', c.icon
          ) AS category,
          COALESCE((
            SELECT SUM(t.amount)
            FROM ${S}.transactions t
            WHERE t.category_id = cl.category_id
              AND t.type = 'EXPENSE'
              AND t.date BETWEEN $2 AND $3
              AND t.${scopeSpent.filter}
          ), 0) AS spent
        FROM ${S}.category_limit cl
        INNER JOIN ${S}.category c ON cl.category_id = c.id
        WHERE cl.month = $4 AND cl.year = $5 AND cl.${scopeMain.filter}
      `;

      const limits = await this.db.query(sql, [
        scopeMain.param,
        startDate,
        endDate,
        Number(month),
        Number(year),
        scopeSpent.param,
      ]);

      return limits.map((l) => ({
        ...l,
        amount: Number(l.amount),
        spent: Number(l.spent),
        percent: l.amount > 0 ? (Number(l.spent) / Number(l.amount)) * 100 : 0,
      }));
    } catch (error) {
      this.logger.error(
        'getDashboard error',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Falha ao carregar planejamento.');
    }
  }

  async getHistoricalSpending(userId: string, month: number, year: number) {
    try {
      const scope = await this.getScope(userId, 3);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')} 23:59:59`;

      const sql = `
        SELECT c.id AS "categoryId", COALESCE(SUM(t.amount), 0) AS spent
        FROM ${S}.category c
        LEFT JOIN ${S}.transactions t ON t.category_id = c.id
          AND t.type = 'EXPENSE'
          AND t.date BETWEEN $1 AND $2
          AND t.${scope.filter}
        GROUP BY c.id
        HAVING COALESCE(SUM(t.amount), 0) > 0
        ORDER BY spent DESC
      `;

      const result = await this.db.query(sql, [
        startDate,
        endDate,
        scope.param,
      ]);
      return result.map((row: any) => ({
        categoryId: row.categoryId,
        spent: Number(row.spent),
      }));
    } catch (error) {
      this.logger.error(
        'getHistoricalSpending error',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Falha ao carregar histórico.');
    }
  }

  async upsertLimit(userId: string, data: UpsertCategoryLimitDto) {
    const scope = await this.getScope(userId, 4);

    const existing = await this.db.query(
      `SELECT id FROM ${S}.category_limit
       WHERE category_id = $1 AND month = $2 AND year = $3 AND ${scope.filter}`,
      [data.categoryId, Number(data.month), Number(data.year), scope.param],
    );

    if (existing.length > 0) {
      const updated = await this.db.query(
        `UPDATE ${S}.category_limit SET amount = $1 WHERE id = $2 RETURNING *`,
        [data.amount, existing[0].id],
      );
      return updated[0];
    }

    const inserted = await this.db.query(
      `INSERT INTO ${S}.category_limit (amount, month, year, category_id, user_id, family_group_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        data.amount,
        Number(data.month),
        Number(data.year),
        data.categoryId,
        userId,
        scope.familyGroupId ?? null,
      ],
    );
    return inserted[0];
  }

  async remove(id: string, userId: string) {
    const scope = await this.getScope(userId, 2);
    const result = await this.db.query(
      `DELETE FROM ${S}.category_limit WHERE id = $1 AND ${scope.filter} RETURNING id`,
      [id, scope.param],
    );
    if (result.length === 0)
      throw new NotFoundException('Limite não encontrado.');
    return { success: true };
  }

  async getYearlyStatus(userId: string, year: number) {
    const scope = await this.getScope(userId, 1);

    const sql = `
      SELECT
        m.month,
        EXISTS (
          SELECT 1 FROM ${S}.category_limit cl
          WHERE cl.month = m.month AND cl.year = $2 AND cl.${scope.filter}
        ) AS "hasPlanning",
        COALESCE((
          SELECT SUM(cl2.amount) FROM ${S}.category_limit cl2
          WHERE cl2.month = m.month AND cl2.year = $2 AND cl2.${scope.filter}
        ), 0) AS "totalPlanned",
        COALESCE((
          SELECT SUM(t.amount) FROM ${S}.transactions t
          WHERE t.type = 'EXPENSE'
            AND t.date >= make_date($2::int, m.month, 1)
            AND t.date <  make_date($2::int, m.month, 1) + interval '1 month'
            AND t.${scope.filter}
            AND t.category_id IN (
              SELECT cl3.category_id FROM ${S}.category_limit cl3
              WHERE cl3.month = m.month AND cl3.year = $2 AND cl3.${scope.filter}
            )
        ), 0) AS "totalSpent"
      FROM (SELECT generate_series(1,12) AS month) m
    `;

    const result = await this.db.query(sql, [scope.param, Number(year)]);
    return result.map((row) => {
      const totalPlanned = Number(row.totalPlanned);
      const totalSpent = Number(row.totalSpent);
      return {
        month: Number(row.month),
        hasPlanning: row.hasPlanning,
        totalPlanned,
        totalSpent,
        percent: totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : 0,
      };
    });
  }
}
