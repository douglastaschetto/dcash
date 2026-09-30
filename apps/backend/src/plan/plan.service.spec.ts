import { PlanService } from './plan.service';
import { DatabaseService } from '../database/database.service';

describe('PlanService', () => {
  let db: { query: jest.Mock };
  let service: PlanService;

  beforeEach(() => {
    db = { query: jest.fn() };
    service = new PlanService(db as unknown as DatabaseService);
  });

  describe('getEffectivePlan', () => {
    it('returns free when the user has no row', async () => {
      db.query.mockResolvedValueOnce([]);
      await expect(service.getEffectivePlan('u1')).resolves.toBe('free');
    });

    it('returns the user own plan when not in a family', async () => {
      db.query.mockResolvedValueOnce([
        {
          plan: 'pro',
          family_group_id: null,
          owner_id: null,
          owner_plan: null,
        },
      ]);
      await expect(service.getEffectivePlan('u1')).resolves.toBe('pro');
    });

    it('returns the higher of own vs family-owner plan when in a family', async () => {
      db.query.mockResolvedValueOnce([
        {
          plan: 'free',
          family_group_id: 'fg1',
          owner_id: 'owner1',
          owner_plan: 'pro',
        },
      ]);
      await expect(service.getEffectivePlan('u1')).resolves.toBe('pro');
    });

    it('keeps own plan when it is already higher than the family owner plan', async () => {
      db.query.mockResolvedValueOnce([
        {
          plan: 'pro',
          family_group_id: 'fg1',
          owner_id: 'owner1',
          owner_plan: 'free',
        },
      ]);
      await expect(service.getEffectivePlan('u1')).resolves.toBe('pro');
    });
  });

  describe('hasFeature / getNumericLimit', () => {
    beforeEach(() => {
      // ensureFeatureDefaults() no-op inserts, then getEffectivePlan, then getFeatures
      db.query.mockImplementation((sql: string) => {
        if (sql.includes('INSERT INTO')) return Promise.resolve([]);
        if (sql.includes('u.plan')) {
          return Promise.resolve([
            {
              plan: 'basico',
              family_group_id: null,
              owner_id: null,
              owner_plan: null,
            },
          ]);
        }
        if (sql.includes('SELECT feature_key')) {
          return Promise.resolve([
            {
              featureKey: 'ofx_import',
              enabled: false,
              numValue: null,
              label: '',
              description: '',
            },
            {
              featureKey: 'max_categories',
              enabled: true,
              numValue: 20,
              label: '',
              description: '',
            },
          ]);
        }
        return Promise.resolve([]);
      });
    });

    it('hasFeature reflects the enabled flag for the effective plan', async () => {
      await expect(service.hasFeature('u1', 'ofx_import')).resolves.toBe(false);
    });

    it('hasFeature defaults to false for an unknown feature key', async () => {
      await expect(service.hasFeature('u1', 'export_reports')).resolves.toBe(
        false,
      );
    });

    it('getNumericLimit returns the seeded numeric value', async () => {
      await expect(
        service.getNumericLimit('u1', 'max_categories'),
      ).resolves.toBe(20);
    });

    it('getNumericLimit returns null (unlimited) when not set', async () => {
      await expect(
        service.getNumericLimit('u1', 'max_cards'),
      ).resolves.toBeNull();
    });
  });
});
