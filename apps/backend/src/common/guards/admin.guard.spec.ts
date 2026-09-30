import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { DatabaseService } from '../../database/database.service';

function contextWithUser(userId: string | undefined) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: userId ? { id: userId } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  let db: { query: jest.Mock };
  let guard: AdminGuard;

  beforeEach(() => {
    db = { query: jest.fn() };
    guard = new AdminGuard(db as unknown as DatabaseService);
  });

  it('rejects when there is no authenticated user on the request', async () => {
    await expect(
      guard.canActivate(contextWithUser(undefined)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('rejects when the user exists but is_admin is false', async () => {
    db.query.mockResolvedValueOnce([{ is_admin: false }]);
    await expect(
      guard.canActivate(contextWithUser('u1')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects when the user id does not resolve to any row', async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(
      guard.canActivate(contextWithUser('ghost')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows access when is_admin is true', async () => {
    db.query.mockResolvedValueOnce([{ is_admin: true }]);
    await expect(guard.canActivate(contextWithUser('admin1'))).resolves.toBe(
      true,
    );
  });
});
