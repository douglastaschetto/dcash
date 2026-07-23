import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { DatabaseService } from '../database/database.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { createHash, randomUUID } from 'crypto';
import { PlanService } from '../plan/plan.service';
import { CategoriesService } from '../categories/categories.service';

export interface StagingResult {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  import_hash: string;
  status: string;
  is_duplicate: boolean;
}

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly planService: PlanService,
    private readonly categoriesService: CategoriesService,
  ) {
    this.genAI = new GoogleGenerativeAI(this.config.get<string>('GEMINI_API_KEY') ?? '');
    this.modelName = this.config.get<string>('GEMINI_MODEL_NAME') || 'gemini-2.5-flash';
  }

  /** Importação de extrato (OFX/CSV) é recurso do plano Intermediário para cima. */
  private async assertOfxImportAllowed(userId: string) {
    const allowed = await this.planService.hasFeature(userId, 'ofx_import');
    if (!allowed) {
      throw new ForbiddenException('Importação de extrato disponível a partir do plano Intermediário.');
    }
  }

  // ─── Scope helper ───────────────────────────────────────────────────────────

  private async getScope(userId: string) {
    const res = await this.db.query(
      'SELECT family_group_id FROM db_dtasc.users WHERE id = $1',
      [userId],
    );
    const familyGroupId = res[0]?.family_group_id;
    return {
      familyGroupId,
      filter: familyGroupId
        ? 'family_group_id = $1'
        : 'user_id = $1 AND family_group_id IS NULL',
      param: familyGroupId || userId,
    };
  }

  private generateHash(data: {
    date: string;
    amount: number;
    description: string;
    userId: string;
  }): string {
    const fp = `${data.date}|${Number(data.amount).toFixed(2)}|${data.description.toLowerCase().trim()}|${data.userId}`;
    return createHash('sha256').update(fp).digest('hex');
  }

  // ─── Queries ────────────────────────────────────────────────────────────────

  async findAll(userId: string) {
    const scope = await this.getScope(userId);
    const sql = `
      SELECT
        t.id, t.description, t.amount, t.type, t.date,
        t.is_paid              AS "isPaid",
        t.installment_group    AS "installmentGroup",
        t.total_installments   AS "totalInstallments",
        t.installment_number   AS "installmentNumber",
        t.payment_method_type  AS "paymentMethodType",
        t.fixed_bill_id        AS "fixedBillId",
        t.piggy_bank_id        AS "piggyBankId",
        t.user_id              AS "userId",
        t.family_group_id      AS "familyGroupId",
        json_build_object('id', c.id, 'name', c.name, 'color', c.color) AS category,
        json_build_object('id', pm.id, 'name', pm.name, 'type', pm.type) AS "paymentMethod",
        json_build_object('id', pb.id, 'name', pb.name) AS "piggyBank"
      FROM db_dtasc.transactions t
      LEFT JOIN db_dtasc.category c ON t.category_id = c.id
      LEFT JOIN db_dtasc.payment_method pm ON t.payment_method_id = pm.id
      LEFT JOIN db_dtasc.piggy_bank pb ON t.piggy_bank_id = pb.id
      WHERE t.${scope.filter}
      ORDER BY t.date DESC
    `;
    return this.db.query(sql, [scope.param]);
  }

  async getInstallmentsReport(userId: string) {
    const scope = await this.getScope(userId);
    const sql = `
      SELECT
        t.id, t.description, t.amount, t.type, t.date,
        t.is_paid              AS "isPaid",
        t.installment_group    AS "installmentGroup",
        t.total_installments   AS "totalInstallments",
        t.installment_number   AS "installmentNumber",
        t.payment_method_type  AS "paymentMethodType",
        t.fixed_bill_id        AS "fixedBillId",
        t.piggy_bank_id        AS "piggyBankId",
        json_build_object('name', u.name) AS "user"
      FROM db_dtasc.transactions t
      LEFT JOIN db_dtasc.category c ON t.category_id = c.id
      LEFT JOIN db_dtasc.users u ON t.user_id = u.id
      WHERE t.${scope.filter}
        AND t.installment_group IS NOT NULL
        AND t.type = 'EXPENSE'
      ORDER BY t.date ASC
    `;
    return this.db.query(sql, [scope.param]);
  }

  async getMonthlySummary(userId: string, month: number, year: number) {
    const scope = await this.getScope(userId);
    const start = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
    const end = new Date(year, month, 0, 23, 59, 59).toISOString();

    const totals = await this.db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'INCOME'  THEN amount ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS expense,
         COALESCE(SUM(CASE WHEN type = 'INVESTMENT' THEN amount ELSE 0 END), 0) AS invested
       FROM db_dtasc.transactions t
       WHERE t.date BETWEEN $1 AND $2 AND t.${scope.filter.replace('$1', '$3')}`,
      [start, end, scope.param],
    );

    const topCategories = await this.db.query(
      `SELECT c.name AS category, SUM(t.amount) AS total
       FROM db_dtasc.transactions t
       LEFT JOIN db_dtasc.category c ON t.category_id = c.id
       WHERE t.type = 'EXPENSE' AND t.date BETWEEN $1 AND $2 AND t.${scope.filter.replace('$1', '$3')}
       GROUP BY c.name
       ORDER BY total DESC
       LIMIT 8`,
      [start, end, scope.param],
    );

    const income = Number(totals[0]?.income ?? 0);
    const expense = Number(totals[0]?.expense ?? 0);
    const invested = Number(totals[0]?.invested ?? 0);

    return {
      month,
      year,
      income,
      expense,
      invested,
      balance: income - expense,
      topCategories: topCategories.map((c) => ({ category: c.category ?? 'Sem categoria', total: Number(c.total) })),
    };
  }

  async getTransactionsFiltered(
    userId: string,
    filters: { from?: string; to?: string; type?: string; limit?: number },
  ) {
    const scope = await this.getScope(userId);
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    const from = filters.from || defaultFrom;
    const to = filters.to || defaultTo;
    const limit = Math.min(Math.max(Number(filters.limit) || 30, 1), 50);

    const params: any[] = [from, to];
    let typeClause = '';
    if (filters.type) {
      params.push(filters.type.toUpperCase());
      typeClause = `AND t.type = $${params.length}`;
    }
    params.push(scope.param);
    const scopeClause = scope.filter.replace('$1', `$${params.length}`);
    params.push(limit);

    const sql = `
      SELECT
        t.description, t.amount, t.type, t.date,
        t.is_paid AS "isPaid",
        c.name AS category
      FROM db_dtasc.transactions t
      LEFT JOIN db_dtasc.category c ON t.category_id = c.id
      WHERE t.date BETWEEN $1 AND $2 ${typeClause} AND t.${scopeClause}
      ORDER BY t.date DESC
      LIMIT $${params.length}
    `;
    return this.db.query(sql, params);
  }

  // ─── Create ─────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateTransactionDto) {
    const scope = await this.getScope(userId);

    if (dto.piggyBankId) {
      return this.handlePiggyBank(userId, scope.familyGroupId, dto);
    }

    const count = Number(dto.installments || dto.totalInstallments || 1);
    if (count > 1 && dto.type === 'EXPENSE') {
      return this.handleInstallments(userId, scope.familyGroupId, dto, count);
    }

    const sql = `
      INSERT INTO db_dtasc.transactions
        (description, amount, type, date, user_id, family_group_id,
         category_id, payment_method_id, payment_method_type, fixed_bill_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *,
        is_paid             AS "isPaid",
        installment_group   AS "installmentGroup",
        total_installments  AS "totalInstallments",
        installment_number  AS "installmentNumber",
        payment_method_type AS "paymentMethodType",
        fixed_bill_id       AS "fixedBillId",
        piggy_bank_id       AS "piggyBankId"
    `;
    const res = await this.db.query(sql, [
      dto.description,
      dto.amount,
      dto.type,
      dto.date,
      userId,
      scope.familyGroupId || null,
      dto.categoryId || null,
      dto.paymentMethodId || null,
      dto.paymentMethodType || 'OTHER',
      dto.fixedBillId || null,
    ]);
    return res[0];
  }

  async createRecurring(
    userId: string,
    body: {
      description: string;
      amount: number;
      type: string;
      date: string;
      categoryId?: string;
      paymentMethodId?: string;
      paymentMethodType?: string;
      recurrence: 'monthly' | 'weekly' | 'biweekly';
      endDate: string;
    },
  ) {
    const scope = await this.getScope(userId);
    const { recurrence, endDate, ...base } = body;

    const start = new Date(base.date);
    const end = new Date(endDate);
    if (end <= start) {
      throw new BadRequestException('Data final deve ser após a data inicial.');
    }

    const typeUpper = (base.type || 'INCOME').toUpperCase();
    // Only EXPENSE recurring use installment_group so they appear in the installments report
    const isExpense = typeUpper === 'EXPENSE';
    const installmentGroup = isExpense ? randomUUID() : null;

    const dates: Date[] = [];
    let current = new Date(start);

    while (current <= end && dates.length < 120) {
      dates.push(new Date(current));
      if (recurrence === 'monthly') {
        current.setMonth(current.getMonth() + 1);
      } else if (recurrence === 'weekly') {
        current.setDate(current.getDate() + 7);
      } else {
        current.setDate(current.getDate() + 14);
      }
    }

    const inserted: any[] = [];
    for (let i = 0; i < dates.length; i++) {
      const d = dates[i];
      const res = await this.db.query(
        `INSERT INTO db_dtasc.transactions
           (description, amount, type, date, user_id, family_group_id,
            category_id, payment_method_id, payment_method_type,
            installment_group, installment_number, total_installments)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          base.description,
          base.amount,
          typeUpper,
          d.toISOString(),
          userId,
          scope.familyGroupId || null,
          base.categoryId || null,
          base.paymentMethodId || null,
          base.paymentMethodType || 'OTHER',
          installmentGroup,
          isExpense ? i + 1 : null,
          isExpense ? dates.length : null,
        ],
      );
      if (res[0]) inserted.push(res[0]);
    }

    return { success: true, count: inserted.length, installmentGroup };
  }

  // ─── Update ─────────────────────────────────────────────────────────────────

  async update(id: string, userId: string, data: any) {
    const scope = await this.getScope(userId);
    const { description, amount, type, date, categoryId, paymentMethodId, fixedBillId } = data;

    const filterOffset = scope.filter.replace('$1', '$9');
    const sql = `
      UPDATE db_dtasc.transactions
      SET description        = COALESCE($1, description),
          amount             = COALESCE($2, amount),
          type               = COALESCE($3, type),
          date               = COALESCE($4, date),
          category_id        = COALESCE($5, category_id),
          payment_method_id  = COALESCE($6, payment_method_id),
          fixed_bill_id      = COALESCE($7, fixed_bill_id)
      WHERE id = $8 AND ${filterOffset}
      RETURNING *,
        is_paid             AS "isPaid",
        total_installments  AS "totalInstallments",
        installment_number  AS "installmentNumber",
        payment_method_type AS "paymentMethodType",
        fixed_bill_id       AS "fixedBillId",
        piggy_bank_id       AS "piggyBankId"
    `;
    const res = await this.db.query(sql, [
      description ?? null,
      amount ?? null,
      type ?? null,
      date ?? null,
      categoryId ?? null,
      paymentMethodId ?? null,
      fixedBillId ?? null,
      id,
      scope.param,
    ]);
    if (res.length === 0) throw new NotFoundException('Transação não encontrada.');
    return res[0];
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  async remove(id: string, userId: string, deleteAll: boolean) {
    const scope = await this.getScope(userId);
    const filterFind = scope.filter.replace('$1', '$2');
    const found = await this.db.query(
      `SELECT * FROM db_dtasc.transactions WHERE id = $1 AND ${filterFind}`,
      [id, scope.param],
    );
    if (found.length === 0) throw new NotFoundException('Transação não encontrada.');
    const t = found[0];

    if (deleteAll && t.installment_group) {
      const filterGroup = scope.filter.replace('$1', '$2');
      return this.db.query(
        `DELETE FROM db_dtasc.transactions WHERE installment_group = $1 AND ${filterGroup}`,
        [t.installment_group, scope.param],
      );
    }

    if (t.piggy_bank_id) {
      await this.db.query(
        'UPDATE db_dtasc.piggy_bank SET balance = balance - $1 WHERE id = $2',
        [t.amount, t.piggy_bank_id],
      );
    }

    return this.db.query('DELETE FROM db_dtasc.transactions WHERE id = $1', [id]);
  }

  // ─── Mark paid ──────────────────────────────────────────────────────────────

  async markAsPaid(userId: string, ids: string[]) {
    if (!ids || ids.length === 0) return { updated: 0 };
    const scope = await this.getScope(userId);

    return await this.db.transaction(async (client) => {
      const filterOffset = scope.filter.replace('$1', '$2');
      const selectRes = await client.query(
        `SELECT * FROM db_dtasc.transactions
         WHERE id = ANY($1) AND is_paid = false AND ${filterOffset}
         FOR UPDATE`,
        [ids, scope.param],
      );
      const rows: any[] = selectRes.rows || [];
      if (rows.length === 0) return { updated: 0 };

      let updatedCount = 0;
      const updatedRows: any[] = [];

      for (const t of rows) {
        if (t.piggy_bank_id) {
          await client.query(
            'UPDATE db_dtasc.piggy_bank SET balance = COALESCE(balance,0) + $1 WHERE id = $2',
            [t.amount, t.piggy_bank_id],
          );
        }

        if (t.debt_id) {
          try {
            await client.query(
              `UPDATE db_dtasc.debt
               SET paid_value        = COALESCE(paid_value,0) + $1,
                   pending_value     = GREATEST(COALESCE(pending_value,0) - $1, 0),
                   current_installment = COALESCE(current_installment,0) + 1,
                   status            = CASE
                     WHEN GREATEST(COALESCE(pending_value,0) - $1, 0) = 0 THEN 'Pago'
                     ELSE status END
               WHERE id = $2`,
              [t.amount, t.debt_id],
            );
          } catch {
            // debt table may not exist in this schema
          }
        }

        const updRes = await client.query(
          'UPDATE db_dtasc.transactions SET is_paid = true WHERE id = $1 RETURNING *',
          [t.id],
        );
        const upd = updRes.rows ? updRes.rows[0] : (updRes as any)[0];
        if (upd) { updatedCount++; updatedRows.push(upd); }
      }

      return { updated: updatedCount, rows: updatedRows };
    });
  }

  // ─── OFX / CSV import staging ────────────────────────────────────────────────

  private async ensureStagingTable() {
    await this.db.query(
      `CREATE TABLE IF NOT EXISTS db_dtasc.reconciliation_staging (
        id                TEXT PRIMARY KEY,
        user_id           TEXT NOT NULL,
        family_group_id   TEXT,
        payment_method_id TEXT,
        transaction_date  DATE NOT NULL,
        description       TEXT NOT NULL,
        amount            NUMERIC NOT NULL,
        import_hash       TEXT UNIQUE NOT NULL,
        status            TEXT NOT NULL DEFAULT 'PENDING'
      )`,
      [],
    );
    // idempotent column additions for older tables
    await this.db.query(
      `ALTER TABLE db_dtasc.reconciliation_staging
       ADD COLUMN IF NOT EXISTS family_group_id TEXT,
       ADD COLUMN IF NOT EXISTS payment_method_id TEXT`,
      [],
    );
  }

  private async ensureImportHashColumn() {
    try {
      await this.db.query(
        'ALTER TABLE db_dtasc.transactions ADD COLUMN IF NOT EXISTS import_hash TEXT',
        [],
      );
    } catch {}
  }

  private parseOfxStatements(buffer: string) {
    if (!buffer.toUpperCase().includes('<OFX>')) return null;
    const chunks = buffer.split(/<STMTTRN>/i).slice(1);
    const parsed: { date: string; description: string; amount: number }[] = [];

    for (const chunk of chunks) {
      const block = chunk.split(/<\/STMTTRN>/i)[0];
      const tag = (t: string) =>
        new RegExp(`<${t}>([^<\n\r]+)`, 'i').exec(block)?.[1]?.trim();

      const posted = tag('DTPOSTED');
      const amtStr = tag('TRNAMT');
      const name   = tag('NAME') || tag('MEMO');
      if (!posted || !amtStr || !name) continue;

      const d = posted.slice(0, 8);
      const amount = parseFloat(amtStr.replace(',', '.'));
      if (isNaN(amount)) continue;

      parsed.push({
        date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
        description: name,
        amount,
      });
    }
    return parsed.length ? parsed : null;
  }

  private parseCsvLines(buffer: string) {
    const lines = buffer.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const parsed: { date: string; description: string; amount: number }[] = [];

    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;
      const vals = line.split(',');
      const date        = vals[headers.indexOf('date')]?.trim();
      const description = (vals[headers.indexOf('title')] || vals[headers.indexOf('description')])?.trim();
      const amount      = parseFloat(vals[headers.indexOf('amount')]?.replace(',', '.') || '');
      if (!date || !description || isNaN(amount)) continue;
      parsed.push({ date, description, amount });
    }
    return parsed;
  }

  async processStaging(
    userId: string,
    fileBuffer: string,
    paymentMethodId?: string,
  ): Promise<StagingResult[]> {
    await this.assertOfxImportAllowed(userId);
    await this.ensureStagingTable();
    await this.ensureImportHashColumn();

    const entries = this.parseOfxStatements(fileBuffer) || this.parseCsvLines(fileBuffer);
    if (!entries || entries.length === 0) {
      throw new BadRequestException('Formato não suportado ou nenhum registro válido.');
    }

    const scope = await this.getScope(userId);
    const results: StagingResult[] = [];

    for (const entry of entries) {
      const hash = this.generateHash({
        date: entry.date,
        amount: entry.amount,
        description: entry.description,
        userId,
      });

      const existing = await this.db.query(
        'SELECT id FROM db_dtasc.transactions WHERE import_hash = $1',
        [hash],
      );

      const row = await this.db.query(
        `INSERT INTO db_dtasc.reconciliation_staging
           (id, user_id, family_group_id, payment_method_id,
            transaction_date, description, amount, import_hash, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
         ON CONFLICT (import_hash)
           DO UPDATE SET status = 'PENDING', payment_method_id = EXCLUDED.payment_method_id
         RETURNING *`,
        [
          randomUUID(), userId, scope.familyGroupId || null,
          paymentMethodId || null, entry.date, entry.description,
          entry.amount, hash,
        ],
      );

      if (row[0]) {
        results.push({
          id: row[0].id,
          transaction_date: row[0].transaction_date,
          description: row[0].description,
          amount: Number(row[0].amount),
          import_hash: row[0].import_hash,
          status: row[0].status,
          is_duplicate: existing.length > 0,
        });
      }
    }
    return results;
  }

  async getStaging(userId: string, paymentMethodId?: string) {
    await this.assertOfxImportAllowed(userId);
    await this.ensureStagingTable();
    let sql = `
      SELECT s.*,
             EXISTS(
               SELECT 1 FROM db_dtasc.transactions t
               WHERE t.import_hash = s.import_hash
             ) AS is_duplicate
      FROM db_dtasc.reconciliation_staging s
      WHERE s.user_id = $1
    `;
    const params: any[] = [userId];
    if (paymentMethodId) {
      sql += ' AND s.payment_method_id = $2';
      params.push(paymentMethodId);
    }
    sql += ' ORDER BY s.transaction_date DESC';
    return this.db.query(sql, params);
  }

  async deleteStagingItem(userId: string, id: string) {
    await this.assertOfxImportAllowed(userId);
    await this.db.query(
      'DELETE FROM db_dtasc.reconciliation_staging WHERE id = $1 AND user_id = $2',
      [id, userId],
    );
    return { success: true };
  }

  async confirmImport(
    userId: string,
    items: Array<{ id: string; categoryId?: string; installment?: { current: number; total: number } }>,
  ) {
    await this.assertOfxImportAllowed(userId);
    await this.ensureImportHashColumn();

    for (const it of items) {
      const staged = await this.db.query(
        'SELECT * FROM db_dtasc.reconciliation_staging WHERE id = $1 AND user_id = $2',
        [it.id, userId],
      );
      if (!staged.length) continue;

      const item = staged[0];
      const dup = await this.db.query(
        'SELECT id FROM db_dtasc.transactions WHERE import_hash = $1',
        [item.import_hash],
      );
      if (dup.length) {
        await this.db.query(
          'DELETE FROM db_dtasc.reconciliation_staging WHERE id = $1',
          [it.id],
        );
        continue;
      }

      const pmRes = item.payment_method_id
        ? await this.db.query(
            'SELECT type FROM db_dtasc.payment_method WHERE id = $1',
            [item.payment_method_id],
          )
        : [];

      const scope = await this.getScope(userId);
      const categoryId = it.categoryId || item.category_id || null;
      const installment = it.installment;
      const installmentGroup = installment ? randomUUID() : null;
      const description = installment
        ? `${item.description} (${installment.current}/${installment.total})`
        : item.description;

      await this.db.query(
        `INSERT INTO db_dtasc.transactions
           (description, amount, type, date, user_id, family_group_id,
            category_id, payment_method_id, payment_method_type, import_hash,
            installment_group, installment_number, total_installments)
         VALUES ($1, $2, 'EXPENSE', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          description,
          Number(item.amount),
          item.transaction_date,
          userId,
          scope.familyGroupId || null,
          categoryId,
          item.payment_method_id || null,
          pmRes[0]?.type || 'OTHER',
          item.import_hash,
          installmentGroup,
          installment?.current || null,
          installment?.total || null,
        ],
      );

      await this.db.query(
        'DELETE FROM db_dtasc.reconciliation_staging WHERE id = $1',
        [it.id],
      );

      if (installment && installmentGroup && installment.current < installment.total) {
        await this.createFutureInstallments(userId, scope.familyGroupId, {
          group: installmentGroup,
          baseDescription: item.description,
          amount: Number(item.amount),
          paymentMethodId: item.payment_method_id || null,
          paymentMethodType: pmRes[0]?.type || 'OTHER',
          categoryId,
          anchorDate: item.transaction_date,
          current: installment.current,
          total: installment.total,
        });
      }
    }
    return { success: true };
  }

  /**
   * Gera as parcelas futuras (current+1..total) de um parcelamento identificado
   * numa transação já importada, ancorado na data real do extrato (não "hoje") —
   * mesma ideia de `handleInstallments`, mas partindo de uma parcela conhecida.
   */
  private async createFutureInstallments(
    userId: string,
    familyGroupId: string | undefined,
    opts: {
      group: string;
      baseDescription: string;
      amount: number;
      paymentMethodId: string | null;
      paymentMethodType: string;
      categoryId: string | null;
      anchorDate: string;
      current: number;
      total: number;
    },
  ) {
    const anchor = new Date(opts.anchorDate);
    for (let n = opts.current + 1; n <= opts.total; n++) {
      const monthsAhead = n - opts.current;
      const dueDate = new Date(anchor.getFullYear(), anchor.getMonth() + monthsAhead, anchor.getDate());
      await this.db.query(
        `INSERT INTO db_dtasc.transactions
           (description, amount, type, date, user_id, family_group_id,
            category_id, payment_method_id, payment_method_type,
            installment_group, installment_number, total_installments)
         VALUES ($1, $2, 'EXPENSE', $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          `${opts.baseDescription} (${n}/${opts.total})`,
          opts.amount,
          dueDate.toISOString(),
          userId,
          familyGroupId || null,
          opts.categoryId,
          opts.paymentMethodId,
          opts.paymentMethodType,
          opts.group,
          n,
          opts.total,
        ],
      );
    }
  }

  /**
   * Usa o Gemini para sugerir a categoria de cada transação em staging e
   * detectar parcelamentos pelo texto da descrição (ex.: "PARC 3/12").
   * Nunca lança erro para o chamador — em qualquer falha da IA, devolve
   * sugestões vazias e deixa a categorização manual normalmente.
   */
  async analyzeStaging(userId: string, ids?: string[]): Promise<Array<{
    id: string;
    categoryId: string | null;
    isInstallment: boolean;
    installmentCurrent?: number;
    installmentTotal?: number;
  }>> {
    await this.assertOfxImportAllowed(userId);

    const staging = await this.getStaging(userId);
    const idSet = ids && ids.length ? new Set(ids) : null;
    const items = staging.filter((s: any) => !s.is_duplicate && (!idSet || idSet.has(s.id)));

    if (items.length === 0) return [];

    const fallback = items.map((it: any) => ({
      id: it.id,
      categoryId: null,
      isInstallment: false,
    }));

    try {
      const categories = (await this.categoriesService.findAll(userId)).filter(
        (c: any) => c.type === 'expense',
      );
      const categoryIds = categories.map((c: any) => c.id);

      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                id: { type: SchemaType.STRING, description: 'Mesmo id da transação recebida.' },
                categoryId: {
                  type: SchemaType.STRING,
                  format: 'enum',
                  enum: [...categoryIds, 'NONE'],
                  description: 'ID da categoria de despesa mais PRÓXIMA/aproximada, escolhida quase sempre. Use "NONE" só quando a lista de categorias for realmente irrelevante para o gasto (deve ser raro).',
                } as any,
                isInstallment: {
                  type: SchemaType.BOOLEAN,
                  description: 'true se a descrição indicar claramente uma parcela de compra (ex.: "PARC 3/12").',
                },
                installmentCurrent: { type: SchemaType.INTEGER, description: 'Número da parcela atual, se isInstallment=true.' },
                installmentTotal: { type: SchemaType.INTEGER, description: 'Total de parcelas, se isInstallment=true.' },
              },
              required: ['id', 'categoryId', 'isInstallment'],
            },
          },
        },
      });

      const prompt = `Você vai analisar transações de um extrato bancário/cartão importado, em português do Brasil.

Para CADA transação da lista abaixo, retorne:
- "categoryId": escolha SEMPRE a categoria mais próxima possível dentre a lista fornecida, mesmo que a combinação não seja perfeita — pense no tipo geral do gasto, não só no nome literal do estabelecimento. Exemplos de aproximação aceitável: uma farmácia ou plano de saúde pode ir em "Saúde" se existir, ou na categoria de despesa geral mais próxima se não existir uma específica; uma compra em loja online (Shopee, Amazon etc.) deve ser aproximada pelo tipo de produto mais provável (roupa, eletrônico, casa) usando a categoria mais parecida disponível; contas de consumo (água, luz, telefone) vão na categoria de utilidades/contas se existir, senão na mais genérica disponível. Só retorne "NONE" se a lista de categorias for realmente irrelevante para qualquer gasto do dia a dia (deve ser raro, não o padrão).
- "isInstallment": true somente se a descrição indicar claramente que é uma parcela de uma compra parcelada, com padrões comuns como "PARC 3/12", "3/12", "(03/12)", "PARCELA 3 DE 12", "3 DE 12X". Se não houver esse padrão explícito, retorne false. Uma transação ser parcelada NÃO significa que ela não tem categoria — categorize normalmente mesmo quando isInstallment for true.
- Se "isInstallment" for true, informe também "installmentCurrent" (número da parcela atual) e "installmentTotal" (total de parcelas), extraídos da própria descrição.

Categorias de despesa disponíveis (id | nome):
${categories.map((c: any) => `${c.id} | ${c.name}`).join('\n') || '(nenhuma categoria cadastrada)'}

Transações a analisar (id | descrição | valor | data):
${items.map((it: any) => `${it.id} | ${it.description} | ${it.amount} | ${it.transaction_date}`).join('\n')}

Responda apenas com o array JSON pedido, um item por transação, na mesma ordem.`;

      const result = await model.generateContent(prompt);
      const raw = JSON.parse(result.response.text());
      if (!Array.isArray(raw)) return fallback;

      const validIds = new Set(items.map((it: any) => it.id));
      const validCategoryIds = new Set(categoryIds);

      return raw
        .filter((r: any) => r && validIds.has(r.id))
        .map((r: any) => {
          const current = Number(r.installmentCurrent);
          const total = Number(r.installmentTotal);
          const soundInstallment =
            r.isInstallment === true &&
            Number.isInteger(current) && Number.isInteger(total) &&
            current >= 1 && total >= current && total <= 48;

          return {
            id: r.id,
            categoryId: validCategoryIds.has(r.categoryId) ? r.categoryId : null,
            isInstallment: soundInstallment,
            ...(soundInstallment ? { installmentCurrent: current, installmentTotal: total } : {}),
          };
        });
    } catch (error) {
      this.logger.error(`Erro ao analisar staging com IA: ${error.message}`);
      return fallback;
    }
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

  // ─── Private handlers ────────────────────────────────────────────────────────

  private async handleInstallments(
    userId: string,
    familyGroupId: string | undefined,
    dto: CreateTransactionDto,
    total: number,
  ) {
    const pmRes = dto.paymentMethodId
      ? await this.db.query(
          'SELECT * FROM db_dtasc.payment_method WHERE id = $1',
          [dto.paymentMethodId],
        )
      : [];
    const method = pmRes[0];
    const group  = randomUUID();
    const amount = Number((dto.amount / total).toFixed(2));
    const inserted: any[] = [];

    for (let i = 0; i < total; i++) {
      let dueDate = new Date(dto.date);

      if (
        method?.type?.toLowerCase() === 'credit_card' &&
        method.closing_day &&
        method.due_day
      ) {
        const offset = new Date(dto.date).getDate() > method.closing_day ? i + 1 : i;
        dueDate = new Date(
          dueDate.getFullYear(),
          dueDate.getMonth() + offset,
          method.due_day,
        );
      } else {
        dueDate.setMonth(dueDate.getMonth() + i);
      }

      const res = await this.db.query(
        `INSERT INTO db_dtasc.transactions
           (description, amount, type, date, user_id, family_group_id,
            category_id, payment_method_id, installment_group,
            payment_method_type, fixed_bill_id, installment_number, total_installments)
         VALUES ($1, $2, 'EXPENSE', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          `${dto.description} (${i + 1}/${total})`,
          amount,
          dueDate.toISOString(),
          userId,
          familyGroupId || null,
          dto.categoryId || null,
          dto.paymentMethodId || null,
          group,
          method?.type || 'OTHER',
          dto.fixedBillId || null,
          i + 1,
          total,
        ],
      );
      if (res[0]) inserted.push(res[0]);
    }
    return { success: true, count: inserted.length, installmentGroup: group };
  }

  private async handlePiggyBank(
    userId: string,
    familyGroupId: string | undefined,
    dto: CreateTransactionDto,
  ) {
    const res = await this.db.query(
      `INSERT INTO db_dtasc.transactions
         (description, amount, type, date, user_id, family_group_id,
          category_id, piggy_bank_id)
       VALUES ($1, $2, 'EXPENSE', $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        `Aporte: ${dto.description}`,
        dto.amount,
        dto.date,
        userId,
        familyGroupId || null,
        dto.categoryId || null,
        dto.piggyBankId,
      ],
    );
    await this.db.query(
      'UPDATE db_dtasc.piggy_bank SET balance = balance + $1 WHERE id = $2',
      [dto.amount, dto.piggyBankId],
    );
    return res[0];
  }
}
