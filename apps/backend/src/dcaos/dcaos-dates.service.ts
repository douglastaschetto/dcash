import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { FamilyScopeService } from '../common/scope/family-scope.service';
import { DcaosNotifyService } from './dcaos-notify.service';
import { DcaosAccessService } from './dcaos-access.service';
import { fill } from './dcaos.messages';
import {
  CreateImportantDateDto,
  UpdateImportantDateDto,
} from './dto/dcaos.dto';
import {
  TZ,
  aliasScope,
  buildSets,
  daysBetween,
  localNow,
  toISO,
} from './dcaos.util';

const S = 'db_dtasc';

type DateRow = {
  id: string;
  title: string;
  personName: string | null;
  kind: string;
  eventDate: string;
  yearKnown: boolean;
  yearly: boolean;
  remindDaysBefore: number;
  notes: string | null;
  createdBy: string | null;
  createdByName: string | null;
};

/** Next occurrence (today counts) of a yearly date; one-off dates return themselves. */
export function nextOccurrence(
  eventDate: string,
  yearly: boolean,
  today: string,
) {
  if (!yearly) return eventDate;
  const [, m, d] = eventDate.split('-').map(Number);
  const year = Number(today.slice(0, 4));
  const build = (y: number) => {
    // 29/02 falls back to 28/02 on non-leap years
    const last = new Date(y, m, 0).getDate();
    return toISO(new Date(y, m - 1, Math.min(d, last)));
  };
  const thisYear = build(year);
  return thisYear >= today ? thisYear : build(year + 1);
}

/** "aniversário da Ana (30 anos)" — the phrase used inside notifications. */
export function describeDate(
  row: Pick<
    DateRow,
    'title' | 'personName' | 'kind' | 'eventDate' | 'yearKnown'
  >,
  next: string,
) {
  const years = row.yearKnown
    ? Number(next.slice(0, 4)) - Number(row.eventDate.slice(0, 4))
    : null;
  if (row.kind === 'birthday' && row.personName) {
    return `aniversário de ${row.personName}${years && years > 0 ? ` (${years} anos)` : ''}`;
  }
  if (row.kind === 'anniversary') {
    return `${row.title}${years && years > 0 ? ` (${years} ano${years === 1 ? '' : 's'})` : ''}`;
  }
  return row.title;
}

/** "Não Esquece" — birthdays, anniversaries and other important dates. */
@Injectable()
export class DcaosDatesService {
  private readonly logger = new Logger(DcaosDatesService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly familyScope: FamilyScopeService,
    private readonly notify: DcaosNotifyService,
    private readonly access: DcaosAccessService,
  ) {}

  private select(filter: string, extra = '') {
    return `
      SELECT d.id, d.title, d.person_name AS "personName", d.kind,
             to_char(d.event_date, 'YYYY-MM-DD') AS "eventDate",
             d.year_known AS "yearKnown", d.yearly,
             d.remind_days_before AS "remindDaysBefore", d.notes,
             d.created_by AS "createdBy", u.name AS "createdByName"
      FROM ${S}.dcaos_important_dates d
      LEFT JOIN ${S}.users u ON u.id = d.created_by
      WHERE ${filter} ${extra}`;
  }

  private enrich(row: DateRow) {
    const { iso: today } = localNow();
    const next = nextOccurrence(row.eventDate, row.yearly, today);
    const daysUntil = daysBetween(today, next);
    const years = row.yearKnown
      ? Number(next.slice(0, 4)) - Number(row.eventDate.slice(0, 4))
      : null;
    return {
      ...row,
      nextDate: next,
      daysUntil,
      years: years !== null && years > 0 ? years : null,
      past: daysUntil < 0,
    };
  }

  async list(userId: string) {
    const scope = await aliasScope(this.familyScope, userId, 1, 'd');
    const rows = await this.db.query<DateRow>(this.select(scope.filter), [
      scope.param,
    ]);
    return rows
      .map((r) => this.enrich(r))
      .sort((a, b) => {
        if (a.past !== b.past) return a.past ? 1 : -1;
        return a.past ? b.daysUntil - a.daysUntil : a.daysUntil - b.daysUntil;
      });
  }

  private async findOne(userId: string, id: string) {
    const scope = await aliasScope(this.familyScope, userId, 1, 'd');
    const [row] = await this.db.query<DateRow>(
      this.select(scope.filter, 'AND d.id = $2'),
      [scope.param, id],
    );
    if (!row) throw new NotFoundException('Data não encontrada.');
    return this.enrich(row);
  }

  async create(userId: string, dto: CreateImportantDateDto) {
    const scope = await this.familyScope.getScope(userId);
    const [row] = await this.db.query<{ id: string }>(
      `INSERT INTO ${S}.dcaos_important_dates
         (title, person_name, kind, event_date, year_known, yearly, remind_days_before, notes, created_by, user_id, family_group_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10) RETURNING id`,
      [
        dto.title.trim(),
        dto.personName?.trim() || null,
        dto.kind ?? 'birthday',
        dto.eventDate,
        dto.yearKnown ?? true,
        dto.yearly ?? true,
        dto.remindDaysBefore ?? 3,
        dto.notes || null,
        userId,
        scope.familyGroupId,
      ],
    );
    return this.findOne(userId, row.id);
  }

  async update(userId: string, id: string, dto: UpdateImportantDateDto) {
    await this.findOne(userId, id);
    const { sets, params } = buildSets({
      title: dto.title?.trim(),
      person_name:
        dto.personName === undefined
          ? undefined
          : dto.personName?.trim() || null,
      kind: dto.kind,
      event_date: dto.eventDate,
      year_known: dto.yearKnown,
      yearly: dto.yearly,
      remind_days_before: dto.remindDaysBefore,
      notes: dto.notes === undefined ? undefined : dto.notes || null,
    });
    if (sets.length) {
      params.push(id);
      await this.db.query(
        `UPDATE ${S}.dcaos_important_dates SET ${sets.join(', ')} WHERE id = $${params.length}`,
        params,
      );
    }
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.db.query(
      `DELETE FROM ${S}.dcaos_important_dates WHERE id = $1`,
      [id],
    );
    return { success: true };
  }

  /** Daily: notify on the day, on "remind N days before" and the day before. */
  @Cron('0 8 * * *', { timeZone: TZ })
  async remind() {
    const { iso: today } = localNow();
    const rows = await this.db.query<
      DateRow & { user_id: string; family_group_id: string | null }
    >(
      `SELECT d.id, d.title, d.person_name AS "personName", d.kind,
              to_char(d.event_date, 'YYYY-MM-DD') AS "eventDate",
              d.year_known AS "yearKnown", d.yearly, d.remind_days_before AS "remindDaysBefore",
              d.user_id, d.family_group_id
       FROM ${S}.dcaos_important_dates d`,
    );
    let sent = 0;
    for (const r of rows) {
      const next = nextOccurrence(r.eventDate, r.yearly, today);
      const days = daysBetween(today, next);
      if (!(days === 0 || days === 1 || days === r.remindDaysBefore)) continue;
      if (!(await this.access.hasAccess(r.user_id))) continue;
      const scope = await this.familyScope.getScope(r.user_id);
      const members = await this.notify.members(scope, r.user_id);
      const label = describeDate(r, next);
      await this.notify.notify(
        members.map((m) => m.id),
        r.family_group_id,
        {
          module: 'dates',
          body:
            days === 0
              ? fill('dateToday', { title: label })
              : fill('dateSoon', { title: label, days }),
          link: '/dcaos/datas',
          dedupeKey: `date:${r.id}:${next}:${days}`,
        },
      );
      sent++;
    }
    if (sent) this.logger.log(`Important-date reminders sent: ${sent}`);
  }
}
