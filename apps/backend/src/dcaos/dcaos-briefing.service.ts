import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { FamilyScopeService } from '../common/scope/family-scope.service';
import { DcaosAccessService } from './dcaos-access.service';
import { DcaosNotifyService, type Notice } from './dcaos-notify.service';
import { DcaosTasksService } from './dcaos-tasks.service';
import { DcaosAgendaService } from './dcaos-agenda.service';
import { DcaosDatesService } from './dcaos-dates.service';
import { DcaosHabitsService } from './dcaos-habits.service';
import { DcaosMarketService } from './dcaos-market.service';
import { DcaosNotesService } from './dcaos-notes.service';
import { DcaosMaintenanceService } from './dcaos-maintenance.service';
import { TZ, aliasScope, localNow } from './dcaos.util';

const S = 'db_dtasc';

export type BriefingKind =
  | 'insights'
  | 'finance'
  | 'tasks'
  | 'habits'
  | 'market'
  | 'notes'
  | 'agenda';

type Task = {
  title: string;
  dueDate: string | null;
  assigneeId: string | null;
  isCompleted: boolean;
};
type Ev = {
  id: string;
  title: string;
  startDate: string;
  allDay: boolean;
  participantIds?: string[] | null;
};
type DateItem = { title: string; daysUntil: number; past?: boolean };
type Habit = {
  title: string;
  icon: string | null;
  assigneeId: string | null;
  createdBy: string | null;
  active: boolean;
  scheduledToday: boolean;
  doneToday: boolean;
};
type Item = {
  name: string;
  onList: boolean;
  checked: boolean;
  shelfLifeDays: number | null;
  lastBoughtAt: string | null;
  quantity: number;
};
type Note = {
  message: string;
  authorId: string;
  authorName: string | null;
  recipientId: string | null;
  read: boolean;
};
type Maint = { title: string; priority: string; status: string };

const brl = (n: number) =>
  n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 2,
  });
const first = (name?: string | null) => (name ?? '').split(' ')[0] || 'Alguém';
const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;
/** "a, b e c" / "a, b, c e mais 3" */
const listOf = (names: string[], max = 3) => {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  if (rest > 0) return `${shown.join(', ')} e mais ${rest}`;
  return shown.length > 1
    ? `${shown.slice(0, -1).join(', ')} e ${shown.at(-1)}`
    : (shown[0] ?? '');
};
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
const dayOf = (iso: string) =>
  new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });

/**
 * Scheduled push briefings (PWA). Each digest is built per person, deduped
 * per day and delivered through DcaosNotifyService (feed + device push,
 * respecting muted modules and quiet hours).
 *
 * Finance and the daily insights work for every DCash user with a device;
 * household digests require the DCaos add-on.
 */
@Injectable()
export class DcaosBriefingService {
  private readonly logger = new Logger(DcaosBriefingService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly familyScope: FamilyScopeService,
    private readonly access: DcaosAccessService,
    private readonly notify: DcaosNotifyService,
    private readonly tasks: DcaosTasksService,
    private readonly agenda: DcaosAgendaService,
    private readonly dates: DcaosDatesService,
    private readonly habits: DcaosHabitsService,
    private readonly market: DcaosMarketService,
    private readonly notes: DcaosNotesService,
    private readonly maintenance: DcaosMaintenanceService,
  ) {}

  // ── Audience ────────────────────────────────────────────────────────────

  /** People who can receive briefings: a registered device or recent DCaos activity. */
  private async audience() {
    return this.db.query<{
      id: string;
      name: string;
      family_group_id: string | null;
    }>(
      `SELECT u.id, u.name, u.family_group_id FROM ${S}.users u
       WHERE EXISTS (SELECT 1 FROM ${S}.push_subscriptions p WHERE p.user_id = u.id)
          OR EXISTS (SELECT 1 FROM ${S}.dcaos_notifications n WHERE n.user_id = u.id AND n.created_at > NOW() - INTERVAL '30 days')`,
    );
  }

  private async run(kind: BriefingKind, needsHouse: boolean) {
    const today = localNow().iso;
    let sent = 0;
    for (const u of await this.audience()) {
      try {
        if (needsHouse && !(await this.access.hasAccess(u.id))) continue;
        const notice = await this.build(kind, u.id, u.name);
        if (!notice) continue;
        await this.notify.notify([u.id], u.family_group_id, {
          ...notice,
          dedupeKey: `${kind}:${u.id}:${today}`,
        });
        sent++;
      } catch (err) {
        this.logger.warn(
          `${kind} briefing failed for ${u.id}: ${(err as Error).message}`,
        );
      }
    }
    if (sent) this.logger.log(`Briefing "${kind}" built for ${sent} user(s)`);
  }

  @Cron('30 7 * * *', { timeZone: TZ }) insightsCron() {
    return this.run('insights', false);
  }
  @Cron('0 10 * * *', { timeZone: TZ }) financeCron() {
    return this.run('finance', false);
  }
  @Cron('30 17 * * *', { timeZone: TZ }) marketCron() {
    return this.run('market', true);
  }
  @Cron('0 19 * * *', { timeZone: TZ }) notesCron() {
    return this.run('notes', true);
  }
  @Cron('30 20 * * *', { timeZone: TZ }) habitsCron() {
    return this.run('habits', true);
  }

  /** "Em 1 hora": timed events starting 45–60 min from now (checked every 15 min). */
  @Cron('*/15 * * * *')
  async eventSoon() {
    const rows = await this.db.query<{
      id: string;
      title: string;
      start_date: string;
      participant_ids: string[] | null;
      user_id: string;
      family_group_id: string | null;
    }>(
      `SELECT id::text AS id, title, start_date, participant_ids, user_id, family_group_id
       FROM ${S}.calendar_event
       WHERE all_day = false AND start_date > NOW() + INTERVAL '44 minutes' AND start_date <= NOW() + INTERVAL '60 minutes'`,
    );
    for (const ev of rows) {
      try {
        const house = await this.access.hasAccess(ev.user_id);
        let recipients = ev.participant_ids?.length ? ev.participant_ids : [];
        if (!recipients.length) {
          recipients = house
            ? (
                await this.notify.members(
                  await this.familyScope.getScope(ev.user_id),
                  ev.user_id,
                )
              ).map((m) => m.id)
            : [ev.user_id];
        }
        await this.notify.notify(recipients, ev.family_group_id, {
          module: 'agenda',
          title: `📅 Em 1 hora: ${ev.title}`,
          body: `"${ev.title}" começa às ${timeOf(ev.start_date)}. Bora se arrumar?`,
          link: '/calendar',
          dedupeKey: `event-soon:${ev.id}`,
        });
      } catch (err) {
        this.logger.warn(
          `event-soon failed for ${ev.id}: ${(err as Error).message}`,
        );
      }
    }
  }

  /** Builds (without sending) a briefing for one person — also used by the "testar" button. */
  async build(
    kind: BriefingKind,
    userId: string,
    name?: string,
  ): Promise<Omit<Notice, 'dedupeKey'> | null> {
    switch (kind) {
      case 'insights':
        return this.insights(userId, name);
      case 'finance':
        return this.financeNotice(userId, true);
      case 'tasks':
        return this.tasksNotice(userId);
      case 'habits':
        return this.habitsNotice(userId);
      case 'market':
        return this.marketNotice(userId);
      case 'notes':
        return this.notesNotice(userId);
      case 'agenda':
        return this.agendaNotice(userId);
    }
  }

  /** Test button: sends right away, even when it would normally stay silent. */
  async preview(kind: BriefingKind, userId: string) {
    const [me] = await this.db.query<{ name: string }>(
      `SELECT name FROM ${S}.users WHERE id = $1`,
      [userId],
    );
    const notice =
      (await this.build(kind, userId, me?.name)) ??
      (kind === 'finance'
        ? await this.financeNotice(userId, false, true)
        : null);
    if (!notice) return { sent: false, reason: 'Nada para avisar agora.' };
    const scope = await this.familyScope.getScope(userId);
    await this.notify.notify([userId], scope.familyGroupId, {
      ...notice,
      dedupeKey: `preview:${kind}:${userId}:${Date.now()}`,
    });
    return { sent: true, title: notice.title, body: notice.body };
  }

  // ── Finance ─────────────────────────────────────────────────────────────

  private async financeFacts(userId: string) {
    const { iso: today } = localNow();
    const monthStart = `${today.slice(0, 8)}01`;
    const next = new Date(
      Number(today.slice(0, 4)),
      Number(today.slice(5, 7)),
      1,
    );
    const monthEnd = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
    const t = await aliasScope(this.familyScope, userId, 1, 't');
    const cl = await aliasScope(this.familyScope, userId, 1, 'cl');

    const [totals] = await this.db.query<{
      income: string;
      expense: string;
      inst: string;
    }>(
      `SELECT COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'INCOME'), 0) AS income,
              COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'EXPENSE' AND t.piggy_bank_id IS NULL), 0) AS expense,
              COALESCE(SUM(t.amount) FILTER (WHERE t.installment_group IS NOT NULL), 0) AS inst
       FROM ${S}.transactions t
       WHERE ${t.filter} AND t.date >= $2::date AND t.date < $3::date`,
      [t.param, monthStart, monthEnd],
    );
    const [overdue] = await this.db.query<{ n: string; total: string }>(
      `SELECT COUNT(*) AS n, COALESCE(SUM(t.amount), 0) AS total FROM ${S}.transactions t
       WHERE ${t.filter} AND t.installment_group IS NOT NULL AND t.is_paid = false AND t.date < $2::date`,
      [t.param, today],
    );
    const limits = await this.db.query<{
      name: string;
      planned: string;
      spent: string;
    }>(
      `SELECT c.name, cl.amount AS planned,
              COALESCE((SELECT SUM(t.amount) FROM ${S}.transactions t
                        WHERE t.category_id = cl.category_id AND t.type = 'EXPENSE'
                          AND t.date >= $2::date AND t.date < $3::date AND ${t.filter}), 0) AS spent
       FROM ${S}.category_limit cl JOIN ${S}.category c ON c.id = cl.category_id
       WHERE cl.month = $4 AND cl.year = $5 AND ${cl.filter}`,
      [
        t.param,
        monthStart,
        monthEnd,
        Number(today.slice(5, 7)),
        Number(today.slice(0, 4)),
      ],
    );

    const income = Number(totals?.income ?? 0);
    const expense = Number(totals?.expense ?? 0);
    const planned = limits.reduce((s, l) => s + Number(l.planned), 0);
    const over = limits
      .filter((l) => Number(l.spent) > Number(l.planned))
      .map((l) => ({ name: l.name, by: Number(l.spent) - Number(l.planned) }));
    const day = Number(today.slice(8, 10));
    const daysInMonth = new Date(
      Number(today.slice(0, 4)),
      Number(today.slice(5, 7)),
      0,
    ).getDate();
    return {
      income,
      expense,
      balance: income - expense,
      inst: Number(totals?.inst ?? 0),
      overdueCount: Number(overdue?.n ?? 0),
      overdueTotal: Number(overdue?.total ?? 0),
      planned,
      over,
      day,
      daysInMonth,
      dow: localNow().dow,
    };
  }

  /** 🔴 critical / 🟡 attention / 🟢 healthy. Healthy ones are only sent on Mondays (weekly pulse). */
  private async financeNotice(
    userId: string,
    scheduled: boolean,
    forceGood = false,
  ) {
    const f = await this.financeFacts(userId);
    if (f.income === 0 && f.expense === 0 && f.overdueCount === 0) return null;
    const critical: string[] = [];
    const warn: string[] = [];
    if (f.balance < 0 && f.income > 0)
      critical.push(`gastos ${brl(-f.balance)} acima da receita`);
    if (f.overdueCount)
      critical.push(
        `${plural(f.overdueCount, 'parcela vencida', 'parcelas vencidas')} (${brl(f.overdueTotal)})`,
      );
    if (f.planned > 0 && f.expense > f.planned)
      critical.push(`orçamento estourado em ${brl(f.expense - f.planned)}`);
    if (f.income === 0 && f.expense > 0)
      warn.push('nenhuma receita lançada no mês');
    if (f.over.length && !(f.planned > 0 && f.expense > f.planned))
      warn.push(
        `${f.over[0].name} passou ${brl(f.over[0].by)} do limite${f.over.length > 1 ? ` (+${f.over.length - 1})` : ''}`,
      );
    if (f.income > 0 && f.inst / f.income >= 0.3)
      warn.push(
        `parcelas comprometem ${Math.round((f.inst / f.income) * 100)}% da renda`,
      );
    if (
      f.income > 0 &&
      f.balance >= 0 &&
      f.expense / f.income > 0.9 &&
      f.day < 20
    )
      warn.push(
        `já foi ${Math.round((f.expense / f.income) * 100)}% da renda e ainda é dia ${f.day}`,
      );

    if (critical.length) {
      return {
        module: 'finance' as const,
        title: '🔴 Finanças: atenção agora',
        body: `${cap(listOf(critical, 3))}.${warn.length ? ` Também: ${warn[0]}.` : ''}`,
        link: '/dashboard-v2',
      };
    }
    if (warn.length) {
      return {
        module: 'finance' as const,
        title: '🟡 Finanças: fique de olho',
        body: `${cap(listOf(warn, 2))}.`,
        link: '/dashboard-v2',
      };
    }
    if (scheduled && f.dow !== 1 && !forceGood) return null;
    const rate = f.income > 0 ? Math.round((f.balance / f.income) * 100) : 0;
    return {
      module: 'finance' as const,
      title: '🟢 Finanças saudáveis',
      body:
        f.income > 0
          ? `Sobrando ${brl(f.balance)} (${rate}% da renda) no mês. Que tal mandar uma parte para os cofrinhos?`
          : `Gastos de ${brl(f.expense)} no mês e nada fora do lugar.`,
      link: '/painel',
    };
  }

  // ── Household pieces ────────────────────────────────────────────────────

  private async tasksFor(userId: string) {
    const { iso: today } = localNow();
    const list = (await this.tasks.list(userId)) as Task[];
    const due = list.filter(
      (t) =>
        !t.isCompleted &&
        t.dueDate &&
        t.dueDate.slice(0, 10) <= today &&
        (t.assigneeId === userId || !t.assigneeId),
    );
    return { due, overdue: due.filter((t) => t.dueDate!.slice(0, 10) < today) };
  }

  private async tasksNotice(userId: string) {
    const { due, overdue } = await this.tasksFor(userId);
    if (!due.length) return null;
    return {
      module: 'tasks' as const,
      title: `📝 Tarefas de hoje: ${due.length}`,
      body: `${listOf(due.map((t) => t.title))}${overdue.length ? ` — ${plural(overdue.length, 'atrasada', 'atrasadas')}` : ''}. A casa conta com você.`,
      link: '/dcaos/tarefas',
    };
  }

  private async eventsToday(userId: string) {
    const { iso: today } = localNow();
    const list = (await this.agenda.list(userId, today, today)) as Ev[];
    return list.filter(
      (e) =>
        dayOf(e.startDate) === today &&
        (!e.participantIds?.length || e.participantIds.includes(userId)),
    );
  }

  private async agendaNotice(userId: string) {
    const events = await this.eventsToday(userId);
    if (!events.length) return null;
    const firstEv = events.find((e) => !e.allDay) ?? events[0];
    return {
      module: 'agenda' as const,
      title: `📅 Hoje: ${plural(events.length, 'compromisso', 'compromissos')}`,
      body: `${listOf(events.map((e) => (e.allDay ? e.title : `${e.title} às ${timeOf(e.startDate)}`)))}.${firstEv && !firstEv.allDay ? ` O primeiro é às ${timeOf(firstEv.startDate)}.` : ''}`,
      link: '/calendar',
    };
  }

  private async habitsNotice(userId: string) {
    const list = (await this.habits.list(userId)) as Habit[];
    const pending = list.filter(
      (h) =>
        h.active &&
        h.scheduledToday &&
        !h.doneToday &&
        (h.assigneeId === userId || (!h.assigneeId && h.createdBy === userId)),
    );
    if (!pending.length) return null;
    return {
      module: 'habits' as const,
      title: `🔁 ${plural(pending.length, 'hábito', 'hábitos')} ainda hoje`,
      body: `Falta${pending.length > 1 ? 'm' : ''} ${listOf(pending.map((h) => `${h.icon ?? ''} ${h.title}`.trim()))}. O dia ainda não acabou.`,
      link: '/dcaos/habitos',
    };
  }

  private async marketNotice(userId: string) {
    const items = (await this.market.list(userId)) as Item[];
    const toBuy = items.filter((i) => i.onList && !i.checked);
    const now = Date.now();
    const expiring = items.filter(
      (i) =>
        i.shelfLifeDays &&
        i.lastBoughtAt &&
        i.quantity > 0 &&
        (new Date(i.lastBoughtAt).getTime() +
          i.shelfLifeDays * 86_400_000 -
          now) /
          86_400_000 <=
          2,
    );
    if (!toBuy.length && !expiring.length) return null;
    const parts: string[] = [];
    if (toBuy.length)
      parts.push(
        `${plural(toBuy.length, 'item', 'itens')} na lista: ${listOf(
          toBuy.map((i) => i.name.toLowerCase()),
          4,
        )}`,
      );
    if (expiring.length)
      parts.push(
        `${listOf(
          expiring.map((i) => i.name.toLowerCase()),
          2,
        )} vencendo na despensa`,
      );
    return {
      module: 'market' as const,
      title: toBuy.length
        ? '🛒 Vai passar no mercado?'
        : '⏳ De olho na validade',
      body: `${cap(parts.join('. '))}.`,
      link: '/dcaos/mercado',
    };
  }

  private async unreadNotes(userId: string) {
    const list = (await this.notes.list(userId)) as Note[];
    return list.filter(
      (n) =>
        !n.read &&
        n.authorId !== userId &&
        (!n.recipientId || n.recipientId === userId),
    );
  }

  private async notesNotice(userId: string) {
    const unread = await this.unreadNotes(userId);
    if (!unread.length) return null;
    const last = unread[0];
    const preview =
      last.message.length > 60
        ? `${last.message.slice(0, 57)}...`
        : last.message;
    return {
      module: 'notes' as const,
      title: `🗒️ ${plural(unread.length, 'bilhete', 'bilhetes')} esperando você`,
      body: `${first(last.authorName)}: "${preview}"`,
      link: '/painel',
    };
  }

  // ── Insights do dia (morning digest) ────────────────────────────────────

  private async insights(userId: string, name?: string) {
    const lines: string[] = [];
    const alerts: string[] = [];
    const f = await this.financeFacts(userId).catch(() => null);
    if (f) {
      if (f.overdueCount)
        alerts.push(
          `${plural(f.overdueCount, 'parcela vencida', 'parcelas vencidas')}`,
        );
      if (f.balance < 0 && f.income > 0) alerts.push('mês no vermelho');
      if (f.planned > 0 && f.expense > f.planned)
        alerts.push('orçamento estourado');
    }
    if (await this.access.hasAccess(userId)) {
      const [{ due }, events, dates, items, notes, maint] = await Promise.all([
        this.tasksFor(userId),
        this.eventsToday(userId),
        this.dates.list(userId) as Promise<DateItem[]>,
        this.market.list(userId) as Promise<Item[]>,
        this.unreadNotes(userId),
        this.maintenance.list(userId) as Promise<Maint[]>,
      ]);
      if (events.length) {
        const timed = events.find((e) => !e.allDay);
        lines.push(
          `📅 ${plural(events.length, 'compromisso', 'compromissos')}${timed ? ` (${timed.title} às ${timeOf(timed.startDate)})` : ''}`,
        );
      }
      if (due.length)
        lines.push(`📝 ${plural(due.length, 'tarefa', 'tarefas')}`);
      const soon = dates
        .filter((d) => !d.past && d.daysUntil >= 0 && d.daysUntil <= 3)
        .sort((a, b) => a.daysUntil - b.daysUntil)[0];
      if (soon)
        lines.push(
          `🎂 ${soon.title} ${soon.daysUntil === 0 ? 'é hoje' : `em ${plural(soon.daysUntil, 'dia', 'dias')}`}`,
        );
      const toBuy = items.filter((i) => i.onList && !i.checked).length;
      if (toBuy) lines.push(`🛒 ${plural(toBuy, 'item', 'itens')} na lista`);
      if (notes.length)
        lines.push(`🗒️ ${plural(notes.length, 'bilhete', 'bilhetes')}`);
      const urgent = maint.filter(
        (m) => m.priority === 'urgent' && m.status !== 'done',
      ).length;
      if (urgent)
        alerts.push(
          `${plural(urgent, 'manutenção urgente', 'manutenções urgentes')}`,
        );
    }
    const hello = `Bom dia${name ? `, ${first(name)}` : ''}!`;
    if (!lines.length && !alerts.length) {
      return {
        module: 'insights' as const,
        title: `☀️ ${hello}`,
        body: 'Dia tranquilo: nada pendente por enquanto. Aproveite (enquanto dura).',
        link: '/painel',
      };
    }
    return {
      module: 'insights' as const,
      title: alerts.length
        ? `☀️ ${hello} ⚠️ ${alerts.length} ${alerts.length === 1 ? 'ponto' : 'pontos'} de atenção`
        : `☀️ ${hello} Seu dia em resumo`,
      body: [
        alerts.length ? `Atenção: ${listOf(alerts, 3)}.` : '',
        lines.length ? `Hoje: ${lines.join(' · ')}.` : '',
      ]
        .filter(Boolean)
        .join(' '),
      link: '/painel',
    };
  }
}

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export const BRIEFING_KINDS: BriefingKind[] = [
  'insights',
  'finance',
  'tasks',
  'habits',
  'market',
  'notes',
  'agenda',
];
