import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface FamilyScope {
  familyGroupId: string | null;
  isFamily: boolean;
  /** Value to bind for the scope filter placeholder ($1 by default). */
  param: string;
  /** SQL filter fragment using placeholder $1. Use `.filterAt(n)` to bind at a different index. */
  filter: string;
}

/**
 * Every family-shared table follows the same rule: if the user belongs to a
 * family group, rows are shared across `family_group_id`; otherwise rows are
 * private to `user_id` with `family_group_id IS NULL`. This was previously
 * re-implemented ad hoc in ~10 services (see audit) — centralized here so
 * new modules can't accidentally skip family scoping (as `investments` did).
 */
@Injectable()
export class FamilyScopeService {
  constructor(private readonly db: DatabaseService) {}

  async getScope(userId: string): Promise<FamilyScope> {
    const res = await this.db.query(
      'SELECT family_group_id FROM db_dtasc.users WHERE id = $1',
      [userId],
    );
    const familyGroupId: string | null = res[0]?.family_group_id ?? null;
    const isFamily = !!familyGroupId;
    return {
      familyGroupId,
      isFamily,
      param: familyGroupId || userId,
      filter: isFamily
        ? 'family_group_id = $1'
        : 'user_id = $1 AND family_group_id IS NULL',
    };
  }

  /** Same filter, bound at placeholder index `n` instead of $1. */
  filterAt(scope: FamilyScope, n: number): string {
    return scope.isFamily
      ? `family_group_id = $${n}`
      : `user_id = $${n} AND family_group_id IS NULL`;
  }
}
