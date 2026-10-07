import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../common/email/email.service';
import { requireJwtSecret } from './jwt-secret';

const S = 'db_dtasc';

export type CodePurpose = 'verify_email' | 'login' | 'reset_password';

const TTL_MIN: Record<CodePurpose, number> = {
  verify_email: 30,
  login: 10,
  reset_password: 15,
};
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_S = 45;
const DEVICE_DAYS = 30;

const sha = (v: string) => createHash('sha256').update(v).digest('hex');

/** "douglas@gmail.com" → "do•••••@gmail.com" */
export function maskEmail(email: string) {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  return `${user.slice(0, 2)}${'•'.repeat(Math.max(3, user.length - 2))}@${domain}`;
}

/**
 * E-mail codes for the second factor: account verification, login on a new
 * device and password reset. Codes are stored hashed, expire quickly and
 * lock after a few wrong attempts. A signed "challenge" (separate secret, so
 * it can never be used as an API token) links the code screen to the e-mail.
 */
@Injectable()
export class AuthCodesService {
  private readonly challengeSecret = `${requireJwtSecret()}:auth-challenge`;

  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
  ) {}

  // ── Challenge ───────────────────────────────────────────────────────────

  signChallenge(email: string, purpose: CodePurpose) {
    return this.jwt.sign(
      { email: email.toLowerCase(), purpose, typ: 'auth-challenge' },
      { secret: this.challengeSecret, expiresIn: '40m' },
    );
  }

  readChallenge(
    challenge: string,
    expected?: CodePurpose,
  ): { email: string; purpose: CodePurpose } {
    try {
      const p = this.jwt.verify<{
        email: string;
        purpose: CodePurpose;
        typ: string;
      }>(challenge, { secret: this.challengeSecret });
      if (p.typ !== 'auth-challenge' || (expected && p.purpose !== expected))
        throw new Error('wrong purpose');
      return { email: p.email, purpose: p.purpose };
    } catch {
      throw new UnauthorizedException(
        'Sessão de verificação expirada. Comece de novo.',
      );
    }
  }

  // ── Codes ───────────────────────────────────────────────────────────────

  private hash(userId: string, purpose: CodePurpose, code: string) {
    return sha(`${userId}:${purpose}:${code}`);
  }

  /**
   * Sends a fresh code. With `reuseRecent`, a code sent seconds ago is kept
   * (double-click / retried login don't spam the inbox).
   */
  async issue(
    user: { id: string; email: string; name?: string | null },
    purpose: CodePurpose,
    opts: { reuseRecent?: boolean } = {},
  ) {
    const [last] = await this.db.query<{ age: number }>(
      `SELECT EXTRACT(EPOCH FROM (NOW() - created_at))::int AS age FROM ${S}.auth_codes
       WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [user.id, purpose],
    );
    if (last && last.age < RESEND_COOLDOWN_S) {
      if (opts.reuseRecent) return;
      throw new BadRequestException(
        `Aguarde ${RESEND_COOLDOWN_S - last.age}s para pedir outro código.`,
      );
    }
    await this.db.query(
      `UPDATE ${S}.auth_codes SET used_at = NOW() WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL`,
      [user.id, purpose],
    );
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.db.query(
      `INSERT INTO ${S}.auth_codes (user_id, purpose, code_hash, expires_at)
       VALUES ($1, $2, $3, NOW() + make_interval(mins => $4))`,
      [user.id, purpose, this.hash(user.id, purpose, code), TTL_MIN[purpose]],
    );
    await this.email.sendAuthCode(
      user.email,
      user.name ?? null,
      code,
      purpose,
      TTL_MIN[purpose],
    );
  }

  /** Throws a friendly error on wrong/expired codes; consumes the code on success. */
  async verify(userId: string, purpose: CodePurpose, code: string) {
    const [row] = await this.db.query<{
      id: string;
      code_hash: string;
      attempts: number;
    }>(
      `SELECT id, code_hash, attempts FROM ${S}.auth_codes
       WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId, purpose],
    );
    if (!row) throw new BadRequestException('Código expirado. Peça um novo.');
    if (row.attempts >= MAX_ATTEMPTS)
      throw new BadRequestException('Muitas tentativas. Peça um novo código.');

    const given = Buffer.from(this.hash(userId, purpose, code.trim()));
    const stored = Buffer.from(row.code_hash);
    const ok = given.length === stored.length && timingSafeEqual(given, stored);
    if (!ok) {
      await this.db.query(
        `UPDATE ${S}.auth_codes SET attempts = attempts + 1 WHERE id = $1`,
        [row.id],
      );
      const left = MAX_ATTEMPTS - row.attempts - 1;
      throw new BadRequestException(
        left > 0
          ? `Código incorreto. ${left} tentativa${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''}.`
          : 'Muitas tentativas. Peça um novo código.',
      );
    }
    await this.db.query(
      `UPDATE ${S}.auth_codes SET used_at = NOW() WHERE id = $1`,
      [row.id],
    );
  }

  // ── OAuth one-time code (Google login redirect) ─────────────────────────

  /** Single-use, 2-minute code that the app exchanges for the session token. */
  async issueOAuthCode(userId: string, firstLogin: boolean) {
    const raw = randomBytes(32).toString('hex');
    await this.db.query(
      `INSERT INTO ${S}.auth_codes (user_id, purpose, code_hash, expires_at, meta)
       VALUES ($1, 'oauth', $2, NOW() + INTERVAL '2 minutes', $3::jsonb)`,
      [userId, sha(raw), JSON.stringify({ firstLogin })],
    );
    return raw;
  }

  async consumeOAuthCode(raw: string) {
    const [row] = await this.db.query<{
      user_id: string;
      meta: { firstLogin?: boolean } | null;
    }>(
      `UPDATE ${S}.auth_codes SET used_at = NOW()
       WHERE code_hash = $1 AND purpose = 'oauth' AND used_at IS NULL AND expires_at > NOW()
       RETURNING user_id, meta`,
      [sha(raw ?? '')],
    );
    if (!row)
      throw new UnauthorizedException(
        'Login expirado. Entre com o Google novamente.',
      );
    return { userId: row.user_id, firstLogin: !!row.meta?.firstLogin };
  }

  // ── Trusted devices ─────────────────────────────────────────────────────

  async trustDevice(userId: string, userAgent?: string) {
    const raw = randomBytes(32).toString('hex');
    await this.db.query(
      `INSERT INTO ${S}.trusted_devices (user_id, token_hash, user_agent, expires_at)
       VALUES ($1, $2, $3, NOW() + make_interval(days => $4))`,
      [userId, sha(raw), userAgent?.slice(0, 300) ?? null, DEVICE_DAYS],
    );
    return raw;
  }

  async isTrusted(userId: string, rawToken?: string | null) {
    if (!rawToken) return false;
    const rows = await this.db.query<{ id: string }>(
      `UPDATE ${S}.trusted_devices SET last_used_at = NOW()
       WHERE user_id = $1 AND token_hash = $2 AND expires_at > NOW() RETURNING id`,
      [userId, sha(rawToken)],
    );
    return rows.length > 0;
  }

  revokeDevices(userId: string) {
    return this.db.query(
      `DELETE FROM ${S}.trusted_devices WHERE user_id = $1`,
      [userId],
    );
  }
}
