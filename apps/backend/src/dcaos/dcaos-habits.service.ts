import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { FamilyScopeService } from '../common/scope/family-scope.service';
import { DcaosNotifyService } from './dcaos-notify.service';
import { DcaosAccessService } from './dcaos-access.service';
import { fill } from './dcaos.messages';
import { CheckHabitDto, CreateHabitDto, UpdateHabitDto } from './dto/dcaos.dto';
import {
  TZ,
  addDays,
  aliasScope,
  assertMembers,
  buildSets,
  localNow,
  parseISO,
} from './dcaos.util';

const S = 'db_dtasc';
const STREAK_MILESTONES = [7, 14, 30, 60, 100, 180, 365];

type HabitRow = {
  id: string;
  title: string;
  icon: string | null;
  daysOfWeek: number[];
  reminderTime: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  active: boolean;
  createdBy: string | null;
  checks: { date: string; userId: string; name: string | null }[] | null;
};

const dow = (iso: string) => parseISO(iso).getDay();

/**
 * Streak = consecutive *scheduled* days done, walking back from today.
 * Today only breaks the streak once it's over, so an unchecked today is skipped.
 */
export function computeStreak(
  daysOfWeek: number[],
  doneDates: Set<string>,
  today: string,
) {
  const scheduled = (iso: string) => daysOfWeek.includes(dow(iso));
  let cursor = today;
  if (!doneDates.has(today)) cursor = addDays(today, -1);
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    if (scheduled(cursor)) {
      if (!doneDates.has(cursor)) break;
      streak++;
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** "Faz Todo Dia" — habits with daily check-ins and streaks. */
@Injectable()
export class DcaosHabitsService {
  private readonly logger = new Logger(DcaosHabitsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly familyScope: FamilyScopeService,
    private readonly notify: DcaosNotifyService,
    private readonly access: DcaosAccessService,
  ) {}

  private enrich(h: HabitRow) {
    const { iso: today } = localNow();
    const checks = h.checks ?? [];
    const done = new Set(checks.map((c) => c.date));
    const days = h.daysOfWeek?.length ? h.daysOfWeek : [0, 1, 2, 3, 4, 5, 6];
    // Last 30 days completion rate (scheduled days only)
    let scheduled = 0,
      hits = 0;
    for (let i = 0; i < 30; i++) {
      const d = addDays(today, -i);
      if (!days.includes(dow(d))) continue;
      scheduled++;
      if (done.has(d)) hits++;
    }
    const todayCheck = checks.find((c) => c.date === today);
    return {
      ...h,
      daysOfWeek: days,
      checks: checks.map((c) => c.date),
      scheduledToday: days.includes(dow(today)),
      doneToday: !!todayCheck,
      doneTodayBy: todayCheck?.name ?? null,
      streak: computeStreak(days, done, today),
      rate30: scheduled ? Math.round((hits / scheduled) * 100) : 0,
    };
  }

  private query(filter: string, extra = '') {
    return `
      SELECT h.id, h.title, h.icon,
             h.days_of_week  AS "daysOfWeek",
             h.reminder_time AS "reminderTime",
             h.assignee_id   AS "assigneeId",
             a.name          AS "assigneeName",
             h.active,
             h.created_by    AS "createdBy",
             h.created_at    AS "createdAt",
             (SELECT json_agg(json_build_object('date', to_char(c.check_date, 'YYYY-MM-DD'), 'userId', c.user_id, 'name', cu.name) ORDER BY c.check_date DESC)
              FROM ${S}.dcaos_habit_checks c LEFT JOIN ${S}.users cu ON cu.id = c.user_id
              WHERE c.habit_id = h.id AND c.check_date > CURRENT_DATE - 400) AS checks
      FROM ${S}.dcaos_habits h
      LEFT JOIN ${S}.users a ON a.id = h.assignee_id
      WHERE ${filter} ${extra}
      ORDER BY h.active DESC, h.created_at`;
  }

  async list(userId: string) {
    const scope = await aliasScope(this.familyScope, userId, 1, 'h');
    const rows = await this.db.query<HabitRow>(this.query(scope.filter), [
      scope.param,
    ]);
    return rows.map((h) => this.enrich(h));
  }

  private async findOne(userId: string, id: string) {
    const scope = await aliasScope(this.familyScope, userId, 1, 'h');
    const [h] = await this.db.query<HabitRow>(
      this.query(scope.filter, 'AND h.id = $2'),
      [scope.param, id],
    );
    if (!h) throw new NotFoundException('Hábito não encontrado.');
    return this.enrich(h);
  }

  async create(userId: string, dto: CreateHabitDto) {
    await assertMembers(this.familyScope, this.notify, userId, [
      dto.assigneeId,
    ]);
    const scope = await this.familyScope.getScope(userId);
    const [row] = await this.db.query<{ id: string }>(
      `INSERT INTO ${S}.dcaos_habits (title, icon, days_of_week, reminder_time, assignee_id, created_by, user_id, family_group_id)
       VALUES ($1, $2, $3, $4, $5, $6, $6, $7) RETURNING id`,
      [
        dto.title.trim(),
        dto.icon || null,
        dto.daysOfWeek?.length ? dto.daysOfWeek : [0, 1, 2, 3, 4, 5, 6],
        dto.reminderTime || null,
        dto.assigneeId || null,
        userId,
        scope.familyGroupId,
      ],
    );
    return this.findOne(userId, row.id);
  }

  async update(userId: string, id: string, dto: UpdateHabitDto) {
    await this.findOne(userId, id);
    await assertMembers(this.familyScope, this.notify, userId, [
      dto.assigneeId,
    ]);
    const { sets, params } = buildSets({
      title: dto.title?.trim(),
      icon: dto.icon === undefined ? undefined : dto.icon || null,
      days_of_week: dto.daysOfWeek?.length ? dto.daysOfWeek : undefined,
      reminder_time:
        dto.reminderTime === undefined ? undefined : dto.reminderTime || null,
      assignee_id:
        dto.assigneeId === undefined ? undefined : dto.assigneeId || null,
      active: dto.active,
    });
    if (sets.length) {
      params.push(id);
      await this.db.query(
        `UPDATE ${S}.dcaos_habits SET ${sets.join(', ')} WHERE id = $${params.length}`,
        params,
      );
    }
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.db.query(`DELETE FROM ${S}.dcaos_habits WHERE id = $1`, [id]);
    return { success: true };
  }

  async check(userId: string, id: string, dto: CheckHabitDto) {
    await this.findOne(userId, id);
    const date = dto.date ?? localNow().iso;
    await this.db.query(
      `INSERT INTO ${S}.dcaos_habit_checks (habit_id, user_id, check_date) VALUES ($1, $2, $3)
       ON CONFLICT (habit_id, check_date) DO NOTHING`,
      [id, userId, date],
    );
    const habit = await this.findOne(userId, id);
    if (STREAK_MILESTONES.includes(habit.streak)) {
      await this.notify.notifyFamily(userId, {
        module: 'habits',
        body: fill('habitStreak', { days: habit.streak, title: habit.title }),
        link: '/dcaos/habitos',
        dedupeKey: `habit-streak:${id}:${habit.streak}:${date}`,
      });
    }
    return habit;
  }

  async uncheck(userId: string, id: string, dto: CheckHabitDto) {
    await this.findOne(userId, id);
    await this.db.query(
      `DELETE FROM ${S}.dcaos_habit_checks WHERE habit_id = $1 AND check_date = $2`,
      [id, dto.date ?? localNow().iso],
    );
    return this.findOne(userId, id);
  }

  /** Hourly: habits whose reminder hour is now, scheduled today and not done yet. */
  @Cron('0 * * * *')
  async remind() {
    const { iso: today, hour, dow: weekday } = localNow();
    const hh = String(hour).padStart(2, '0');
    const rows = await this.db.query<{
      id: string;
      title: string;
      assignee_id: string | null;
      user_id: string;
      family_group_id: string | null;
    }>(
      `SELECT h.id, h.title, h.assignee_id, h.user_id, h.family_group_id
       FROM ${S}.dcaos_habits h
       WHERE h.active = true AND h.reminder_time LIKE $1 AND $2 = ANY(h.days_of_week)
         AND NOT EXISTS (SELECT 1 FROM ${S}.dcaos_habit_checks c WHERE c.habit_id = h.id AND c.check_date = $3::date)`,
      [`${hh}:%`, weekday, today],
    );
    for (const h of rows) {
      if (!(await this.access.hasAccess(h.user_id))) continue;
      let recipients = h.assignee_id ? [h.assignee_id] : [];
      if (!recipients.length) {
        const scope = await this.familyScope.getScope(h.user_id);
        recipients = (await this.notify.members(scope, h.user_id)).map(
          (m) => m.id,
        );
      }
      await this.notify.notify(recipients, h.family_group_id, {
        module: 'habits',
        body: fill('habitReminder', { title: h.title }),
        link: '/dcaos/habitos',
        dedupeKey: `habit:${h.id}:${today}`,
      });
    }
    if (rows.length)
      this.logger.log(`Habit reminders sent (${TZ} ${hh}h): ${rows.length}`);
  }
}
