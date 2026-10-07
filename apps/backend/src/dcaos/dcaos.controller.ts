import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FamilyScopeService } from '../common/scope/family-scope.service';
import { PaymentService } from '../payment/payment.service';
import {
  DCAOS_ADDON,
  DCAOS_PRICE,
  DcaosAccessService,
  DcaosGuard,
} from './dcaos-access.service';
import { DcaosNotifyService } from './dcaos-notify.service';
import { DcaosTasksService } from './dcaos-tasks.service';
import { DcaosMarketService } from './dcaos-market.service';
import { DcaosNotesService } from './dcaos-notes.service';
import { DcaosAgendaService } from './dcaos-agenda.service';
import { DcaosHabitsService } from './dcaos-habits.service';
import { DcaosDatesService } from './dcaos-dates.service';
import { DcaosMaintenanceService } from './dcaos-maintenance.service';
import { addDays, localNow } from './dcaos.util';
import { DcaosPushService } from './dcaos-push.service';
import { DcaosBriefingService } from './dcaos-briefing.service';
import { DcaosCalendarService } from './dcaos-calendar.service';
import { MODULE_NAMES } from './dcaos.messages';
import {
  CheckoutDto,
  CreateNoteDto,
  CreatePantryItemDto,
  CreateTaskDto,
  ReactDto,
  SubscribeAddonDto,
  UpdatePantryItemDto,
  UpdateTaskDto,
  CreateEventDto,
  UpdateEventDto,
  CreateHabitDto,
  UpdateHabitDto,
  CheckHabitDto,
  CreateImportantDateDto,
  UpdateImportantDateDto,
  CreateMaintenanceDto,
  UpdateMaintenanceDto,
  PushSubscribeDto,
  BriefingTestDto,
  ConsumeDto,
  PushUnsubscribeDto,
  PreferencesDto,
} from './dto/dcaos.dto';

const uid = (req: { user?: { id?: string } }) => {
  const id = req.user?.id;
  if (!id) throw new UnauthorizedException();
  return id;
};

/** Access + billing — available without the add-on (it's how you get it). */
@Controller('dcaos')
@UseGuards(JwtAuthGuard)
export class DcaosAccessController {
  constructor(
    private readonly access: DcaosAccessService,
    private readonly payments: PaymentService,
    private readonly push: DcaosPushService,
    private readonly briefing: DcaosBriefingService,
  ) {}

  @Get('access')
  async status(@Request() req) {
    const status = await this.access.getStatus(uid(req));
    return {
      ...status,
      price: {
        monthly: DCAOS_PRICE.monthly,
        yearly:
          Math.round(
            DCAOS_PRICE.monthly * DCAOS_PRICE.yearlyDiscount * 12 * 100,
          ) / 100,
      },
    };
  }

  @Post('subscribe')
  subscribe(@Request() req, @Body() dto: SubscribeAddonDto) {
    return this.payments.createAddonSession(
      uid(req),
      {
        key: DCAOS_ADDON,
        label: DCAOS_PRICE.label,
        monthly: DCAOS_PRICE.monthly,
        yearlyDiscount: DCAOS_PRICE.yearlyDiscount,
      },
      dto.billingCycle ?? 'monthly',
    );
  }

  @Post('cancel')
  cancel(@Request() req) {
    return this.payments.cancelAddon(uid(req), DCAOS_ADDON);
  }

  // Push works for every DCash user (finance briefings); household ones need the add-on.
  // ── Dispositivos / preferências ────────────────────────────────────
  @Get('push/public-key')
  pushKey() {
    return this.push.publicKey();
  }

  @Get('push/devices')
  devices(@Request() req) {
    return this.push.devices(uid(req));
  }

  @Post('push/subscribe')
  pushSubscribe(@Request() req, @Body() dto: PushSubscribeDto) {
    return this.push.subscribe(uid(req), dto);
  }

  @Post('push/unsubscribe')
  unsubscribe(@Request() req, @Body() dto: PushUnsubscribeDto) {
    return this.push.unsubscribe(uid(req), dto.endpoint);
  }

  @Delete('push/devices/:id')
  removeDevice(@Request() req, @Param('id') id: string) {
    return this.push.removeDevice(uid(req), id);
  }

  @Post('push/test')
  async testPush(@Request() req) {
    const delivered = await this.push.sendToUser(
      uid(req),
      'system',
      {
        title: `🔔 ${MODULE_NAMES.system}`,
        body: 'Teste de notificação. Se você está lendo isto, não tem mais desculpa para dizer que não viu.',
        link: '/painel',
        tag: 'system',
      },
      true,
    );
    return { delivered };
  }

  @Get('preferences')
  preferences(@Request() req) {
    return this.push.getPrefs(uid(req));
  }

  @Patch('preferences')
  updatePreferences(@Request() req, @Body() dto: PreferencesDto) {
    return this.push.updatePrefs(uid(req), dto);
  }

  /** Sends one briefing right now (settings "testar" button). */
  @Post('push/briefing-test')
  briefingTest(@Request() req, @Body() dto: BriefingTestDto) {
    return this.briefing.preview(dto.kind, uid(req));
  }
}

/** Every feature endpoint requires the add-on. */
@Controller('dcaos')
@UseGuards(JwtAuthGuard, DcaosGuard)
export class DcaosController {
  constructor(
    private readonly familyScope: FamilyScopeService,
    private readonly notify: DcaosNotifyService,
    private readonly tasks: DcaosTasksService,
    private readonly market: DcaosMarketService,
    private readonly notes: DcaosNotesService,
    private readonly agenda: DcaosAgendaService,
    private readonly habits: DcaosHabitsService,
    private readonly dates: DcaosDatesService,
    private readonly maintenance: DcaosMaintenanceService,
    private readonly push: DcaosPushService,
    private readonly calendar: DcaosCalendarService,
  ) {}

  // ── Casa (hub) ────────────────────────────────────────────────────────
  @Get('home')
  async home(@Request() req) {
    const userId = uid(req);
    const scope = await this.familyScope.getScope(userId);
    const [
      members,
      tasks,
      items,
      unreadNotes,
      unreadNotifications,
      scoreboard,
      notifications,
      events,
      habits,
      dates,
      maintenance,
    ] = await Promise.all([
      this.notify.members(scope, userId),
      this.tasks.list(userId),
      this.market.list(userId),
      this.notes.unreadCount(userId),
      this.notify.unreadCount(userId),
      this.tasks.scoreboard(userId, 30),
      this.notify.list(userId, 8),
      this.agenda.list(userId, localNow().iso, addDays(localNow().iso, 7)),
      this.habits.list(userId),
      this.dates.list(userId),
      this.maintenance.list(userId),
    ]);
    const today = localNow().iso;
    const todaysHabits = habits.filter((h) => h.active && h.scheduledToday);
    const openMaint = (
      maintenance as {
        status: string;
        kind: string;
        priority: string;
        nextDue: string | null;
      }[]
    ).filter((m) => m.status !== 'done');
    const pending = tasks.filter(
      (t: { isCompleted: boolean }) => !t.isCompleted,
    );
    const dueToday = pending.filter(
      (t: { dueDate: string | null }) => t.dueDate && t.dueDate <= today,
    );
    return {
      members,
      isFamily: scope.isFamily,
      tasks: {
        pending: pending.length,
        mine: pending.filter(
          (t: { assigneeId: string | null }) => t.assigneeId === userId,
        ).length,
        unassigned: pending.filter(
          (t: { assigneeId: string | null }) => !t.assigneeId,
        ).length,
        overdue: dueToday.filter((t: { dueDate: string }) => t.dueDate < today)
          .length,
        today: dueToday.slice(0, 6),
      },
      market: {
        onList: items.filter((i: { onList: boolean }) => i.onList).length,
        pantry: items.filter(
          (i: { onList: boolean; quantity: number }) =>
            !i.onList || i.quantity > 0,
        ).length,
        low: items.filter(
          (i: {
            quantity: number;
            minQuantity: number | null;
            onList: boolean;
          }) =>
            !i.onList && i.minQuantity !== null && i.quantity <= i.minQuantity,
        ).length,
      },
      notes: { unread: unreadNotes },
      notifications: { unread: unreadNotifications, latest: notifications },
      scoreboard,
      agenda: { next: events.slice(0, 4), week: events.length },
      habits: {
        today: todaysHabits.length,
        doneToday: todaysHabits.filter((h) => h.doneToday).length,
        bestStreak: Math.max(0, ...habits.map((h) => h.streak)),
      },
      dates: {
        next: dates.filter((d) => !d.past && d.daysUntil <= 30).slice(0, 3),
      },
      maintenance: {
        open: openMaint.filter((m) => m.kind === 'issue').length,
        urgent: openMaint.filter(
          (m) =>
            m.kind === 'issue' &&
            (m.priority === 'urgent' || m.priority === 'high'),
        ).length,
        preventiveDue: openMaint.filter(
          (m) =>
            m.kind === 'preventive' &&
            m.nextDue &&
            m.nextDue <= addDays(today, 7),
        ).length,
      },
    };
  }

  // ── Quem Vai Fazer? ─────────────────────────────────────────────────
  @Get('tasks')
  listTasks(@Request() req) {
    return this.tasks.list(uid(req));
  }

  @Get('tasks/scoreboard')
  scoreboard(@Request() req, @Query('days') days?: string) {
    return this.tasks.scoreboard(
      uid(req),
      Math.min(365, Math.max(1, Number(days) || 30)),
    );
  }

  @Post('tasks')
  createTask(@Request() req, @Body() dto: CreateTaskDto) {
    return this.tasks.create(uid(req), dto);
  }

  @Patch('tasks/:id')
  updateTask(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(uid(req), id, dto);
  }

  @Post('tasks/:id/complete')
  completeTask(@Request() req, @Param('id') id: string) {
    return this.tasks.complete(uid(req), id);
  }

  @Post('tasks/:id/reopen')
  reopenTask(@Request() req, @Param('id') id: string) {
    return this.tasks.reopen(uid(req), id);
  }

  @Delete('tasks/:id')
  removeTask(@Request() req, @Param('id') id: string) {
    return this.tasks.remove(uid(req), id);
  }

  // ── Abastece Aí ─────────────────────────────────────────────────────
  @Get('market')
  listItems(@Request() req) {
    return this.market.list(uid(req));
  }

  @Post('market')
  createItem(@Request() req, @Body() dto: CreatePantryItemDto) {
    return this.market.create(uid(req), dto);
  }

  @Post('market/checkout')
  checkout(@Request() req, @Body() dto: CheckoutDto) {
    return this.market.checkout(uid(req), dto.ids);
  }

  @Patch('market/:id')
  updateItem(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdatePantryItemDto,
  ) {
    return this.market.update(uid(req), id, dto);
  }

  @Post('market/:id/ran-out')
  ranOut(@Request() req, @Param('id') id: string) {
    return this.market.ranOut(uid(req), id);
  }

  @Post('market/:id/consume')
  consume(@Request() req, @Param('id') id: string, @Body() dto: ConsumeDto) {
    return this.market.consume(uid(req), id, dto.amount ?? 1);
  }

  @Delete('market/:id')
  removeItem(@Request() req, @Param('id') id: string) {
    return this.market.remove(uid(req), id);
  }

  // ── Recados ─────────────────────────────────────────────────────────
  @Get('notes')
  listNotes(@Request() req) {
    return this.notes.list(uid(req));
  }

  @Post('notes')
  createNote(@Request() req, @Body() dto: CreateNoteDto) {
    return this.notes.create(uid(req), dto);
  }

  @Post('notes/read-all')
  readAllNotes(@Request() req) {
    return this.notes.markAllRead(uid(req));
  }

  @Post('notes/:id/read')
  readNote(@Request() req, @Param('id') id: string) {
    return this.notes.markRead(uid(req), id);
  }

  @Post('notes/:id/react')
  react(@Request() req, @Param('id') id: string, @Body() dto: ReactDto) {
    return this.notes.react(uid(req), id, dto.emoji);
  }

  @Patch('notes/:id/pin')
  pin(@Request() req, @Param('id') id: string) {
    return this.notes.togglePin(uid(req), id);
  }

  @Delete('notes/:id')
  removeNote(@Request() req, @Param('id') id: string) {
    return this.notes.remove(uid(req), id);
  }

  // ── Agenda unificada (camada DCaos do /calendar) ────────────────────
  @Get('calendar')
  calendarMonth(
    @Request() req,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const now = new Date();
    const m = Math.min(12, Math.max(1, Number(month) || now.getMonth() + 1));
    const y = Number(year) || now.getFullYear();
    return this.calendar.month(uid(req), m, y);
  }

  // ── Quem Tem Compromisso? ───────────────────────────────────────────
  @Get('agenda')
  listEvents(
    @Request() req,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    const start = from && iso.test(from) ? from : localNow().iso;
    const end = to && iso.test(to) ? to : addDays(start, 31);
    return this.agenda.list(uid(req), start, end);
  }

  @Post('agenda')
  createEvent(@Request() req, @Body() dto: CreateEventDto) {
    return this.agenda.create(uid(req), dto);
  }

  @Patch('agenda/:id')
  updateEvent(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.agenda.update(uid(req), id, dto);
  }

  @Delete('agenda/:id')
  removeEvent(@Request() req, @Param('id') id: string) {
    return this.agenda.remove(uid(req), id);
  }

  // ── Faz Todo Dia ────────────────────────────────────────────────────
  @Get('habits')
  listHabits(@Request() req) {
    return this.habits.list(uid(req));
  }

  @Post('habits')
  createHabit(@Request() req, @Body() dto: CreateHabitDto) {
    return this.habits.create(uid(req), dto);
  }

  @Patch('habits/:id')
  updateHabit(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateHabitDto,
  ) {
    return this.habits.update(uid(req), id, dto);
  }

  @Post('habits/:id/check')
  checkHabit(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CheckHabitDto,
  ) {
    return this.habits.check(uid(req), id, dto);
  }

  @Post('habits/:id/uncheck')
  uncheckHabit(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CheckHabitDto,
  ) {
    return this.habits.uncheck(uid(req), id, dto);
  }

  @Delete('habits/:id')
  removeHabit(@Request() req, @Param('id') id: string) {
    return this.habits.remove(uid(req), id);
  }

  // ── Não Esquece ─────────────────────────────────────────────────────
  @Get('dates')
  listDates(@Request() req) {
    return this.dates.list(uid(req));
  }

  @Post('dates')
  createDate(@Request() req, @Body() dto: CreateImportantDateDto) {
    return this.dates.create(uid(req), dto);
  }

  @Patch('dates/:id')
  updateDate(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateImportantDateDto,
  ) {
    return this.dates.update(uid(req), id, dto);
  }

  @Delete('dates/:id')
  removeDate(@Request() req, @Param('id') id: string) {
    return this.dates.remove(uid(req), id);
  }

  // ── Deu Ruim ────────────────────────────────────────────────────────
  @Get('maintenance')
  listMaintenance(@Request() req) {
    return this.maintenance.list(uid(req));
  }

  @Post('maintenance')
  createMaintenance(@Request() req, @Body() dto: CreateMaintenanceDto) {
    return this.maintenance.create(uid(req), dto);
  }

  @Patch('maintenance/:id')
  updateMaintenance(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceDto,
  ) {
    return this.maintenance.update(uid(req), id, dto);
  }

  @Post('maintenance/:id/resolve')
  resolveMaintenance(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceDto,
  ) {
    return this.maintenance.resolve(uid(req), id, dto.cost ?? undefined);
  }

  @Delete('maintenance/:id')
  removeMaintenance(@Request() req, @Param('id') id: string) {
    return this.maintenance.remove(uid(req), id);
  }

  // ── O Sistema Lembrou ───────────────────────────────────────────────
  @Get('notifications')
  notifications(@Request() req, @Query('limit') limit?: string) {
    return this.notify.list(uid(req), Number(limit) || 50);
  }

  @Post('notifications/read-all')
  readAll(@Request() req) {
    return this.notify.markRead(uid(req));
  }

  @Post('notifications/:id/read')
  read(@Request() req, @Param('id') id: string) {
    return this.notify.markRead(uid(req), id);
  }
}
