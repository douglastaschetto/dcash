import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FamilyScopeService } from '../common/scope/family-scope.service';

@Injectable()
export class PiggyBanksService {
  constructor(
    private readonly db: DatabaseService,
    private readonly familyScope: FamilyScopeService,
  ) {}

  private getScope(userId: string) {
    return this.familyScope.getScope(userId);
  }

  async getDashboard(userId: string) {
    const scope = await this.getScope(userId);

    const banks = await this.db.query(
      `SELECT pb.id, pb.name, pb.balance, pb.color,
              pb.monthly_goal    AS "monthlyGoal",
              pb.yearly_goal     AS "yearlyGoal",
              pb.target_date     AS "targetDate",
              pb.image_url       AS "imageUrl",
              pb.user_id         AS "userId",
              pb.family_group_id AS "familyGroupId",
              pb.created_at      AS "createdAt"
       FROM db_dtasc.piggy_bank pb
       WHERE pb.active = true AND pb.${scope.filter}
       ORDER BY pb.created_at DESC`,
      [scope.param],
    );

    return banks.map((bank) => {
      const balance = Number(bank.balance ?? 0);
      const yearlyGoal = Number(bank.yearlyGoal ?? 0);
      const monthlyGoal = Number(bank.monthlyGoal ?? 0);
      const goal = yearlyGoal || monthlyGoal || 1;
      return {
        ...bank,
        balance,
        progress: Math.round(Math.min((balance / goal) * 100, 100) * 10) / 10,
      };
    });
  }

  async create(userId: string, data: any) {
    const scope = await this.getScope(userId);
    const result = await this.db.query(
      `INSERT INTO db_dtasc.piggy_bank
         (name, image_url, color, monthly_goal, yearly_goal, target_date, user_id, family_group_id, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
       RETURNING *,
                 monthly_goal AS "monthlyGoal",
                 yearly_goal  AS "yearlyGoal",
                 target_date  AS "targetDate",
                 image_url    AS "imageUrl"`,
      [
        data.name,
        data.imageUrl ?? null,
        data.color ?? '#10b981',
        data.monthlyGoal ? parseFloat(data.monthlyGoal) : 0,
        data.yearlyGoal ? parseFloat(data.yearlyGoal) : 0,
        data.targetDate ?? null,
        userId,
        scope.familyGroupId,
      ],
    );
    return result[0];
  }

  async update(id: string, userId: string, data: any) {
    const scope = await this.getScope(userId);
    const scopeFilter = scope.filter.replace('$1', '$8');

    const result = await this.db.query(
      `UPDATE db_dtasc.piggy_bank
       SET name         = COALESCE($1, name),
           monthly_goal = COALESCE($2, monthly_goal),
           yearly_goal  = COALESCE($3, yearly_goal),
           image_url    = COALESCE($4, image_url),
           target_date  = COALESCE($5, target_date),
           color        = COALESCE($6, color)
       WHERE id = $7 AND ${scopeFilter}
       RETURNING *,
                 monthly_goal AS "monthlyGoal",
                 yearly_goal  AS "yearlyGoal",
                 target_date  AS "targetDate",
                 image_url    AS "imageUrl"`,
      [
        data.name ?? null,
        data.monthlyGoal ? parseFloat(data.monthlyGoal) : null,
        data.yearlyGoal ? parseFloat(data.yearlyGoal) : null,
        data.imageUrl ?? null,
        data.targetDate ?? null,
        data.color ?? null,
        id,
        scope.param,
      ],
    );

    if (!result.length) throw new NotFoundException('Cofrinho não encontrado.');
    return result[0];
  }

  async remove(id: string, userId: string) {
    const scope = await this.getScope(userId);
    const scopeFilter = scope.filter.replace('$1', '$2');

    const result = await this.db.query(
      `UPDATE db_dtasc.piggy_bank
       SET active = false
       WHERE id = $1 AND ${scopeFilter}
       RETURNING id`,
      [id, scope.param],
    );

    if (!result.length) throw new NotFoundException('Cofrinho não encontrado.');
    return { success: true };
  }

  async deposit(id: string, userId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException('Valor deve ser positivo.');
    const scope = await this.getScope(userId);
    const scopeFilter = scope.filter.replace('$1', '$3');

    const result = await this.db.query(
      `UPDATE db_dtasc.piggy_bank
       SET balance = balance + $1
       WHERE id = $2 AND ${scopeFilter}
       RETURNING id, name, balance, monthly_goal AS "monthlyGoal", yearly_goal AS "yearlyGoal"`,
      [amount, id, scope.param],
    );

    if (!result.length) throw new NotFoundException('Cofrinho não encontrado.');
    return result[0];
  }

  async withdraw(id: string, userId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException('Valor deve ser positivo.');
    const scope = await this.getScope(userId);
    const scopeFilter = scope.filter.replace('$1', '$3');

    const result = await this.db.query(
      `UPDATE db_dtasc.piggy_bank
       SET balance = balance - $1
       WHERE id = $2 AND ${scopeFilter} AND balance >= $1
       RETURNING id, name, balance, monthly_goal AS "monthlyGoal", yearly_goal AS "yearlyGoal"`,
      [amount, id, scope.param],
    );

    if (!result.length)
      throw new BadRequestException('Saldo insuficiente ou cofrinho não encontrado.');
    return result[0];
  }
}
