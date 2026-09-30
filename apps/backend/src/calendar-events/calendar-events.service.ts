import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FamilyScopeService } from '../common/scope/family-scope.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';

@Injectable()
export class CalendarEventsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly familyScope: FamilyScopeService,
  ) {}

  private async getScope(userId: string, paramIndex = 1) {
    const scope = await this.familyScope.getScope(userId);
    return { ...scope, filter: this.familyScope.filterAt(scope, paramIndex) };
  }

  /* ── Monthly view: events + transactions ─────────────────────── */
  async findMonthly(userId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const scope = await this.getScope(userId, 3);

    const evFilter = scope.filter
      .replace(/\buser_id\b/g, 'ce.user_id')
      .replace(/\bfamily_group_id\b/g, 'ce.family_group_id');
    const txFilter = scope.filter
      .replace(/\buser_id\b/g, 't.user_id')
      .replace(/\bfamily_group_id\b/g, 't.family_group_id');

    const [events, transactions] = await Promise.all([
      this.db.query(
        `SELECT
           ce.id, ce.title, ce.description,
           ce.start_date      AS "startDate",
           ce.end_date        AS "endDate",
           ce.event_type      AS "eventType",
           ce.color,
           ce.all_day         AS "allDay",
           ce.notify_whatsapp AS "notifyWhatsapp",
           ce.notify_days_before AS "notifyDaysBefore",
           ce.google_event_id AS "googleEventId"
         FROM db_dtasc.calendar_event ce
         WHERE ce.start_date >= $1 AND ce.start_date <= $2
           AND ${evFilter}
         ORDER BY ce.start_date`,
        [start, end, scope.param],
      ),
      this.db.query(
        `SELECT
           t.id, t.description, t.amount, t.type,
           t.date AS "date"
         FROM db_dtasc.transactions t
         WHERE t.date >= $1 AND t.date <= $2
           AND ${txFilter}
         ORDER BY t.date`,
        [start, end, scope.param],
      ),
    ]);

    return { events, transactions };
  }

  /* ── CRUD ─────────────────────────────────────────────────────── */
  async create(userId: string, dto: CreateCalendarEventDto) {
    const scope = await this.getScope(userId, 1);
    const res = await this.db.query(
      `INSERT INTO db_dtasc.calendar_event
         (title, description, start_date, end_date, event_type, color,
          all_day, notify_whatsapp, notify_days_before,
          user_id, family_group_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING
         id, title, description,
         start_date      AS "startDate",
         end_date        AS "endDate",
         event_type      AS "eventType",
         color, all_day  AS "allDay",
         notify_whatsapp AS "notifyWhatsapp",
         notify_days_before AS "notifyDaysBefore"`,
      [
        dto.title,
        dto.description || null,
        dto.startDate,
        dto.endDate || null,
        dto.eventType || 'EVENT',
        dto.color || '#10b981',
        dto.allDay ?? false,
        dto.notifyWhatsapp ?? false,
        dto.notifyDaysBefore ?? 1,
        userId,
        scope.familyGroupId || null,
      ],
    );
    return res[0];
  }

  async update(id: string, userId: string, dto: Partial<CreateCalendarEventDto>) {
    // $1–$8 SET params, $9 = id, $10 = scope.param
    const scope = await this.getScope(userId, 10);
    const res = await this.db.query(
      `UPDATE db_dtasc.calendar_event
       SET title              = COALESCE($1, title),
           description        = COALESCE($2, description),
           start_date         = COALESCE($3, start_date),
           end_date           = $4,
           event_type         = COALESCE($5, event_type),
           color              = COALESCE($6, color),
           all_day            = COALESCE($7, all_day),
           notify_whatsapp    = COALESCE($8, notify_whatsapp)
       WHERE id = $9 AND ${scope.filter}
       RETURNING
         id, title, description,
         start_date      AS "startDate",
         end_date        AS "endDate",
         event_type      AS "eventType",
         color, all_day  AS "allDay",
         notify_whatsapp AS "notifyWhatsapp"`,
      [
        dto.title ?? null,
        dto.description ?? null,
        dto.startDate ?? null,
        dto.endDate ?? null,
        dto.eventType ?? null,
        dto.color ?? null,
        dto.allDay ?? null,
        dto.notifyWhatsapp ?? null,
        id,          // $9
        scope.param, // $10
      ],
    );
    if (res.length === 0) throw new NotFoundException('Evento não encontrado.');
    return res[0];
  }

  async remove(id: string, userId: string) {
    const scope = await this.getScope(userId, 2);
    const res = await this.db.query(
      `DELETE FROM db_dtasc.calendar_event WHERE id = $1 AND ${scope.filter} RETURNING id`,
      [id, scope.param],
    );
    if (res.length === 0) throw new NotFoundException('Evento não encontrado.');
    return { success: true };
  }

  /* ── Upcoming notifications (used by cron) ───────────────────── */
  async findUpcomingNotifications(targetDate: Date) {
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    return this.db.query(
      `SELECT
         ce.title, ce.start_date AS "startDate",
         u.name, u.whatsapp_number AS "whatsappNumber",
         u.id AS "userId"
       FROM db_dtasc.calendar_event ce
       JOIN db_dtasc.users u ON ce.user_id = u.id
       WHERE ce.start_date >= $1 AND ce.start_date <= $2
         AND ce.notify_whatsapp = true
         AND u.whatsapp_number IS NOT NULL`,
      [start, end],
    );
  }
}
