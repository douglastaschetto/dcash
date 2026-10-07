import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FamilyScopeService } from '../common/scope/family-scope.service';
import { DcaosTasksService } from './dcaos-tasks.service';
import { DcaosHabitsService } from './dcaos-habits.service';
import { DcaosDatesService, describeDate } from './dcaos-dates.service';
import { DcaosMaintenanceService } from './dcaos-maintenance.service';
import {
  TZ,
  addDays,
  aliasScope,
  localNow,
  parseISO,
  toISO,
} from './dcaos.util';

const S = 'db_dtasc';

export type CalendarItem = {
  id: string;
  /** Source record (task id, habit day, date id…) for actions/links. */
  refId: string;
  kind: 'task' | 'habits' | 'date' | 'maintenance';
  date: string;
  title: string;
  subtitle?: string | null;
  done: boolean;
  overdue?: boolean;
  /** Only the real (non-projected) occurrence of a task can be completed. */
  actionable?: boolean;
  link: string;
  children?: {
    id: string;
    title: string;
    icon: string | null;
    done: boolean;
  }[];
};

/** Next occurrence strictly after `date` (no "restart from today" clamp). */
export function stepOccurrence(
  date: string,
  recurrence: string,
  days: number[] = [],
): string {
  const d = parseISO(date);
  if (recurrence === 'weekly' && days.length) {
    for (let i = 0; i < 7; i++) {
      d.setDate(d.getDate() + 1);
      if (days.includes(d.getDay())) return toISO(d);
    }
    return toISO(d);
  }
  if (recurrence === 'daily') d.setDate(d.getDate() + 1);
  else if (recurrence === 'weekly') d.setDate(d.getDate() + 7);
  else if (recurrence === 'biweekly') d.setDate(d.getDate() + 14);
  else if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1);
  return toISO(d);
}

const DATE_KIND_LABEL: Record<string, string> = {
  birthday: 'Aniversário',
  anniversary: 'Data do casal',
  commemorative: 'Comemorativa',
  document: 'Documento/prazo',
  other: 'Data importante',
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * DCaos layer of the unified DCash calendar: everything household-related that
 * lands on a day of the given month (tasks incl. projected recurrences and
 * completions, daily habit summary, important dates, preventive maintenance).
 */
@Injectable()
export class DcaosCalendarService {
  constructor(
    private readonly db: DatabaseService,
    private readonly familyScope: FamilyScopeService,
    private readonly tasks: DcaosTasksService,
    private readonly habits: DcaosHabitsService,
    private readonly dates: DcaosDatesService,
    private readonly maintenance: DcaosMaintenanceService,
  ) {}

  async month(
    userId: string,
    month: number,
    year: number,
  ): Promise<CalendarItem[]> {
    const mm = String(month).padStart(2, '0');
    const first = `${year}-${mm}-01`;
    const last = toISO(new Date(year, month, 0));
    const { iso: today } = localNow();
    const inMonth = (d: string) => d >= first && d <= last;
    const items: CalendarItem[] = [];

    const [tasks, habits, dates, maintenance, completions] = await Promise.all([
      this.tasks.list(userId),
      this.habits.list(userId),
      this.dates.list(userId),
      this.maintenance.list(userId),
      this.completions(userId, first, last),
    ]);

    // ── Tasks: real due date, projected recurrences, completions ─────────
    for (const t of tasks as {
      id: string;
      title: string;
      isCompleted: boolean;
      dueDate: string | null;
      recurrence: string;
      recurrenceDays: number[] | null;
      assigneeName: string | null;
    }[]) {
      if (t.isCompleted || !t.dueDate) continue;
      const who = t.assigneeName
        ? t.assigneeName.split(' ')[0]
        : 'Sem responsável';
      const push = (d: string, real: boolean) =>
        inMonth(d) &&
        items.push({
          id: `task:${t.id}:${d}`,
          refId: t.id,
          kind: 'task',
          date: d,
          title: t.title,
          subtitle: who,
          done: false,
          overdue: d < today,
          actionable: real,
          link: '/dcaos/tarefas',
        });
      push(t.dueDate, true);
      if (!t.recurrence || t.recurrence === 'none') continue;
      // Upcoming occurrences follow the same rule as completing: from max(due, today)
      let cursor = t.dueDate < today ? today : t.dueDate;
      for (let i = 0; i < 70; i++) {
        cursor = stepOccurrence(cursor, t.recurrence, t.recurrenceDays ?? []);
        if (cursor > last) break;
        push(cursor, false);
      }
    }
    for (const c of completions) {
      items.push({
        id: `done:${c.id}`,
        refId: c.task_id ?? c.id,
        kind: 'task',
        date: c.day,
        title: c.title,
        subtitle: c.name ? `feita por ${c.name.split(' ')[0]}` : 'feita',
        done: true,
        link: '/dcaos/tarefas',
      });
    }

    // ── Habits: one summary per day ─────────────────────────────────────
    const activeHabits = (
      habits as {
        id: string;
        title: string;
        icon: string | null;
        active: boolean;
        daysOfWeek: number[];
        checks: string[];
        createdAt?: string;
      }[]
    ).filter((h) => h.active);
    if (activeHabits.length) {
      for (let d = first; d <= last; d = addDays(d, 1)) {
        const dow = parseISO(d).getDay();
        const scheduled = activeHabits.filter((h) => {
          const created = h.createdAt
            ? new Date(h.createdAt).toLocaleDateString('en-CA', {
                timeZone: TZ,
              })
            : first;
          return h.daysOfWeek.includes(dow) && d >= created;
        });
        if (!scheduled.length) continue;
        const children = scheduled.map((h) => ({
          id: h.id,
          title: h.title,
          icon: h.icon,
          done: h.checks.includes(d),
        }));
        const done = children.filter((c) => c.done).length;
        items.push({
          id: `habits:${d}`,
          refId: d,
          kind: 'habits',
          date: d,
          title: `Hábitos ${done}/${children.length}`,
          subtitle:
            done === children.length
              ? 'Tudo feito'
              : d < today
                ? 'Ficou pendente'
                : null,
          done: done === children.length,
          overdue: d < today && done < children.length,
          link: '/dcaos/habitos',
          children,
        });
      }
    }

    // ── Important dates ─────────────────────────────────────────────────
    for (const dt of dates as {
      id: string;
      title: string;
      personName: string | null;
      kind: string;
      eventDate: string;
      yearKnown: boolean;
      yearly: boolean;
    }[]) {
      let occ: string | null = null;
      if (dt.yearly) {
        const [, m, day] = dt.eventDate.split('-').map(Number);
        if (m === month) {
          const lastDay = new Date(year, month, 0).getDate();
          occ = `${year}-${mm}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
        }
      } else if (inMonth(dt.eventDate)) {
        occ = dt.eventDate;
      }
      if (!occ) continue;
      items.push({
        id: `date:${dt.id}`,
        refId: dt.id,
        kind: 'date',
        date: occ,
        title: capitalize(describeDate(dt, occ)),
        subtitle: DATE_KIND_LABEL[dt.kind] ?? null,
        done: occ < today,
        link: '/dcaos/datas',
      });
    }

    // ── Preventive maintenance due this month ─────────────────────────────
    for (const m of maintenance as {
      id: string;
      title: string;
      kind: string;
      status: string;
      nextDue: string | null;
      area: string | null;
    }[]) {
      if (m.kind !== 'preventive' || !m.nextDue || !inMonth(m.nextDue))
        continue;
      items.push({
        id: `maint:${m.id}`,
        refId: m.id,
        kind: 'maintenance',
        date: m.nextDue,
        title: m.title,
        subtitle: m.area ? `Preventiva · ${m.area}` : 'Preventiva',
        done: false,
        overdue: m.nextDue < today,
        link: '/dcaos/manutencao',
      });
    }

    return items.sort((a, b) => a.date.localeCompare(b.date));
  }

  private async completions(userId: string, first: string, last: string) {
    const scope = await aliasScope(this.familyScope, userId, 3, 'l');
    return this.db.query<{
      id: string;
      task_id: string | null;
      title: string;
      name: string | null;
      day: string;
    }>(
      `SELECT l.id, l.task_id, l.title, u.name,
              to_char((l.completed_at AT TIME ZONE '${TZ}')::date, 'YYYY-MM-DD') AS day
       FROM ${S}.dcaos_task_log l
       LEFT JOIN ${S}.users u ON u.id = l.user_id
       WHERE (l.completed_at AT TIME ZONE '${TZ}')::date BETWEEN $1::date AND $2::date
         AND ${scope.filter}
       ORDER BY l.completed_at`,
      [first, last, scope.param],
    );
  }
}
