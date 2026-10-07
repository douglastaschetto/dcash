import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { FamilyScopeService } from '../common/scope/family-scope.service';
import { DcaosNotifyService } from './dcaos-notify.service';
import { DcaosAccessService } from './dcaos-access.service';
import { fill } from './dcaos.messages';
import { CreateTaskDto, UpdateTaskDto } from './dto/dcaos.dto';

const S = 'db_dtasc';

const TASK_FIELDS = `
  t.id, t.title, t.notes,
  t.is_completed                     AS "isCompleted",
  t.assignee_id                      AS "assigneeId",
  a.name                             AS "assigneeName",
  t.created_by                       AS "createdBy",
  to_char(t.due_date, 'YYYY-MM-DD')  AS "dueDate",
  t.recurrence, t.points, t.area,
  t.recurrence_days                  AS "recurrenceDays",
  t.completed_at                     AS "completedAt",
  t.completed_by                     AS "completedBy",
  cb.name                            AS "completedByName",
  t.user_id                          AS "userId",
  t.created_at                       AS "createdAt"
`;

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** First date >= `from` (or > when `strict`) falling on one of `days` (0 = Sun). */
function nextWeekday(from: Date, days: number[], strict: boolean): Date {
  const d = new Date(from);
  if (strict) d.setDate(d.getDate() + 1);
  for (let i = 0; i < 7; i++) {
    if (days.includes(d.getDay())) return d;
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/**
 * Next due date after completing a recurring task. Overdue tasks restart from
 * today instead of stacking missed occurrences.
 */
export function nextDue(
  recurrence: string,
  due: string | null,
  days: number[] = [],
): string {
  const today = startOfToday();
  const base = due ? new Date(`${due}T00:00:00`) : today;
  const from = base < today ? today : base;
  if (recurrence === 'weekly' && days.length) {
    return toISO(nextWeekday(from, days, true));
  }
  const next = new Date(from);
  if (recurrence === 'daily') next.setDate(next.getDate() + 1);
  else if (recurrence === 'weekly') next.setDate(next.getDate() + 7);
  else if (recurrence === 'biweekly') next.setDate(next.getDate() + 14);
  else if (recurrence === 'monthly') next.setMonth(next.getMonth() + 1);
  return toISO(next);
}

/** Due date for a new recurring task created without one. */
export function firstDue(
  recurrence: string,
  days: number[] = [],
): string | null {
  if (!recurrence || recurrence === 'none') return null;
  const today = startOfToday();
  if (recurrence === 'weekly' && days.length) {
    return toISO(nextWeekday(today, days, false));
  }
  return toISO(today);
}

/** "Quem Vai Fazer?" — household tasks on top of the shared `todo` table. */
@Injectable()
export class DcaosTasksService {
  private readonly logger = new Logger(DcaosTasksService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly familyScope: FamilyScopeService,
    private readonly notify: DcaosNotifyService,
    private readonly access: DcaosAccessService,
  ) {}

  private async scope(userId: string, n: number) {
    const scope = await this.familyScope.getScope(userId);
    return {
      ...scope,
      filter: this.familyScope
        .filterAt(scope, n)
        .replace(/(user_id|family_group_id)/g, 't.$1'),
    };
  }

  private async assertMember(
    userId: string,
    memberId: string | null | undefined,
  ) {
    if (!memberId) return;
    const scope = await this.familyScope.getScope(userId);
    const members = await this.notify.members(scope, userId);
    if (!members.some((m) => m.id === memberId))
      throw new BadRequestException('Responsável não faz parte da família.');
  }

  private async findOne(userId: string, id: string) {
    const scope = await this.scope(userId, 2);
    const [task] = await this.db.query(
      `SELECT ${TASK_FIELDS}
       FROM ${S}.todo t
       LEFT JOIN ${S}.users a  ON a.id = t.assignee_id
       LEFT JOIN ${S}.users cb ON cb.id = t.completed_by
       WHERE t.id = $1 AND ${scope.filter}`,
      [id, scope.param],
    );
    if (!task) throw new NotFoundException('Tarefa não encontrada.');
    return task;
  }

  /** Pending tasks + those completed in the last 14 days. */
  async list(userId: string) {
    const scope = await this.scope(userId, 1);
    return this.db.query(
      `SELECT ${TASK_FIELDS}
       FROM ${S}.todo t
       LEFT JOIN ${S}.users a  ON a.id = t.assignee_id
       LEFT JOIN ${S}.users cb ON cb.id = t.completed_by
       WHERE ${scope.filter}
         AND (t.is_completed = false
              OR t.completed_at > NOW() - INTERVAL '14 days'
              OR (t.completed_at IS NULL AND t.created_at > NOW() - INTERVAL '14 days'))
       ORDER BY t.is_completed ASC, t.due_date ASC NULLS LAST, t.created_at DESC`,
      [scope.param],
    );
  }

  async create(userId: string, dto: CreateTaskDto) {
    await this.assertMember(userId, dto.assigneeId);
    const scope = await this.familyScope.getScope(userId);
    const [row] = await this.db.query<{ id: string }>(
      `INSERT INTO ${S}.todo
         (title, notes, is_completed, user_id, family_group_id, created_by, assignee_id, due_date, recurrence, points, area, recurrence_days)
       VALUES ($1, $2, false, $3, $4, $3, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        dto.title.trim(),
        dto.notes ?? null,
        userId,
        scope.familyGroupId,
        dto.assigneeId || null,
        dto.dueDate ||
          firstDue(dto.recurrence ?? 'none', dto.recurrenceDays ?? []),
        dto.recurrence ?? 'none',
        dto.points ?? 1,
        dto.area || null,
        dto.recurrence === 'weekly' ? (dto.recurrenceDays ?? []) : [],
      ],
    );
    if (dto.assigneeId && dto.assigneeId !== userId) {
      const author = await this.notify.nameOf(userId);
      await this.notify.notify([dto.assigneeId], scope.familyGroupId, {
        module: 'tasks',
        body: fill('taskAssigned', { title: dto.title.trim(), author }),
        link: '/dcaos/tarefas',
      });
    }
    return this.findOne(userId, row.id);
  }

  async update(userId: string, id: string, dto: UpdateTaskDto) {
    const before = await this.findOne(userId, id);
    await this.assertMember(userId, dto.assigneeId);
    const scope = await this.scope(userId, 11);
    await this.db.query(
      `UPDATE ${S}.todo t SET
         title       = COALESCE($1, title),
         notes       = CASE WHEN $2::boolean THEN $3 ELSE notes END,
         assignee_id = CASE WHEN $4::boolean THEN $5 ELSE assignee_id END,
         due_date    = CASE WHEN $6::boolean THEN $7::date ELSE due_date END,
         recurrence  = COALESCE($8, recurrence),
         points      = COALESCE($9, points),
         area        = CASE WHEN $10::boolean THEN $12 ELSE area END,
         recurrence_days = CASE WHEN $14::boolean THEN $15::int[] ELSE recurrence_days END
       WHERE t.id = $13 AND ${scope.filter}`,
      [
        dto.title?.trim() || null,
        dto.notes !== undefined,
        dto.notes ?? null,
        dto.assigneeId !== undefined,
        dto.assigneeId || null,
        dto.dueDate !== undefined,
        dto.dueDate || null,
        dto.recurrence ?? null,
        dto.points ?? null,
        dto.area !== undefined,
        scope.param,
        dto.area || null,
        id,
        dto.recurrenceDays !== undefined || dto.recurrence !== undefined,
        (dto.recurrence ?? before.recurrence) === 'weekly'
          ? (dto.recurrenceDays ?? before.recurrenceDays ?? [])
          : [],
      ],
    );
    if (
      dto.assigneeId &&
      dto.assigneeId !== before.assigneeId &&
      dto.assigneeId !== userId
    ) {
      const author = await this.notify.nameOf(userId);
      await this.notify.notify([dto.assigneeId], scope.familyGroupId, {
        module: 'tasks',
        body: fill('taskAssigned', {
          title: dto.title ?? before.title,
          author,
        }),
        link: '/dcaos/tarefas',
      });
    }
    return this.findOne(userId, id);
  }

  async complete(userId: string, id: string) {
    const task = await this.findOne(userId, id);
    if (task.isCompleted) return task;
    const scope = await this.familyScope.getScope(userId);

    await this.db.query(
      `INSERT INTO ${S}.dcaos_task_log (task_id, title, user_id, family_group_id, points) VALUES ($1, $2, $3, $4, $5)`,
      [id, task.title, userId, scope.familyGroupId, task.points ?? 1],
    );

    if (task.recurrence && task.recurrence !== 'none') {
      await this.db.query(
        `UPDATE ${S}.todo SET due_date = $1, completed_at = NOW(), completed_by = $2 WHERE id = $3`,
        [
          nextDue(task.recurrence, task.dueDate, task.recurrenceDays ?? []),
          userId,
          id,
        ],
      );
    } else {
      await this.db.query(
        `UPDATE ${S}.todo SET is_completed = true, completed_at = NOW(), completed_by = $1 WHERE id = $2`,
        [userId, id],
      );
    }

    const watchers = [task.createdBy, task.assigneeId].filter(
      (u) => u && u !== userId,
    );
    if (watchers.length) {
      const who = await this.notify.nameOf(userId);
      await this.notify.notify(watchers, scope.familyGroupId, {
        module: 'tasks',
        body: fill('taskDone', { who, title: task.title }),
        link: '/dcaos/tarefas',
      });
    }
    return this.findOne(userId, id);
  }

  async reopen(userId: string, id: string) {
    const task = await this.findOne(userId, id);
    await this.db.query(
      `UPDATE ${S}.todo SET is_completed = false, completed_at = NULL, completed_by = NULL WHERE id = $1`,
      [id],
    );
    // Undo the most recent completion so points can't be farmed
    await this.db.query(
      `DELETE FROM ${S}.dcaos_task_log WHERE id = (
         SELECT id FROM ${S}.dcaos_task_log WHERE task_id = $1 ORDER BY completed_at DESC LIMIT 1)`,
      [task.id],
    );
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.db.query(`DELETE FROM ${S}.todo WHERE id = $1`, [id]);
    return { success: true };
  }

  /** Points per member over the last `days` days (members with 0 included). */
  async scoreboard(userId: string, days = 30) {
    const scope = await this.familyScope.getScope(userId);
    const members = await this.notify.members(scope, userId);
    const rows = await this.db.query<{
      user_id: string;
      points: string;
      tasks: string;
    }>(
      `SELECT user_id, SUM(points) AS points, COUNT(*) AS tasks
       FROM ${S}.dcaos_task_log
       WHERE ${this.familyScope.filterAt(scope, 1)} AND completed_at > NOW() - ($2 || ' days')::interval
       GROUP BY user_id`,
      [scope.param, String(days)],
    );
    return members
      .map((m) => {
        const r = rows.find((x) => x.user_id === m.id);
        return {
          userId: m.id,
          name: m.name,
          points: Number(r?.points ?? 0),
          tasks: Number(r?.tasks ?? 0),
        };
      })
      .sort((a, b) => b.points - a.points);
  }

  /** Daily nudge for tasks due today or overdue — deduped per task per day. */
  @Cron('0 9 * * *')
  async remindDueTasks() {
    const rows = await this.db.query<{
      id: string;
      title: string;
      assignee_id: string | null;
      created_by: string | null;
      user_id: string;
      family_group_id: string | null;
      days: number;
    }>(
      `SELECT id, title, assignee_id, created_by, user_id, family_group_id, (CURRENT_DATE - due_date) AS days
       FROM ${S}.todo
       WHERE is_completed = false AND due_date IS NOT NULL AND due_date <= CURRENT_DATE`,
    );
    const today = toISO(new Date());
    // One digest per person ("Tarefas de hoje"), not one push per task
    const byTarget = new Map<string, typeof rows>();
    for (const t of rows) {
      const target = t.assignee_id ?? t.created_by ?? t.user_id;
      byTarget.set(target, [...(byTarget.get(target) ?? []), t]);
    }
    for (const [target, list] of byTarget) {
      if (!(await this.access.hasAccess(target))) continue;
      const overdue = list.filter((t) => Number(t.days) > 0);
      const single = list.length === 1 ? list[0] : null;
      const names = list.map((t) => t.title);
      const shown =
        names.slice(0, 3).join(', ') +
        (names.length > 3 ? ` e mais ${names.length - 3}` : '');
      await this.notify.notify([target], list[0].family_group_id, {
        module: 'tasks',
        title: `📝 Tarefas de hoje: ${list.length}`,
        body: single
          ? Number(single.days) > 0
            ? fill('taskOverdue', {
                title: single.title,
                days: Number(single.days),
              })
            : fill('taskDueToday', { title: single.title })
          : `${shown}${overdue.length ? ` — ${overdue.length} atrasada${overdue.length > 1 ? 's' : ''}` : ''}. A casa conta com você.`,
        link: '/dcaos/tarefas',
        dedupeKey: `tasks:${target}:${today}`,
      });
    }
    if (rows.length)
      this.logger.log(`Task reminders evaluated: ${rows.length}`);
  }
}
