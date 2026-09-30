import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PlanService } from '../plan/plan.service';
import { FamilyScopeService } from '../common/scope/family-scope.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  private readonly logger = new Logger(PaymentMethodsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly planService: PlanService,
    private readonly familyScope: FamilyScopeService,
  ) {}

  async findAll(userId: string) {
    const scope = await this.familyScope.getScope(userId);

    const sql = `
      SELECT pm.*,
             pm.payment_limit   AS "limit",
             pm.closing_day     AS "closingDay",
             pm.due_day         AS "dueDay",
             pm.user_id         AS "userId",
             pm.family_group_id AS "familyGroupId",
             pm.owner_id        AS "ownerId",
             json_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar) AS owner,
             CASE
               WHEN pm.type IN ('credit_card', 'financing') THEN
                 pm.payment_limit - COALESCE((
                   SELECT SUM(t.amount)
                   FROM db_dtasc.transactions t
                   WHERE t.payment_method_id = pm.id AND t.is_paid = false
                 ), 0)
               ELSE
                 COALESCE((
                   SELECT SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE -t.amount END)
                   FROM db_dtasc.transactions t
                   WHERE t.payment_method_id = pm.id
                 ), 0)
             END AS balance
      FROM db_dtasc.payment_method pm
      LEFT JOIN db_dtasc.users u ON pm.owner_id = u.id
      WHERE pm.${scope.filter}
      ORDER BY pm.name ASC
    `;

    return this.db.query(sql, [scope.param]);
  }

  async create(userId: string, data: CreatePaymentMethodDto) {
    const scope = await this.familyScope.getScope(userId);

    const limit = await this.planService.getNumericLimit(userId, 'max_cards');
    if (limit !== null) {
      const [{ count }] = await this.db.query(
        `SELECT COUNT(*)::int AS count FROM db_dtasc.payment_method WHERE ${scope.filter}`,
        [scope.param],
      );
      if (count >= limit) {
        throw new ForbiddenException(
          `Limite de ${limit} formas de pagamento do seu plano atingido. Faça upgrade para adicionar mais.`,
        );
      }
    }

    const sql = `
      INSERT INTO db_dtasc.payment_method
        (name, type, icon, color, description, payment_limit, closing_day, due_day, user_id, family_group_id, owner_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *,
        payment_limit AS "limit",
        closing_day   AS "closingDay",
        due_day       AS "dueDay",
        user_id       AS "userId",
        owner_id      AS "ownerId"
    `;

    try {
      const res = await this.db.query(sql, [
        data.name,
        data.type.toLowerCase(),
        data.icon || '💳',
        data.color || '#10b981',
        data.description || '',
        data.limit ? Math.round(Number(data.limit)) : 0,
        data.closingDay ? Number(data.closingDay) : null,
        data.dueDay ? Number(data.dueDay) : null,
        userId,
        scope.familyGroupId,
        data.ownerId || userId,
      ]);
      return res[0];
    } catch (error) {
      this.logger.error(
        'Erro ao salvar forma de pagamento',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'Erro ao salvar forma de pagamento.',
      );
    }
  }

  async update(
    id: string,
    userId: string,
    data: Partial<CreatePaymentMethodDto>,
  ) {
    const scope = await this.familyScope.getScope(userId);
    const filterWithOffset = this.familyScope.filterAt(scope, 11);

    const sql = `
      UPDATE db_dtasc.payment_method
      SET name          = COALESCE($1,  name),
          type          = COALESCE($2,  type),
          icon          = COALESCE($3,  icon),
          color         = COALESCE($4,  color),
          description   = COALESCE($5,  description),
          payment_limit = COALESCE($6,  payment_limit),
          closing_day   = COALESCE($7,  closing_day),
          due_day       = COALESCE($8,  due_day),
          owner_id      = COALESCE($9,  owner_id)
      WHERE id = $10 AND ${filterWithOffset}
      RETURNING *,
        payment_limit AS "limit",
        closing_day   AS "closingDay",
        due_day       AS "dueDay",
        user_id       AS "userId",
        owner_id      AS "ownerId"
    `;

    try {
      const res = await this.db.query(sql, [
        data.name ?? null,
        data.type ? data.type.toLowerCase() : null,
        data.icon ?? null,
        data.color ?? null,
        data.description ?? null,
        data.limit !== undefined ? Math.round(Number(data.limit)) : null,
        data.closingDay !== undefined ? Number(data.closingDay) : null,
        data.dueDay !== undefined ? Number(data.dueDay) : null,
        data.ownerId ?? null,
        id,
        scope.param,
      ]);

      if (res.length === 0)
        throw new NotFoundException(
          'Forma de pagamento não encontrada ou sem permissão.',
        );
      return res[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        'Erro ao atualizar forma de pagamento',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'Erro ao atualizar forma de pagamento.',
      );
    }
  }

  async remove(id: string, userId: string) {
    const scope = await this.familyScope.getScope(userId);
    const filter = this.familyScope.filterAt(scope, 2);

    const res = await this.db.query(
      `DELETE FROM db_dtasc.payment_method WHERE id = $1 AND ${filter} RETURNING id`,
      [id, scope.param],
    );

    if (res.length === 0)
      throw new NotFoundException('Item não encontrado ou acesso negado.');
    return { success: true };
  }
}
