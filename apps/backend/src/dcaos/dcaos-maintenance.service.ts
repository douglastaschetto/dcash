import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { FamilyScopeService } from '../common/scope/family-scope.service';
import { DcaosNotifyService } from './dcaos-notify.service';
import { DcaosAccessService } from './dcaos-access.service';
import { fill } from './dcaos.messages';
import { CreateMaintenanceDto, UpdateMaintenanceDto } from './dto/dcaos.dto';
import {
  TZ,
  aliasScope,
  assertMembers,
  buildSets,
  daysBetween,
  localNow,
  parseISO,
  toISO,
} from './dcaos.util';

const S = 'db_dtasc';

const FIELDS = `
  m.id, m.title, m.description, m.kind, m.area, m.priority, m.status,
  m.assignee_id  AS "assigneeId",  a.name AS "assigneeName",
  m.professional,
  m.cost::float  AS cost,
  m.interval_months AS "intervalMonths",
  to_char(m.next_due, 'YYYY-MM-DD') AS "nextDue",
  m.reported_by  AS "reportedBy",  r.name AS "reportedByName",
  m.resolved_by  AS "resolvedBy",  rb.name AS "resolvedByName",
  m.resolved_at  AS "resolvedAt",
  m.created_at   AS "createdAt",
  m.updated_at   AS "updatedAt"
`;

const addMonths = (iso: string, months: number) => {
  const d = parseISO(iso);
  d.setMonth(d.getMonth() + months);
  return toISO(d);
};

/** "Deu Ruim" — things that broke, and the preventive routines that avoid it. */
@Injectable()
export class DcaosMaintenanceService {
  private readonly logger = new Logger(DcaosMaintenanceService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly familyScope: FamilyScopeService,
    private readonly notify: DcaosNotifyService,
    private readonly access: DcaosAccessService,
  ) {}

  private select(filter: string, extra = '') {
    return `
      SELECT ${FIELDS}
      FROM ${S}.dcaos_maintenance m
      LEFT JOIN ${S}.users a  ON a.id  = m.assignee_id
      LEFT JOIN ${S}.users r  ON r.id  = m.reported_by
      LEFT JOIN ${S}.users rb ON rb.id = m.resolved_by
      WHERE ${filter} ${extra}`;
  }

  async list(userId: string) {
    const scope = await aliasScope(this.familyScope, userId, 1, 'm');
    return this.db.query(
      `${this.select(scope.filter)}
       ORDER BY (m.status = 'done') ASC,
                CASE m.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                m.next_due ASC NULLS LAST, m.created_at DESC
       LIMIT 300`,
      [scope.param],
    );
  }

  private async findOne(userId: string, id: string) {
    const scope = await aliasScope(this.familyScope, userId, 1, 'm');
    const [row] = await this.db.query(
      this.select(scope.filter, 'AND m.id = $2'),
      [scope.param, id],
    );
    if (!row) throw new NotFoundException('Item não encontrado.');
    return row;
  }

  async create(userId: string, dto: CreateMaintenanceDto) {
    await assertMembers(this.familyScope, this.notify, userId, [
      dto.assigneeId,
    ]);
    const scope = await this.familyScope.getScope(userId);
    const kind = dto.kind ?? 'issue';
    const nextDue =
      kind === 'preventive'
        ? dto.nextDue || addMonths(localNow().iso, dto.intervalMonths ?? 6)
        : null;
    const [row] = await this.db.query<{ id: string }>(
      `INSERT INTO ${S}.dcaos_maintenance
         (title, description, kind, area, priority, assignee_id, professional, cost, interval_months, next_due,
          reported_by, user_id, family_group_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $12) RETURNING id`,
      [
        dto.title.trim(),
        dto.description || null,
        kind,
        dto.area || null,
        dto.priority ?? 'medium',
        dto.assigneeId || null,
        dto.professional || null,
        dto.cost ?? null,
        kind === 'preventive' ? (dto.intervalMonths ?? 6) : null,
        nextDue,
        userId,
        scope.familyGroupId,
      ],
    );
    if (kind === 'issue') {
      const author = await this.notify.nameOf(userId);
      await this.notify.notifyFamily(
        userId,
        {
          module: 'maintenance',
          body: fill('maintenanceNew', { author, title: dto.title.trim() }),
          link: '/dcaos/manutencao',
        },
        userId,
      );
    }
    return this.findOne(userId, row.id);
  }

  async update(userId: string, id: string, dto: UpdateMaintenanceDto) {
    const before = await this.findOne(userId, id);
    await assertMembers(this.familyScope, this.notify, userId, [
      dto.assigneeId,
    ]);
    if (dto.status === 'done' && before.status !== 'done')
      return this.resolve(userId, id, dto.cost ?? undefined);
    const { sets, params } = buildSets({
      title: dto.title?.trim(),
      description:
        dto.description === undefined ? undefined : dto.description || null,
      area: dto.area === undefined ? undefined : dto.area || null,
      priority: dto.priority,
      status: dto.status,
      assignee_id:
        dto.assigneeId === undefined ? undefined : dto.assigneeId || null,
      professional:
        dto.professional === undefined ? undefined : dto.professional || null,
      cost: dto.cost,
      interval_months: dto.intervalMonths,
      next_due: dto.nextDue,
    });
    if (dto.status && dto.status !== 'done' && before.status === 'done') {
      sets.push('resolved_at = NULL', 'resolved_by = NULL');
    }
    if (sets.length) {
      params.push(id);
      await this.db.query(
        `UPDATE ${S}.dcaos_maintenance SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`,
        params,
      );
    }
    return this.findOne(userId, id);
  }

  /**
   * Issues are closed. Preventive routines are "done for now": the next due
   * date moves forward by the interval and the item stays active.
   */
  async resolve(userId: string, id: string, cost?: number) {
    const item = await this.findOne(userId, id);
    if (item.kind === 'preventive') {
      const next = addMonths(localNow().iso, item.intervalMonths ?? 6);
      await this.db.query(
        `UPDATE ${S}.dcaos_maintenance
         SET next_due = $1, status = 'open', resolved_at = NOW(), resolved_by = $2,
             cost = COALESCE($3, cost), updated_at = NOW()
         WHERE id = $4`,
        [next, userId, cost ?? null, id],
      );
    } else {
      await this.db.query(
        `UPDATE ${S}.dcaos_maintenance
         SET status = 'done', resolved_at = NOW(), resolved_by = $1, cost = COALESCE($2, cost), updated_at = NOW()
         WHERE id = $3`,
        [userId, cost ?? null, id],
      );
      const who = await this.notify.nameOf(userId);
      await this.notify.notifyFamily(
        userId,
        {
          module: 'maintenance',
          body: fill('maintenanceDone', { who, title: item.title }),
          link: '/dcaos/manutencao',
        },
        userId,
      );
    }
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.db.query(`DELETE FROM ${S}.dcaos_maintenance WHERE id = $1`, [
      id,
    ]);
    return { success: true };
  }

  /** Daily: stale issues every 3 days, preventive routines 7 days ahead and when overdue. */
  @Cron('30 9 * * *', { timeZone: TZ })
  async remind() {
    const { iso: today } = localNow();
    const rows = await this.db.query<{
      id: string;
      title: string;
      kind: string;
      assignee_id: string | null;
      user_id: string;
      family_group_id: string | null;
      created: string;
      next_due: string | null;
    }>(
      `SELECT id, title, kind, assignee_id, user_id, family_group_id,
              to_char((created_at AT TIME ZONE '${TZ}')::date, 'YYYY-MM-DD') AS created,
              to_char(next_due, 'YYYY-MM-DD') AS next_due
       FROM ${S}.dcaos_maintenance WHERE status <> 'done'`,
    );
    let sent = 0;
    for (const r of rows) {
      let body: string | null = null;
      let key = '';
      if (r.kind === 'issue') {
        const days = daysBetween(r.created, today);
        if (days >= 3 && days % 3 === 0) {
          body = fill('maintenanceStale', { title: r.title, days });
          key = `maint-stale:${r.id}:${today}`;
        }
      } else if (r.next_due) {
        const days = daysBetween(today, r.next_due);
        if (days === 7 || days === 0 || (days < 0 && days % 7 === 0)) {
          const when =
            days > 0
              ? `em ${days} dias`
              : days === 0
                ? 'hoje'
                : `há ${-days} dias`;
          body = fill('maintenancePreventive', { title: r.title, when });
          key = `maint-prev:${r.id}:${today}`;
        }
      }
      if (!body || !(await this.access.hasAccess(r.user_id))) continue;
      let recipients = r.assignee_id ? [r.assignee_id] : [];
      if (!recipients.length) {
        const scope = await this.familyScope.getScope(r.user_id);
        recipients = (await this.notify.members(scope, r.user_id)).map(
          (m) => m.id,
        );
      }
      await this.notify.notify(recipients, r.family_group_id, {
        module: 'maintenance',
        body,
        link: '/dcaos/manutencao',
        dedupeKey: key,
      });
      sent++;
    }
    if (sent) this.logger.log(`Maintenance reminders sent: ${sent}`);
  }
}
