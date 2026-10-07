import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  FamilyScope,
  FamilyScopeService,
} from '../common/scope/family-scope.service';
import { DcaosModuleKey, MODULE_EMOJI, MODULE_NAMES } from './dcaos.messages';
import { DcaosPushService } from './dcaos-push.service';

const S = 'db_dtasc';

export type Notice = {
  module: DcaosModuleKey;
  /** Optional headline (defaults to the module name). */
  title?: string;
  body: string;
  link?: string;
  /** Same key for the same user is stored once (scheduled reminders). */
  dedupeKey?: string;
};

/**
 * Writes "O Sistema Lembrou" notifications. The in-app feed reads these rows;
 * device push (phase 3) will be dispatched from here as well.
 */
@Injectable()
export class DcaosNotifyService {
  private readonly logger = new Logger(DcaosNotifyService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly familyScope: FamilyScopeService,
    private readonly push: DcaosPushService,
  ) {}

  /** Every member of the scope (family members, or just the user). */
  async members(
    scope: FamilyScope,
    userId: string,
  ): Promise<{ id: string; name: string }[]> {
    if (!scope.isFamily) {
      return this.db.query(`SELECT id, name FROM ${S}.users WHERE id = $1`, [
        userId,
      ]);
    }
    return this.db.query(
      `SELECT id, name FROM ${S}.users WHERE family_group_id = $1 ORDER BY name`,
      [scope.familyGroupId],
    );
  }

  async nameOf(userId: string): Promise<string> {
    const [row] = await this.db.query<{ name: string }>(
      `SELECT name FROM ${S}.users WHERE id = $1`,
      [userId],
    );
    return row?.name?.split(' ')[0] ?? 'Alguém';
  }

  async notify(
    recipientIds: string[],
    familyGroupId: string | null,
    notice: Notice,
  ): Promise<void> {
    const unique = Array.from(new Set(recipientIds.filter(Boolean)));
    for (const uid of unique) {
      try {
        const inserted = await this.db.query(
          `INSERT INTO ${S}.dcaos_notifications (user_id, family_group_id, module, title, body, link, dedupe_key)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [
            uid,
            familyGroupId,
            notice.module,
            notice.title ?? MODULE_NAMES[notice.module],
            notice.body,
            notice.link ?? null,
            notice.dedupeKey ?? null,
          ],
        );
        // Only brand-new rows go to the device (deduped reminders stay silent)
        if (inserted.length) this.dispatchPush(uid, notice);
      } catch (err) {
        this.logger.warn(`notify failed for ${uid}: ${(err as Error).message}`);
      }
    }
  }

  /** Fire-and-forget device push; never blocks or fails the caller. */
  private dispatchPush(userId: string, notice: Notice) {
    if (!this.push.isConfigured) return;
    void (async () => {
      const badge = await this.unreadCount(userId).catch(() => undefined);
      await this.push.sendToUser(userId, notice.module, {
        title:
          notice.title ??
          `${MODULE_EMOJI[notice.module] ?? '🔔'} ${MODULE_NAMES[notice.module]}`,
        body: notice.body,
        link: notice.link ?? '/painel',
        tag: notice.module,
        badge,
      });
    })().catch((err) =>
      this.logger.warn(`push dispatch failed: ${(err as Error).message}`),
    );
  }

  /** Notify everyone in the user's scope except `exceptUserId`. */
  async notifyFamily(
    userId: string,
    notice: Notice,
    exceptUserId?: string,
  ): Promise<void> {
    const scope = await this.familyScope.getScope(userId);
    const members = await this.members(scope, userId);
    await this.notify(
      members.map((m) => m.id).filter((id) => id !== exceptUserId),
      scope.familyGroupId,
      notice,
    );
  }

  // ── Feed ────────────────────────────────────────────────────────────────

  list(userId: string, limit = 50) {
    return this.db.query(
      `SELECT id, module, title, body, link, read_at AS "readAt", created_at AS "createdAt"
       FROM ${S}.dcaos_notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [userId, Math.min(Math.max(limit, 1), 200)],
    );
  }

  async unreadCount(userId: string): Promise<number> {
    const [row] = await this.db.query<{ n: string }>(
      `SELECT COUNT(*) AS n FROM ${S}.dcaos_notifications WHERE user_id = $1 AND read_at IS NULL`,
      [userId],
    );
    return Number(row?.n ?? 0);
  }

  async markRead(userId: string, id?: string) {
    await this.db.query(
      `UPDATE ${S}.dcaos_notifications SET read_at = NOW()
       WHERE user_id = $1 AND read_at IS NULL ${id ? 'AND id = $2' : ''}`,
      id ? [userId, id] : [userId],
    );
    return { success: true };
  }
}
