import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FamilyScopeService } from '../common/scope/family-scope.service';
import { CreateFixedBillDto } from './dto/create-fixed-bill.dto';

// ── native date helpers (no date-fns needed) ────────────────────────
function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}
function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}
function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
// ────────────────────────────────────────────────────────────────────

@Injectable()
export class FixedBillsService {
  private readonly logger = new Logger(FixedBillsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly familyScope: FamilyScopeService,
  ) {}

  private async getScope(userId: string, paramIndex = 1) {
    const scope = await this.familyScope.getScope(userId);
    return { ...scope, filter: this.familyScope.filterAt(scope, paramIndex) };
  }

  /* ── findAll (monthly view) ──────────────────────────────────────── */
  async findAll(userId: string, month?: number, year?: number) {
    try {
      const targetMonth = month ? month - 1 : new Date().getMonth();
      const targetYear = year || new Date().getFullYear();
      const start = startOfMonth(new Date(targetYear, targetMonth));
      const end = endOfMonth(new Date(targetYear, targetMonth));

      // scope for transaction query ($3)
      const scope = await this.getScope(userId, 3);

      // 1. Transactions linked to fixed-bill rules
      const transSql = `
        SELECT
          t.id,
          t.description AS "title",
          t.amount      AS "value",
          EXTRACT(DAY FROM t.date)::int AS "dayOfMonth",
          t.fixed_bill_id AS "fixedBillId",
          t.is_paid       AS "isPaid",
          'transaction'   AS "type"
        FROM db_dtasc.transactions t
        WHERE t.fixed_bill_id IS NOT NULL
          AND t.payment_method_type != 'CREDIT_CARD'
          AND t.date >= $1 AND t.date <= $2
          AND t.${scope.filter}
      `;
      const transactions = await this.db.query(transSql, [start, end, scope.param]);

      // 2. Aggregation rules (no individual transactions generated)
      const scopeAgg = await this.getScope(userId, 1);
      const aggSql = `
        SELECT
          fb.id,
          fb.description AS "title",
          fb.amount      AS "value",
          fb.day_of_month AS "dayOfMonth",
          fb.id           AS "fixedBillId",
          false           AS "isPaid",
          'aggregation'   AS "type"
        FROM db_dtasc.fixed_bills fb
        WHERE fb.generate_transactions = false
          AND fb.payment_method_type != 'CREDIT_CARD'
          AND fb.${scopeAgg.filter}
      `;
      const aggregations = await this.db.query(aggSql, [scopeAgg.param]);

      // 3. Credit-card grouped bills
      const scopeCard = await this.getScope(userId, 3);
      const cardFilter = scopeCard.filter
        .replace(/\buser_id\b/g, 'fb.user_id')
        .replace(/\bfamily_group_id\b/g, 'fb.family_group_id');
      const cardSql = `
        SELECT
          fb.id            AS "fixedBillId",
          fb.description   AS "title",
          fb.payment_method_id AS "paymentMethodId",
          fb.due_day,
          COALESCE(SUM(t.amount), 0) AS "total"
        FROM db_dtasc.fixed_bills fb
        LEFT JOIN db_dtasc.transactions t
          ON t.payment_method_id = fb.payment_method_id
          AND t.payment_method_type = 'CREDIT_CARD'
          AND t.date >= $1 AND t.date <= $2
        WHERE fb.payment_method_type = 'CREDIT_CARD'
          AND ${cardFilter}
        GROUP BY fb.id, fb.description, fb.payment_method_id, fb.due_day
      `;
      const cardGroups = await this.db.query(cardSql, [start, end, scopeCard.param]);

      const cardBills = cardGroups.map((g: any) => ({
        id: `card-${g.paymentMethodId}-${g.fixedBillId}`,
        fixedBillId: g.fixedBillId,
        title: g.title ? `Fatura: ${g.title}` : 'Fatura Cartão',
        value: Number(g.total),
        dayOfMonth: g.due_day || 10,
        isPaid: false,
        type: 'card',
      }));

      const existingRuleIds = new Set(transactions.map((t: any) => t.fixedBillId));
      const results = [
        ...transactions.map((t: any) => ({ ...t, value: Number(t.value) })),
        ...aggregations
          .filter((a: any) => !existingRuleIds.has(a.fixedBillId))
          .map((a: any) => ({ ...a, value: Number(a.value) })),
        ...cardBills,
      ];

      return results.sort((a: any, b: any) => a.dayOfMonth - b.dayOfMonth);
    } catch (error: any) {
      this.logger.error(`findAll error: ${error.message}`);
      throw new InternalServerErrorException('Erro ao processar contas fixas.');
    }
  }

  /* ── findAllSimple (for selects) ─────────────────────────────────── */
  async findAllSimple(userId: string) {
    const scope = await this.getScope(userId, 1);
    return this.db.query(
      `SELECT id, description AS title, amount AS value
       FROM db_dtasc.fixed_bills WHERE ${scope.filter} ORDER BY description ASC`,
      [scope.param],
    );
  }

  /* ── create ──────────────────────────────────────────────────────── */
  async create(userId: string, dto: CreateFixedBillDto) {
    const scope = await this.getScope(userId, 1);
    let categoryId = dto.categoryId;

    if (!categoryId) {
      const catRes = await this.db.query(
        `SELECT id FROM db_dtasc.category WHERE ${scope.filter} LIMIT 1`,
        [scope.param],
      );
      if (catRes.length === 0) throw new BadRequestException('Crie uma categoria primeiro.');
      categoryId = catRes[0].id;
    }

    const billRes = await this.db.query(
      `INSERT INTO db_dtasc.fixed_bills
         (description, amount, day_of_month, due_day, category_id,
          payment_method_type, payment_method_id, user_id, family_group_id,
          is_paid, generate_transactions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10)
       RETURNING *`,
      [
        dto.description,
        dto.amount,
        dto.dayOfMonth,
        dto.dayOfMonth,
        categoryId,
        dto.paymentMethodType || 'OTHER',
        dto.paymentMethodId || null,
        userId,
        scope.familyGroupId || null,
        dto.generateTransactions ?? true,
      ],
    );
    const rule = billRes[0];

    if (dto.generateTransactions !== false) {
      const startDate = new Date();
      const limitDate = dto.endDate ? new Date(dto.endDate) : addMonths(startDate, 11);
      let iter = new Date(startDate);

      while (iter <= limitDate || isSameMonth(iter, limitDate)) {
        const dueDate = new Date(iter.getFullYear(), iter.getMonth(), Number(dto.dayOfMonth));
        await this.db.query(
          `INSERT INTO db_dtasc.transactions
             (description, amount, type, date, user_id, family_group_id,
              category_id, fixed_bill_id, is_paid, payment_method_type, payment_method_id)
           VALUES ($1, $2, 'EXPENSE', $3, $4, $5, $6, $7, false, $8, $9)`,
          [
            rule.description,
            dto.amount,
            dueDate,
            userId,
            scope.familyGroupId || null,
            categoryId,
            rule.id,
            rule.payment_method_type,
            rule.payment_method_id,
          ],
        );
        iter = addMonths(iter, 1);
      }
    }
    return rule;
  }

  /* ── update (edits a specific transaction occurrence) ────────────── */
  async update(userId: string, id: string, dto: Partial<CreateFixedBillDto>) {
    // $1–$5 SET params, $6 = id, $7 = scope.param
    const scope = await this.getScope(userId, 6);
    const scopeFilter = scope.filter.replace('$6', '$7');
    const sql = `
      UPDATE db_dtasc.transactions
      SET description          = COALESCE($1, description),
          amount               = COALESCE($2, amount),
          payment_method_type  = COALESCE($3, payment_method_type),
          payment_method_id    = $4,
          category_id          = COALESCE($5, category_id)
      WHERE id = $6 AND ${scopeFilter}
      RETURNING *
    `;
    const res = await this.db.query(sql, [
      dto.description ?? null,
      dto.amount ?? null,
      dto.paymentMethodType ?? null,
      dto.paymentMethodId ?? null,
      dto.categoryId ?? null,
      id,
      scope.param,
    ]);
    if (res.length === 0) throw new NotFoundException('Lançamento não encontrado.');
    return res[0];
  }

  /* ── remove (deletes rule + all unpaid future transactions) ─────── */
  async remove(userId: string, fixedBillId: string) {
    const scope = await this.getScope(userId, 2);
    await this.db.query(
      `DELETE FROM db_dtasc.transactions
       WHERE fixed_bill_id = $1 AND is_paid = false AND ${scope.filter}`,
      [fixedBillId, scope.param],
    );
    const res = await this.db.query(
      `DELETE FROM db_dtasc.fixed_bills WHERE id = $1 AND ${scope.filter} RETURNING id`,
      [fixedBillId, scope.param],
    );
    if (res.length === 0) throw new NotFoundException('Conta fixa não encontrada.');
    return { success: true };
  }
}
