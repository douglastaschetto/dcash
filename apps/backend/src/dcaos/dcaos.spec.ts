import { nextDue } from './dcaos-tasks.service';
import { fill } from './dcaos.messages';
import { DcaosAccessService } from './dcaos-access.service';
import { DatabaseService } from '../database/database.service';

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shift = (days: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
};

describe('nextDue', () => {
  it('moves a future daily task one day ahead of its own due date', () => {
    expect(nextDue('daily', iso(shift(3)))).toBe(iso(shift(4)));
  });

  it('starts an overdue recurring task from today, not from the old date', () => {
    expect(nextDue('weekly', iso(shift(-10)))).toBe(iso(shift(7)));
  });

  it('uses today when there is no due date', () => {
    expect(nextDue('daily', null)).toBe(iso(shift(1)));
  });

  it('adds a calendar month for monthly tasks', () => {
    const base = shift(2);
    const expected = new Date(base);
    expected.setMonth(expected.getMonth() + 1);
    expect(nextDue('monthly', iso(base))).toBe(iso(expected));
  });
});

describe('fill', () => {
  it('replaces every placeholder', () => {
    const msg = fill('marketRanOutAgain', { item: 'leite', times: 3 });
    expect(msg).toContain('leite');
    expect(msg).not.toMatch(/\{\w+\}/);
  });
});

describe('DcaosAccessService', () => {
  let db: { query: jest.Mock };
  let service: DcaosAccessService;

  beforeEach(() => {
    db = { query: jest.fn() };
    service = new DcaosAccessService(db as unknown as DatabaseService);
  });

  it('grants access through an active family subscription', async () => {
    db.query
      .mockResolvedValueOnce([{ family_group_id: 'fg1', is_admin: false }])
      .mockResolvedValueOnce([
        {
          user_id: 'owner',
          status: 'active',
          billing_cycle: 'monthly',
          expires_at: null,
        },
      ]);
    const status = await service.getStatus('member');
    expect(status.hasAccess).toBe(true);
    expect(status.source).toBe('subscription');
    expect(status.isPurchaser).toBe(false);
    expect(db.query.mock.calls[1][1]).toEqual(['dcaos', 'fg1']);
  });

  it('denies access without subscription for regular users', async () => {
    db.query
      .mockResolvedValueOnce([{ family_group_id: null, is_admin: false }])
      .mockResolvedValueOnce([]);
    expect(await service.hasAccess('u1')).toBe(false);
  });

  it('always lets admins in', async () => {
    db.query
      .mockResolvedValueOnce([{ family_group_id: null, is_admin: true }])
      .mockResolvedValueOnce([]);
    const status = await service.getStatus('admin');
    expect(status.hasAccess).toBe(true);
    expect(status.source).toBe('admin');
  });
});

import { computeStreak } from './dcaos-habits.service';
import { nextOccurrence, describeDate } from './dcaos-dates.service';

describe('computeStreak', () => {
  const all = [0, 1, 2, 3, 4, 5, 6];
  // 2026-10-05 is a Monday
  it('counts consecutive days including today', () => {
    const done = new Set(['2026-10-05', '2026-10-04', '2026-10-03']);
    expect(computeStreak(all, done, '2026-10-05')).toBe(3);
  });

  it('does not break the streak just because today is still open', () => {
    const done = new Set(['2026-10-04', '2026-10-03']);
    expect(computeStreak(all, done, '2026-10-05')).toBe(2);
  });

  it('skips days that are not scheduled', () => {
    // weekdays only: Fri 02 + Mon 05 are consecutive scheduled days
    const done = new Set(['2026-10-02', '2026-10-05']);
    expect(computeStreak([1, 2, 3, 4, 5], done, '2026-10-05')).toBe(2);
  });

  it('breaks on a missed scheduled day', () => {
    const done = new Set(['2026-10-05', '2026-10-03']);
    expect(computeStreak(all, done, '2026-10-05')).toBe(1);
  });
});

describe('nextOccurrence', () => {
  it('returns this year when the date is still ahead', () => {
    expect(nextOccurrence('1990-12-25', true, '2026-10-06')).toBe('2026-12-25');
  });

  it('rolls to next year when the date already passed', () => {
    expect(nextOccurrence('1990-03-10', true, '2026-10-06')).toBe('2027-03-10');
  });

  it('treats today as the next occurrence', () => {
    expect(nextOccurrence('1990-10-06', true, '2026-10-06')).toBe('2026-10-06');
  });

  it('maps 29/02 to 28/02 on non-leap years', () => {
    expect(nextOccurrence('2000-02-29', true, '2026-10-06')).toBe('2027-02-28');
  });

  it('keeps one-off dates as they are', () => {
    expect(nextOccurrence('2026-11-20', false, '2026-10-06')).toBe(
      '2026-11-20',
    );
  });
});

describe('describeDate', () => {
  it('builds the birthday phrase with age', () => {
    expect(
      describeDate(
        {
          title: 'x',
          personName: 'Ana',
          kind: 'birthday',
          eventDate: '1996-11-01',
          yearKnown: true,
        },
        '2026-11-01',
      ),
    ).toBe('aniversário de Ana (30 anos)');
  });

  it('omits age when the year is unknown', () => {
    expect(
      describeDate(
        {
          title: 'x',
          personName: 'Sogra',
          kind: 'birthday',
          eventDate: '2000-11-01',
          yearKnown: false,
        },
        '2026-11-01',
      ),
    ).toBe('aniversário de Sogra');
  });
});

import { inQuietHours } from './dcaos-push.service';

describe('inQuietHours', () => {
  const at = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };

  it('is off when no window is configured', () => {
    expect(inQuietHours(null, null, at('03:00'))).toBe(false);
  });

  it('handles a same-day window', () => {
    expect(inQuietHours('13:00', '15:00', at('14:00'))).toBe(true);
    expect(inQuietHours('13:00', '15:00', at('15:00'))).toBe(false);
  });

  it('handles a window that crosses midnight', () => {
    expect(inQuietHours('22:00', '07:00', at('23:30'))).toBe(true);
    expect(inQuietHours('22:00', '07:00', at('06:59'))).toBe(true);
    expect(inQuietHours('22:00', '07:00', at('07:00'))).toBe(false);
    expect(inQuietHours('22:00', '07:00', at('12:00'))).toBe(false);
  });
});

import { firstDue } from './dcaos-tasks.service';

describe('weekday recurrence (Quem Vai Fazer?)', () => {
  // Monday, 2026-10-05
  beforeAll(() =>
    jest.useFakeTimers().setSystemTime(new Date('2026-10-05T12:00:00')),
  );
  afterAll(() => jest.useRealTimers());
  const MON_WED_FRI = [1, 3, 5];

  it('jumps to the next listed weekday after completing', () => {
    expect(nextDue('weekly', '2026-10-05', MON_WED_FRI)).toBe('2026-10-07'); // Mon → Wed
    expect(nextDue('weekly', '2026-10-09', MON_WED_FRI)).toBe('2026-10-12'); // Fri → next Mon
  });

  it('restarts overdue weekday tasks from today', () => {
    expect(nextDue('weekly', '2026-09-28', MON_WED_FRI)).toBe('2026-10-07');
  });

  it('keeps plain weekly as +7 days when no weekday is chosen', () => {
    expect(nextDue('weekly', '2026-10-05', [])).toBe('2026-10-12');
  });

  it('supports biweekly', () => {
    expect(nextDue('biweekly', '2026-10-05')).toBe('2026-10-19');
  });

  it('picks the first due date for new recurring tasks', () => {
    expect(firstDue('none')).toBeNull();
    expect(firstDue('daily')).toBe('2026-10-05');
    expect(firstDue('weekly', [1, 3, 5])).toBe('2026-10-05'); // today is Monday
    expect(firstDue('weekly', [2, 4])).toBe('2026-10-06'); // next Tuesday
    expect(firstDue('weekly', [0])).toBe('2026-10-11'); // next Sunday
  });
});

import { stepOccurrence } from './dcaos-calendar.service';

describe('stepOccurrence (calendar projection)', () => {
  it('walks weekday recurrences across week boundaries', () => {
    expect(stepOccurrence('2026-10-05', 'weekly', [1, 3, 5])).toBe(
      '2026-10-07',
    );
    expect(stepOccurrence('2026-10-09', 'weekly', [1, 3, 5])).toBe(
      '2026-10-12',
    );
  });

  it('steps fixed intervals', () => {
    expect(stepOccurrence('2026-10-05', 'daily')).toBe('2026-10-06');
    expect(stepOccurrence('2026-10-05', 'weekly')).toBe('2026-10-12');
    expect(stepOccurrence('2026-10-05', 'biweekly')).toBe('2026-10-19');
    expect(stepOccurrence('2026-10-31', 'monthly')).toBe('2026-12-01');
  });
});
