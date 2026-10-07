import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { FamilyScopeService } from '../common/scope/family-scope.service';
import { DcaosNotifyService } from './dcaos-notify.service';
import { DcaosAccessService } from './dcaos-access.service';
import { fill } from './dcaos.messages';
import { CreateEventDto, UpdateEventDto } from './dto/dcaos.dto';
import {
  TZ,
  aliasScope,
  assertMembers,
  buildSets,
  localNow,
} from './dcaos.util';

const S = 'db_dtasc';

const EVENT_FIELDS = `
  ce.id, ce.title, ce.description,
  ce.start_date          AS "startDate",
  ce.end_date            AS "endDate",
  ce.event_type          AS "eventType",
  ce.all_day             AS "allDay",
  ce.color,
  ce.notify_whatsapp     AS "notifyWhatsapp",
  ce.notify_days_before  AS "notifyDaysBefore",
  ce.participant_ids     AS "participantIds",
  ce.created_by          AS "createdBy",
  cu.name                AS "createdByName",
  ce.user_id             AS "userId"
`;

function whenLabel(start: Date, allDay: boolean) {
  const date = start
    .toLocaleDateString('pt-BR', {
      timeZone: TZ,
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    })
    .replace(/\./g, '');
  if (allDay) return date;
  const time = start.toLocaleTimeString('pt-BR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${date} às ${time}`;
}

/** "Quem Tem Compromisso?" — family agenda on DCash's calendar_event table. */
@Injectable()
export class DcaosAgendaService {
  private readonly logger = new Logger(DcaosAgendaService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly familyScope: FamilyScopeService,
    private readonly notify: DcaosNotifyService,
    private readonly access: DcaosAccessService,
  ) {}

  private async findOne(userId: string, id: string) {
    const scope = await aliasScope(this.familyScope, userId, 2, 'ce');
    const [ev] = await this.db.query(
      `SELECT ${EVENT_FIELDS} FROM ${S}.calendar_event ce
       LEFT JOIN ${S}.users cu ON cu.id = ce.created_by
       WHERE ce.id::text = $1 AND ${scope.filter}`,
      [id, scope.param],
    );
    if (!ev) throw new NotFoundException('Compromisso não encontrado.');
    return ev;
  }

  async list(userId: string, from: string, to: string) {
    const scope = await aliasScope(this.familyScope, userId, 3, 'ce');
    return this.db.query(
      `SELECT ${EVENT_FIELDS} FROM ${S}.calendar_event ce
       LEFT JOIN ${S}.users cu ON cu.id = ce.created_by
       WHERE ce.start_date >= $1::timestamptz AND ce.start_date < ($2::date + 1)::timestamptz
         AND ${scope.filter}
       ORDER BY ce.start_date`,
      [from, to, scope.param],
    );
  }

  private async invite(
    userId: string,
    ids: string[],
    ev: { title: string; startDate: string | Date; allDay: boolean },
  ) {
    const targets = ids.filter((id) => id !== userId);
    if (!targets.length) return;
    const scope = await this.familyScope.getScope(userId);
    const author = await this.notify.nameOf(userId);
    await this.notify.notify(targets, scope.familyGroupId, {
      module: 'agenda',
      body: fill('eventInvite', {
        author,
        title: ev.title,
        when: whenLabel(new Date(ev.startDate), ev.allDay),
      }),
      link: '/calendar',
    });
  }

  async create(userId: string, dto: CreateEventDto) {
    await assertMembers(
      this.familyScope,
      this.notify,
      userId,
      dto.participantIds ?? [],
    );
    const scope = await this.familyScope.getScope(userId);
    const [row] = await this.db.query<{ id: string }>(
      `INSERT INTO ${S}.calendar_event
         (title, description, start_date, end_date, event_type, all_day, notify_whatsapp, notify_days_before,
          participant_ids, created_by, user_id, family_group_id, color)
       VALUES ($1, $2, $3, $4, $5, $6, $11, $7, $8, $9, $9, $10, $12)
       RETURNING id::text AS id`,
      [
        dto.title.trim(),
        dto.description || null,
        dto.startDate,
        dto.endDate || null,
        dto.eventType ?? 'EVENT',
        dto.allDay ?? false,
        dto.notifyDaysBefore ?? 1,
        dto.participantIds ?? [],
        userId,
        scope.familyGroupId,
        dto.notifyWhatsapp ?? false,
        dto.color || '#10b981',
      ],
    );
    const ev = await this.findOne(userId, row.id);
    await this.invite(userId, dto.participantIds ?? [], ev);
    return ev;
  }

  async update(userId: string, id: string, dto: UpdateEventDto) {
    const before = await this.findOne(userId, id);
    await assertMembers(
      this.familyScope,
      this.notify,
      userId,
      dto.participantIds ?? [],
    );
    const { sets, params } = buildSets({
      title: dto.title?.trim(),
      description:
        dto.description === undefined ? undefined : dto.description || null,
      start_date: dto.startDate,
      end_date: dto.endDate === undefined ? undefined : dto.endDate || null,
      event_type: dto.eventType,
      all_day: dto.allDay,
      notify_days_before: dto.notifyDaysBefore,
      participant_ids: dto.participantIds,
      color: dto.color,
      notify_whatsapp: dto.notifyWhatsapp,
    });
    if (sets.length) {
      params.push(id);
      await this.db.query(
        `UPDATE ${S}.calendar_event SET ${sets.join(', ')} WHERE id::text = $${params.length}`,
        params,
      );
    }
    const ev = await this.findOne(userId, id);
    if (dto.participantIds) {
      const added = dto.participantIds.filter(
        (p) => !(before.participantIds ?? []).includes(p),
      );
      await this.invite(userId, added, ev);
    }
    return ev;
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.db.query(`DELETE FROM ${S}.calendar_event WHERE id::text = $1`, [
      id,
    ]);
    return { success: true };
  }

  /** Same-day and "N days before" reminders, deduped per event/day. */
  @Cron('0 8 * * *', { timeZone: TZ })
  async remind() {
    const { iso: today } = localNow();
    const rows = await this.db.query<{
      id: string;
      title: string;
      start_date: Date;
      all_day: boolean;
      notify_days_before: number;
      participant_ids: string[];
      user_id: string;
      family_group_id: string | null;
      days: number;
    }>(
      `SELECT id::text AS id, title, start_date, all_day, notify_days_before, participant_ids, user_id, family_group_id,
              ((start_date AT TIME ZONE '${TZ}')::date - $1::date) AS days
       FROM ${S}.calendar_event
       WHERE (start_date AT TIME ZONE '${TZ}')::date = $1::date
          OR (notify_days_before > 0 AND (start_date AT TIME ZONE '${TZ}')::date = $1::date + notify_days_before)`,
      [today],
    );
    for (const ev of rows) {
      if (!(await this.access.hasAccess(ev.user_id))) continue;
      let recipients = ev.participant_ids ?? [];
      if (!recipients.length) {
        const scope = await this.familyScope.getScope(ev.user_id);
        recipients = (await this.notify.members(scope, ev.user_id)).map(
          (m) => m.id,
        );
      }
      const days = Number(ev.days);
      const time = ev.all_day
        ? ''
        : ` às ${new Date(ev.start_date).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })}`;
      await this.notify.notify(recipients, ev.family_group_id, {
        module: 'agenda',
        body:
          days === 0
            ? fill('eventToday', { title: ev.title, time })
            : fill('eventSoon', { title: ev.title, days }),
        link: '/calendar',
        dedupeKey: `event:${ev.id}:${today}`,
      });
    }
    if (rows.length)
      this.logger.log(`Agenda reminders evaluated: ${rows.length}`);
  }
}
