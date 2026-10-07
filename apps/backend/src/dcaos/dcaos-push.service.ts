import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { DatabaseService } from '../database/database.service';
import { TZ } from './dcaos.util';
import { PreferencesDto, PushSubscribeDto } from './dto/dcaos.dto';

const S = 'db_dtasc';

export type PushPayload = {
  title: string;
  body: string;
  link?: string | null;
  tag?: string;
  badge?: number;
};

export type Prefs = {
  pushEnabled: boolean;
  mutedModules: string[];
  quietStart: string | null;
  quietEnd: string | null;
};

const DEFAULT_PREFS: Prefs = {
  pushEnabled: true,
  mutedModules: [],
  quietStart: null,
  quietEnd: null,
};

/** Minutes since midnight in the household timezone. */
function nowMinutes(date = new Date()) {
  const [h, m] = date
    .toLocaleTimeString('en-GB', {
      timeZone: TZ,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    .split(':')
    .map(Number);
  return h * 60 + m;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Quiet window may cross midnight (e.g. 22:00 → 07:00). */
export function inQuietHours(
  start: string | null,
  end: string | null,
  minutes = nowMinutes(),
) {
  if (!start || !end || start === end) return false;
  const s = toMinutes(start);
  const e = toMinutes(end);
  return s < e ? minutes >= s && minutes < e : minutes >= s || minutes < e;
}

/**
 * Web Push delivery for DCaos notifications. VAPID keys come from the env
 * (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT); without them the
 * module keeps working with in-app notifications only.
 */
@Injectable()
export class DcaosPushService {
  private readonly logger = new Logger(DcaosPushService.name);
  private readonly configured: boolean;

  constructor(private readonly db: DatabaseService) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    this.configured = !!(publicKey && privateKey);
    if (this.configured) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:contato@dcash.app',
        publicKey!,
        privateKey!,
      );
    } else {
      this.logger.warn(
        'Web Push desativado — defina VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY.',
      );
    }
  }

  get isConfigured() {
    return this.configured;
  }

  publicKey() {
    return {
      publicKey: this.configured ? process.env.VAPID_PUBLIC_KEY : null,
      configured: this.configured,
    };
  }

  // ── Devices ─────────────────────────────────────────────────────────────

  async subscribe(userId: string, dto: PushSubscribeDto) {
    if (!this.configured)
      throw new BadRequestException(
        'Notificações no dispositivo não estão configuradas no servidor.',
      );
    await this.db.query(
      `INSERT INTO ${S}.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint) DO UPDATE
         SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
             user_agent = EXCLUDED.user_agent, failures = 0`,
      [
        userId,
        dto.endpoint,
        dto.p256dh,
        dto.auth,
        dto.userAgent?.slice(0, 300) ?? null,
      ],
    );
    return { success: true };
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.db.query(
      `DELETE FROM ${S}.push_subscriptions WHERE user_id = $1 AND endpoint = $2`,
      [userId, endpoint],
    );
    return { success: true };
  }

  devices(userId: string) {
    return this.db.query(
      `SELECT id, endpoint, user_agent AS "userAgent", created_at AS "createdAt", last_used_at AS "lastUsedAt"
       FROM ${S}.push_subscriptions WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
  }

  async removeDevice(userId: string, id: string) {
    await this.db.query(
      `DELETE FROM ${S}.push_subscriptions WHERE user_id = $1 AND id = $2`,
      [userId, id],
    );
    return { success: true };
  }

  // ── Preferences ─────────────────────────────────────────────────────────

  async getPrefs(userId: string): Promise<Prefs> {
    const [row] = await this.db.query<Prefs>(
      `SELECT push_enabled AS "pushEnabled", muted_modules AS "mutedModules",
              quiet_start AS "quietStart", quiet_end AS "quietEnd"
       FROM ${S}.dcaos_notification_prefs WHERE user_id = $1`,
      [userId],
    );
    return row ?? { ...DEFAULT_PREFS };
  }

  async updatePrefs(userId: string, dto: PreferencesDto): Promise<Prefs> {
    const current = await this.getPrefs(userId);
    const next: Prefs = {
      pushEnabled: dto.pushEnabled ?? current.pushEnabled,
      mutedModules: dto.mutedModules ?? current.mutedModules,
      quietStart:
        dto.quietStart === undefined
          ? current.quietStart
          : dto.quietStart || null,
      quietEnd:
        dto.quietEnd === undefined ? current.quietEnd : dto.quietEnd || null,
    };
    await this.db.query(
      `INSERT INTO ${S}.dcaos_notification_prefs (user_id, push_enabled, muted_modules, quiet_start, quiet_end, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET push_enabled = $2, muted_modules = $3, quiet_start = $4, quiet_end = $5, updated_at = NOW()`,
      [
        userId,
        next.pushEnabled,
        next.mutedModules,
        next.quietStart,
        next.quietEnd,
      ],
    );
    return next;
  }

  // ── Delivery ────────────────────────────────────────────────────────────

  /** Respects the user's switches; `force` (test button) ignores mute/quiet hours. */
  async sendToUser(
    userId: string,
    module: string,
    payload: PushPayload,
    force = false,
  ): Promise<number> {
    if (!this.configured) return 0;
    if (!force) {
      const prefs = await this.getPrefs(userId);
      if (!prefs.pushEnabled || prefs.mutedModules.includes(module)) return 0;
      if (inQuietHours(prefs.quietStart, prefs.quietEnd)) return 0;
    }
    const subs = await this.db.query<{
      id: string;
      endpoint: string;
      p256dh: string;
      auth: string;
      failures: number;
    }>(
      `SELECT id, endpoint, p256dh, auth, failures FROM ${S}.push_subscriptions WHERE user_id = $1`,
      [userId],
    );
    let delivered = 0;
    const body = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            body,
            {
              TTL: 60 * 60 * 12,
              urgency: 'normal',
              topic: payload.tag?.slice(0, 32),
            },
          );
          delivered++;
          await this.db.query(
            `UPDATE ${S}.push_subscriptions SET last_used_at = NOW(), failures = 0 WHERE id = $1`,
            [sub.id],
          );
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410 || sub.failures >= 4) {
            await this.db.query(
              `DELETE FROM ${S}.push_subscriptions WHERE id = $1`,
              [sub.id],
            );
          } else {
            await this.db.query(
              `UPDATE ${S}.push_subscriptions SET failures = failures + 1 WHERE id = $1`,
              [sub.id],
            );
            this.logger.warn(
              `Push failed (${status ?? 'erro'}) for device ${sub.id}: ${(err as Error).message}`,
            );
          }
        }
      }),
    );
    return delivered;
  }
}
