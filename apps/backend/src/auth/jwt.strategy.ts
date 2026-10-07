import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { requireJwtSecret } from './jwt-secret';
import { DatabaseService } from '../database/database.service';

type Payload = { sub: string; email: string; iat?: number };

/** Short cache so the per-request user check stays cheap. */
const CACHE_MS = 30_000;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly cache = new Map<
    string,
    { at: number; exists: boolean; changedAt: number | null }
  >();

  constructor(private readonly db: DatabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(),
    });
  }

  /**
   * Rejects tokens of deleted users and tokens issued before the last
   * password change (reset logs every old session out).
   */
  async validate(payload: Payload) {
    if (!payload?.sub) throw new UnauthorizedException('Sessão inválida.');
    const now = Date.now();
    let info = this.cache.get(payload.sub);
    if (!info || now - info.at > CACHE_MS) {
      const [row] = await this.db.query<{ changed: Date | null }>(
        'SELECT password_changed_at AS changed FROM db_dtasc.users WHERE id = $1',
        [payload.sub],
      );
      info = {
        at: now,
        exists: !!row,
        changedAt: row?.changed ? new Date(row.changed).getTime() : null,
      };
      this.cache.set(payload.sub, info);
    }
    if (!info.exists) throw new UnauthorizedException('Sessão inválida.');
    if (info.changedAt && (payload.iat ?? 0) * 1000 < info.changedAt - 1000) {
      throw new UnauthorizedException(
        'Sua senha foi alterada. Entre novamente.',
      );
    }
    return { id: payload.sub, userId: payload.sub, email: payload.email };
  }
}
