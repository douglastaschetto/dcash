import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { FamilyScopeService } from '../common/scope/family-scope.service';
import { CreateWishDto } from './dto/create-wish-dto';
import { UpdateWishDto } from './dto/update-wish.dto';
import { CreatePriceDto } from './dto/create-price-dto';

@Injectable()
export class WishlistService {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly familyScope: FamilyScopeService,
  ) {}

  private getScope(userId: string) {
    return this.familyScope.getScope(userId);
  }

  async create(userId: string, dto: CreateWishDto) {
    const scope = await this.getScope(userId);
    const result = await this.db.query(
      `INSERT INTO db_dtasc.wishlist
         (product, image_url, category_id, priority, link, user_id, family_group_id, bought)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *,
                 image_url        AS "imageUrl",
                 category_id      AS "categoryId",
                 family_group_id  AS "familyGroupId"`,
      [
        dto.product,
        dto.imageUrl ?? null,
        dto.categoryId ?? null,
        dto.priority ?? '3 - Baixo',
        dto.link ?? null,
        userId,
        scope.familyGroupId,
        dto.bought ?? false,
      ],
    );
    return result[0];
  }

  async findAll(userId: string) {
    const scope = await this.getScope(userId);
    return this.db.query(
      `SELECT w.*,
              w.image_url       AS "imageUrl",
              w.category_id     AS "categoryId",
              w.family_group_id AS "familyGroupId",
              COALESCE(
                (SELECT json_agg(p)
                 FROM (
                   SELECT p2.id,
                          p2.store,
                          p2.cash_price        AS "cashPrice",
                          p2.installment_price  AS "installmentPrice",
                          p2.installments,
                          p2.shipping,
                          p2.link,
                          p2.observations,
                          p2.decision
                   FROM db_dtasc.price_hunting p2
                   WHERE p2.wishlist_id = w.id
                   ORDER BY (p2.cash_price + p2.shipping) ASC
                 ) p),
                '[]'
              ) AS prices
       FROM db_dtasc.wishlist w
       WHERE w.${scope.filter}
       ORDER BY w.created_at DESC`,
      [scope.param],
    );
  }

  async update(id: string, userId: string, dto: UpdateWishDto) {
    const scope = await this.getScope(userId);
    const scopeFilter = scope.filter.replace('$1', '$8');
    const result = await this.db.query(
      `UPDATE db_dtasc.wishlist
       SET product     = COALESCE($1, product),
           image_url   = COALESCE($2, image_url),
           category_id = COALESCE($3, category_id),
           priority    = COALESCE($4, priority),
           link        = COALESCE($5, link),
           bought      = COALESCE($6, bought)
       WHERE id = $7 AND ${scopeFilter}
       RETURNING *, image_url AS "imageUrl", category_id AS "categoryId"`,
      [
        dto.product ?? null,
        dto.imageUrl ?? null,
        dto.categoryId ?? null,
        dto.priority ?? null,
        dto.link ?? null,
        dto.bought ?? null,
        id,
        scope.param,
      ],
    );
    if (!result.length) throw new NotFoundException('Item não encontrado ou sem permissão.');
    return result[0];
  }

  async remove(id: string, userId: string) {
    const scope = await this.getScope(userId);
    const scopeFilter = scope.filter.replace('$1', '$2');
    const result = await this.db.query(
      `DELETE FROM db_dtasc.wishlist WHERE id = $1 AND ${scopeFilter} RETURNING id`,
      [id, scope.param],
    );
    if (!result.length) throw new NotFoundException('Item não encontrado.');
    return { success: true };
  }

  async addPrice(wishlistId: string, userId: string, dto: CreatePriceDto) {
    const scope = await this.getScope(userId);
    const result = await this.db.query(
      `INSERT INTO db_dtasc.price_hunting
         (wishlist_id, store, cash_price, installment_price, installments,
          shipping, link, observations, user_id, family_group_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, store, link, decision,
                 cash_price        AS "cashPrice",
                 installment_price AS "installmentPrice",
                 installments,
                 shipping,
                 observations`,
      [
        wishlistId,
        dto.store,
        dto.cashPrice,
        dto.installmentPrice ?? 0,
        dto.installments ?? 1,
        dto.shipping ?? 0,
        dto.link ?? null,
        dto.observations ?? null,
        userId,
        scope.familyGroupId,
      ],
    );
    return result[0];
  }

  async removePrice(priceId: string) {
    const result = await this.db.query(
      'DELETE FROM db_dtasc.price_hunting WHERE id = $1 RETURNING id',
      [priceId],
    );
    if (!result.length) throw new NotFoundException('Cotação não encontrada.');
    return { success: true };
  }

  async searchPrices(query: string) {
    const apiKey = this.config.get<string>('SERPAPI_KEY');
    if (!apiKey) return { noKey: true, results: [] };

    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google_shopping');
    url.searchParams.set('q', query);
    url.searchParams.set('location', 'Brazil');
    url.searchParams.set('hl', 'pt');
    url.searchParams.set('gl', 'br');
    url.searchParams.set('num', '20');
    url.searchParams.set('api_key', apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) return { results: [] };

    const data = await res.json();
    const results = (data.shopping_results ?? []).map((item: any) => {
      const freeShip =
        typeof item.delivery === 'string' &&
        (item.delivery.toLowerCase().includes('grát') ||
          item.delivery.toLowerCase().includes('free'));
      return {
        id: String(item.position ?? Math.random()),
        title: item.title ?? '',
        price: item.extracted_price ?? 0,
        priceText: item.price ?? '',
        originalPrice: item.extracted_original_price ?? null,
        thumbnail: item.thumbnail ?? null,
        link: item.link ?? item.product_link ?? '',
        store: item.source ?? 'Google Shopping',
        freeShipping: freeShip,
        delivery: item.delivery ?? null,
        rating: item.rating ?? null,
        reviews: item.reviews ?? null,
        condition: item.second_hand_condition ? 'Usado' : 'Novo',
      };
    });

    return { results };
  }
}
