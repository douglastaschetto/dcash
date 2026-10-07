import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FamilyScopeService } from '../common/scope/family-scope.service';
import { DcaosNotifyService } from './dcaos-notify.service';
import { fill } from './dcaos.messages';
import { CreatePantryItemDto, UpdatePantryItemDto } from './dto/dcaos.dto';

const S = 'db_dtasc';

const ITEM_FIELDS = `
  p.id, p.name, p.category, p.unit,
  p.quantity::float          AS quantity,
  p.min_quantity::float      AS "minQuantity",
  p.on_list                  AS "onList",
  p.list_quantity::float     AS "listQuantity",
  p.checked,
  p.times_ran_out            AS "timesRanOut",
  p.last_bought_at           AS "lastBoughtAt",
  p.shelf_life_days          AS "shelfLifeDays",
  p.added_by                 AS "addedBy",
  u.name                     AS "addedByName",
  p.updated_at               AS "updatedAt"
`;

/** "Abastece Aí" — pantry stock and shopping list in one table. */
@Injectable()
export class DcaosMarketService {
  constructor(
    private readonly db: DatabaseService,
    private readonly familyScope: FamilyScopeService,
    private readonly notify: DcaosNotifyService,
  ) {}

  private async scope(userId: string, n: number) {
    const scope = await this.familyScope.getScope(userId);
    return {
      ...scope,
      filter: this.familyScope
        .filterAt(scope, n)
        .replace(/(user_id|family_group_id)/g, 'p.$1'),
    };
  }

  private async findOne(userId: string, id: string) {
    const scope = await this.scope(userId, 2);
    const [item] = await this.db.query(
      `SELECT ${ITEM_FIELDS} FROM ${S}.dcaos_pantry_items p
       LEFT JOIN ${S}.users u ON u.id = p.added_by
       WHERE p.id = $1 AND ${scope.filter}`,
      [id, scope.param],
    );
    if (!item) throw new NotFoundException('Item não encontrado.');
    return item;
  }

  async list(userId: string) {
    const scope = await this.scope(userId, 1);
    return this.db.query(
      `SELECT ${ITEM_FIELDS} FROM ${S}.dcaos_pantry_items p
       LEFT JOIN ${S}.users u ON u.id = p.added_by
       WHERE ${scope.filter}
       ORDER BY p.category NULLS LAST, lower(p.name)`,
      [scope.param],
    );
  }

  /** Re-uses an item with the same name instead of creating duplicates. */
  async create(userId: string, dto: CreatePantryItemDto) {
    const scope = await this.scope(userId, 2);
    const [existing] = await this.db.query<{ id: string }>(
      `SELECT p.id FROM ${S}.dcaos_pantry_items p WHERE lower(p.name) = lower($1) AND ${scope.filter} LIMIT 1`,
      [dto.name.trim(), scope.param],
    );
    if (existing) {
      return this.update(userId, existing.id, {
        onList: dto.onList ?? true,
        listQuantity: dto.listQuantity,
        quantity: dto.quantity,
        category: dto.category,
        unit: dto.unit,
        minQuantity: dto.minQuantity,
        shelfLifeDays: dto.shelfLifeDays,
      });
    }
    const [row] = await this.db.query<{ id: string }>(
      `INSERT INTO ${S}.dcaos_pantry_items
         (name, category, unit, quantity, min_quantity, on_list, list_quantity, added_by, user_id, family_group_id,
          shelf_life_days, last_bought_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10, $11)
       RETURNING id`,
      [
        dto.name.trim(),
        dto.category || null,
        dto.unit || null,
        dto.quantity ?? 0,
        dto.minQuantity ?? null,
        dto.onList ?? false,
        dto.listQuantity ?? 1,
        userId,
        scope.familyGroupId,
        dto.shelfLifeDays ?? null,
        // Stocking counts as the purchase date for the shelf-life estimate
        (dto.quantity ?? 0) > 0 ? new Date() : null,
      ],
    );
    return this.findOne(userId, row.id);
  }

  async update(userId: string, id: string, dto: UpdatePantryItemDto) {
    await this.findOne(userId, id);
    const sets: string[] = [];
    const params: unknown[] = [];
    const set = (col: string, value: unknown) => {
      params.push(value);
      sets.push(`${col} = $${params.length}`);
    };
    if (dto.name !== undefined) set('name', dto.name.trim());
    if (dto.category !== undefined) set('category', dto.category || null);
    if (dto.unit !== undefined) set('unit', dto.unit || null);
    if (dto.quantity !== undefined) set('quantity', dto.quantity);
    if (dto.minQuantity !== undefined) set('min_quantity', dto.minQuantity);
    if (dto.onList !== undefined) {
      set('on_list', dto.onList);
      if (!dto.onList) set('checked', false);
    }
    if (dto.listQuantity !== undefined) set('list_quantity', dto.listQuantity);
    if (dto.checked !== undefined) set('checked', dto.checked);
    if (dto.shelfLifeDays !== undefined) set('shelf_life_days', dto.shelfLifeDays);
    if (sets.length) {
      params.push(id);
      await this.db.query(
        `UPDATE ${S}.dcaos_pantry_items SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`,
        params,
      );
    }
    return this.findOne(userId, id);
  }

  /** "Acabou!" — stock to zero, straight to the shopping list, family warned. */
  async ranOut(userId: string, id: string) {
    const item = await this.findOne(userId, id);
    await this.db.query(
      `UPDATE ${S}.dcaos_pantry_items
       SET quantity = 0, on_list = true, checked = false, times_ran_out = times_ran_out + 1, updated_at = NOW()
       WHERE id = $1`,
      [id],
    );
    const times = Number(item.timesRanOut ?? 0) + 1;
    await this.notify.notifyFamily(
      userId,
      {
        module: 'market',
        body: fill(times > 1 ? 'marketRanOutAgain' : 'marketRanOut', {
          item: item.name.toLowerCase(),
          times,
        }),
        link: '/dcaos/mercado',
      },
      userId,
    );
    return this.findOne(userId, id);
  }

  /** Uses `amount` (default 1, in the item's unit); at the minimum it goes to the list. */
  async consume(userId: string, id: string, amount = 1) {
    const item = await this.findOne(userId, id);
    const quantity = Math.max(
      0,
      Math.round((Number(item.quantity) - amount) * 100) / 100,
    );
    if (quantity === 0) return this.ranOut(userId, id);
    const low =
      item.minQuantity !== null && quantity <= Number(item.minQuantity);
    await this.db.query(
      `UPDATE ${S}.dcaos_pantry_items
       SET quantity = $1, on_list = on_list OR $2, updated_at = NOW()
       WHERE id = $3`,
      [quantity, low, id],
    );
    if (low && !item.onList) {
      await this.notify.notifyFamily(
        userId,
        {
          module: 'market',
          body: fill('marketLowStock', { item: item.name.toLowerCase() }),
          link: '/dcaos/mercado',
        },
        userId,
      );
    }
    return this.findOne(userId, id);
  }

  /** Finishes a shopping trip: checked (or given) list items go back to the pantry. */
  async checkout(userId: string, ids?: string[]) {
    const scope = await this.scope(userId, 1);
    const params: unknown[] = [scope.param];
    let where = `${scope.filter} AND p.on_list = true AND p.checked = true`;
    if (ids?.length) {
      params.push(ids);
      where = `${scope.filter} AND p.on_list = true AND p.id = ANY($2)`;
    }
    const bought = await this.db.query<{ id: string }>(
      `UPDATE ${S}.dcaos_pantry_items p
       SET quantity = p.quantity + p.list_quantity, on_list = false, checked = false,
           list_quantity = 1, last_bought_at = NOW(), updated_at = NOW()
       WHERE ${where}
       RETURNING p.id`,
      params,
    );
    if (bought.length) {
      const who = await this.notify.nameOf(userId);
      await this.notify.notifyFamily(
        userId,
        {
          module: 'market',
          body: fill('marketCheckout', { who, count: bought.length }),
          link: '/dcaos/mercado',
        },
        userId,
      );
    }
    return { bought: bought.length };
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.db.query(`DELETE FROM ${S}.dcaos_pantry_items WHERE id = $1`, [
      id,
    ]);
    return { success: true };
  }
}
