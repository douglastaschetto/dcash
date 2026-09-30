import { FamilyScopeService } from './family-scope.service';
import { DatabaseService } from '../../database/database.service';

describe('FamilyScopeService', () => {
  let db: { query: jest.Mock };
  let service: FamilyScopeService;

  beforeEach(() => {
    db = { query: jest.fn() };
    service = new FamilyScopeService(db as unknown as DatabaseService);
  });

  it('scopes to the user alone when there is no family group', async () => {
    db.query.mockResolvedValueOnce([{ family_group_id: null }]);
    const scope = await service.getScope('u1');
    expect(scope.isFamily).toBe(false);
    expect(scope.param).toBe('u1');
    expect(scope.filter).toBe('user_id = $1 AND family_group_id IS NULL');
  });

  it('scopes to the family group when the user belongs to one', async () => {
    db.query.mockResolvedValueOnce([{ family_group_id: 'fg1' }]);
    const scope = await service.getScope('u1');
    expect(scope.isFamily).toBe(true);
    expect(scope.param).toBe('fg1');
    expect(scope.filter).toBe('family_group_id = $1');
  });

  it('filterAt binds the same rule at an arbitrary placeholder index', async () => {
    db.query.mockResolvedValueOnce([{ family_group_id: 'fg1' }]);
    const scope = await service.getScope('u1');
    expect(service.filterAt(scope, 3)).toBe('family_group_id = $3');
  });
});
