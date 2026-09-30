import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FamilyScopeService } from '../common/scope/family-scope.service';
import { CreateDreamDto } from './dto/create-dream.dto';
import { UpdateDreamDto } from './dto/update-dream.dto';

@Injectable()
export class DreamsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly familyScope: FamilyScopeService,
  ) {}

  private getScope(userId: string) {
    return this.familyScope.getScope(userId);
  }

  async create(userId: string, dto: CreateDreamDto) {
    const scope = await this.getScope(userId);
    const sql = `
      INSERT INTO db_dtasc.dream_goal
        (title, target_value, saved_value, image_url, deadline,
         user_id, family_group_id, piggy_bank_id, wishlist_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        id, title,
        target_value  AS "targetValue",
        saved_value   AS "savedValue",
        image_url     AS "imageUrl",
        deadline,
        piggy_bank_id AS "piggyBankId",
        wishlist_id   AS "wishlistId"
    `;
    const res = await this.db.query(sql, [
      dto.title,
      Number(dto.targetValue),
      Number(dto.savedValue ?? 0),
      dto.imageUrl || null,
      dto.deadline || null,
      userId,
      scope.familyGroupId || null,
      dto.piggyBankId || null,
      dto.wishlistId || null,
    ]);
    return res[0];
  }

  async findAll(userId: string) {
    const scope = await this.getScope(userId);
    // scope.filter already uses $1
    const sql = `
      SELECT
        d.id,
        d.title,
        d.target_value  AS "targetValue",
        COALESCE(p.balance, d.saved_value) AS "savedValue",
        d.image_url     AS "imageUrl",
        d.deadline,
        d.piggy_bank_id AS "piggyBankId",
        d.wishlist_id   AS "wishlistId",
        d.created_at    AS "createdAt",
        CASE
          WHEN p.id IS NOT NULL
          THEN json_build_object('id', p.id, 'name', p.name, 'balance', p.balance)
          ELSE NULL
        END AS "piggyBank"
      FROM db_dtasc.dream_goal d
      LEFT JOIN db_dtasc.piggy_bank p ON d.piggy_bank_id = p.id
      WHERE d.${scope.filter}
      ORDER BY d.created_at DESC
    `;
    return this.db.query(sql, [scope.param]);
  }

  async update(id: string, userId: string, dto: UpdateDreamDto) {
    const scope = await this.getScope(userId);
    // $1–$7 SET params, $8 = id, $9 = scope.param
    const scopeFilter = scope.filter.replace('$1', '$9');
    const sql = `
      UPDATE db_dtasc.dream_goal
      SET
        title         = $1,
        target_value  = $2,
        saved_value   = $3,
        image_url     = $4,
        deadline      = $5,
        piggy_bank_id = $6,
        wishlist_id   = $7
      WHERE id = $8 AND ${scopeFilter}
      RETURNING
        id, title,
        target_value  AS "targetValue",
        saved_value   AS "savedValue",
        image_url     AS "imageUrl",
        deadline,
        piggy_bank_id AS "piggyBankId",
        wishlist_id   AS "wishlistId"
    `;
    const res = await this.db.query(sql, [
      dto.title ?? null,
      dto.targetValue != null ? Number(dto.targetValue) : null,
      dto.savedValue != null ? Number(dto.savedValue) : null,
      dto.imageUrl ?? null,
      dto.deadline ?? null,
      dto.piggyBankId ?? null,
      dto.wishlistId ?? null,
      id,
      scope.param,
    ]);
    if (res.length === 0) throw new NotFoundException('Sonho não encontrado.');
    return res[0];
  }

  async updateProgress(id: string, userId: string, savedValue: number) {
    const scope = await this.getScope(userId);
    // $1 = savedValue, $2 = id, $3 = scope.param
    const scopeFilter = scope.filter.replace('$1', '$3');
    const sql = `
      UPDATE db_dtasc.dream_goal
      SET saved_value = $1
      WHERE id = $2 AND ${scopeFilter}
      RETURNING id, saved_value AS "savedValue"
    `;
    const res = await this.db.query(sql, [Number(savedValue), id, scope.param]);
    if (res.length === 0) throw new NotFoundException('Sonho não encontrado.');
    return res[0];
  }

  async remove(id: string, userId: string) {
    const scope = await this.getScope(userId);
    // $1 = id, $2 = scope.param
    const scopeFilter = scope.filter.replace('$1', '$2');
    const sql = `
      DELETE FROM db_dtasc.dream_goal
      WHERE id = $1 AND ${scopeFilter}
      RETURNING id
    `;
    const res = await this.db.query(sql, [id, scope.param]);
    if (res.length === 0) throw new NotFoundException('Sonho não encontrado.');
    return { success: true };
  }
}
