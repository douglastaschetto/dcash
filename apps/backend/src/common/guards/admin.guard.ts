import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

/**
 * Must run after JwtAuthGuard (relies on req.user.id). Replaces the manual
 * `await this.adminService.verifyAdmin(req.user.id)` call that used to be
 * repeated at the top of every AdminController method — a pattern that made
 * it easy to forget the check on a newly added route.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id;
    if (!userId)
      throw new ForbiddenException('Acesso restrito a administradores.');

    const res = await this.db.query(
      'SELECT is_admin FROM db_dtasc.users WHERE id = $1',
      [userId],
    );
    if (!res[0]?.is_admin) {
      throw new ForbiddenException('Acesso restrito a administradores.');
    }
    return true;
  }
}
