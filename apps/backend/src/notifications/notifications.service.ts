import { BadRequestException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { requireJwtSecret } from '../auth/jwt-secret';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { PlanService } from '../plan/plan.service';
import axios from 'axios';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly planService: PlanService,
  ) {}

  /* ── Start hourly reminder scheduler ────────────────────────── */
  // Runs every hour on the hour; each run only notifies users whose
  // configurable whatsapp_alert_hour matches the current hour.
  onModuleInit() {
    this.scheduleHourlyTick();
  }

  private scheduleHourlyTick() {
    const now = new Date();
    const next = new Date();
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);
    const msUntil = next.getTime() - now.getTime();

    setTimeout(() => {
      this.runDailyReminders(next.getHours());
      setInterval(
        () => this.runDailyReminders(new Date().getHours()),
        60 * 60 * 1000,
      );
    }, msUntil);

    this.logger.log(
      `Hourly reminder tick scheduled — first run in ${Math.round(msUntil / 60000)} min`,
    );
  }

  /* ── Google Calendar OAuth ──────────────────────────────────── */
  getGoogleAuthUrl(userId: string): string {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const redirectUri =
      this.config.get<string>('GOOGLE_CALENDAR_REDIRECT_URI') ||
      'http://localhost:3001/api/notifications/google/callback';

    const params = new URLSearchParams({
      client_id: clientId ?? '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent',
      state: this.signState(userId),
    });
    return `https://accounts.google.com/o/oauth2/auth?${params}`;
  }

  /** Signed, short-lived OAuth state: `userId.expires.hmac` (prevents linking someone else's account). */
  private signState(userId: string) {
    const exp = Date.now() + 10 * 60_000;
    const mac = createHmac('sha256', `${requireJwtSecret()}:gcal-state`)
      .update(`${userId}.${exp}`)
      .digest('base64url');
    return `${userId}.${exp}.${mac}`;
  }

  private readState(state: string): string {
    const [userId, exp, mac] = (state ?? '').split('.');
    if (!userId || !exp || !mac || Number(exp) < Date.now())
      throw new Error('Estado OAuth inválido ou expirado.');
    const expected = createHmac('sha256', `${requireJwtSecret()}:gcal-state`)
      .update(`${userId}.${exp}`)
      .digest('base64url');
    const a = Buffer.from(mac);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b))
      throw new Error('Estado OAuth inválido.');
    return userId;
  }

  async handleGoogleCallback(code: string, state: string): Promise<void> {
    const userId = this.readState(state);
    const redirectUri =
      this.config.get<string>('GOOGLE_CALENDAR_REDIRECT_URI') ||
      'http://localhost:3001/api/notifications/google/callback';

    const { data } = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: this.config.get<string>('GOOGLE_CLIENT_ID'),
      client_secret: this.config.get<string>('GOOGLE_CLIENT_SECRET'),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const token = data.refresh_token || data.access_token;
    await this.db.query(
      'UPDATE db_dtasc.users SET google_calendar_token = $1 WHERE id = $2',
      [token, userId],
    );
    this.logger.log(`Google Calendar token saved for user ${userId}`);
  }

  async isGoogleConnected(userId: string): Promise<boolean> {
    const res = await this.db.query(
      'SELECT google_calendar_token FROM db_dtasc.users WHERE id = $1',
      [userId],
    );
    return !!res[0]?.google_calendar_token;
  }

  private async getGoogleAccessToken(refreshToken: string): Promise<string> {
    const { data } = await axios.post('https://oauth2.googleapis.com/token', {
      refresh_token: refreshToken,
      client_id: this.config.get<string>('GOOGLE_CLIENT_ID'),
      client_secret: this.config.get<string>('GOOGLE_CLIENT_SECRET'),
      grant_type: 'refresh_token',
    });
    return data.access_token;
  }

  async syncEventToGoogle(
    userId: string,
    event: {
      title: string;
      description?: string;
      startDate: string;
      endDate?: string;
      allDay?: boolean;
    },
  ): Promise<string | null> {
    const res = await this.db.query(
      'SELECT google_calendar_token FROM db_dtasc.users WHERE id = $1',
      [userId],
    );
    const refreshToken = res[0]?.google_calendar_token;
    if (!refreshToken) return null;

    try {
      const accessToken = await this.getGoogleAccessToken(refreshToken);

      const startDate = new Date(event.startDate);
      const endDate = event.endDate
        ? new Date(event.endDate)
        : new Date(startDate.getTime() + 60 * 60 * 1000);

      const gcEvent = event.allDay
        ? {
            summary: event.title,
            description: event.description,
            start: { date: startDate.toISOString().split('T')[0] },
            end: { date: endDate.toISOString().split('T')[0] },
          }
        : {
            summary: event.title,
            description: event.description,
            start: {
              dateTime: startDate.toISOString(),
              timeZone: 'America/Sao_Paulo',
            },
            end: {
              dateTime: endDate.toISOString(),
              timeZone: 'America/Sao_Paulo',
            },
            reminders: {
              useDefault: false,
              overrides: [{ method: 'popup', minutes: 30 }],
            },
          };

      const { data } = await axios.post(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        gcEvent,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      // Store googleEventId for future reference
      return data.id;
    } catch (err: any) {
      this.logger.error(`Google Calendar sync failed: ${err.message}`);
      return null;
    }
  }

  /* ── WhatsApp (Z-API) ───────────────────────────────────────── */
  async sendWhatsappTest(userId: string) {
    const [user] = await this.db.query<{ phone: string | null }>(
      'SELECT phone FROM db_dtasc.users WHERE id = $1',
      [userId],
    );
    if (!user?.phone)
      throw new BadRequestException(
        'Cadastre seu telefone no Perfil antes de testar.',
      );
    const result = await this.sendWhatsapp(
      user.phone,
      'Teste de notificação do DCash! 👋',
    );
    return { success: result.ok };
  }

  async sendWhatsapp(
    phone: string,
    message: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const instanceId = this.config.get<string>('ZAPI_INSTANCE_ID');
    const token = this.config.get<string>('ZAPI_TOKEN');
    const clientToken = this.config.get<string>('ZAPI_CLIENT_TOKEN');

    if (!instanceId || !token) {
      this.logger.warn(
        'WhatsApp not configured — set ZAPI_INSTANCE_ID and ZAPI_TOKEN in .env',
      );
      return {
        ok: false,
        error:
          'Z-API não configurada (verifique ZAPI_INSTANCE_ID e ZAPI_TOKEN)',
      };
    }

    const normalizedPhone = phone.replace(/\D/g, '');
    const phoneWithCode = normalizedPhone.startsWith('55')
      ? normalizedPhone
      : `55${normalizedPhone}`;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (clientToken) headers['Client-Token'] = clientToken;

      const { data } = await axios.post(
        `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
        { phone: phoneWithCode, message },
        { headers },
      );
      this.logger.log(
        `WhatsApp sent to ${phoneWithCode} — response: ${JSON.stringify(data)}`,
      );
      return { ok: true };
    } catch (err: any) {
      const detail = err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      this.logger.error(`WhatsApp send failed to ${phoneWithCode}: ${detail}`);
      return { ok: false, error: detail };
    }
  }

  private async canWhatsapp(userId: string): Promise<boolean> {
    return this.planService.hasFeature(userId, 'whatsapp_alerts');
  }

  /* ── Today's fixed-bills summary (in-app + WhatsApp) ────────── */
  async getTodaySummary(userId: string) {
    const today = new Date();
    const dayOfMonth = today.getDate();

    const userRes = await this.db.query(
      `SELECT family_group_id, plan, whatsapp_consent AS "whatsappConsent"
       FROM db_dtasc.users WHERE id = $1`,
      [userId],
    );
    const userRow = userRes[0];
    const familyGroupId = userRow?.family_group_id;
    const plan: string = await this.planService.getEffectivePlan(userId);
    const whatsappConsent: boolean = userRow?.whatsappConsent ?? false;

    const scopeFilter = familyGroupId
      ? `fb.family_group_id = $2`
      : `fb.user_id = $2 AND fb.family_group_id IS NULL`;
    const scopeParam = familyGroupId || userId;

    const bills = await this.db.query(
      `SELECT
         fb.id,
         fb.description       AS title,
         fb.amount::float     AS value,
         fb.day_of_month      AS "dayOfMonth",
         fb.payment_method_type AS "paymentType",
         fb.is_credit_card    AS "isCreditCard"
       FROM db_dtasc.fixed_bills fb
       WHERE fb.day_of_month = $1
         AND ${scopeFilter}
         AND COALESCE(fb.payment_method_type, 'OTHER') != 'CREDIT_CARD'
       ORDER BY fb.amount DESC`,
      [dayOfMonth, scopeParam],
    );

    const total = bills.reduce((s: number, b: any) => s + Number(b.value), 0);
    const whatsappAllowed = await this.canWhatsapp(userId);
    return {
      day: dayOfMonth,
      fixedBills: bills,
      total,
      hasAlerts: bills.length > 0,
      plan,
      whatsappConsent,
      whatsappEnabled: whatsappAllowed && whatsappConsent,
    };
  }

  /* ── Send today's summary via WhatsApp on demand ─────────────── */
  async sendTodaySummaryToUser(
    userId: string,
  ): Promise<{ sent: boolean; info: string }> {
    const userRes = await this.db.query(
      `SELECT name, plan, whatsapp_consent AS "whatsappConsent",
              COALESCE(whatsapp_number, phone) AS phone
       FROM db_dtasc.users WHERE id = $1`,
      [userId],
    );
    const user = userRes[0];

    if (!(await this.canWhatsapp(userId))) {
      return {
        sent: false,
        info: 'Alertas WhatsApp não disponíveis no seu plano atual.',
      };
    }
    if (!user?.whatsappConsent) {
      return {
        sent: false,
        info: 'Ative as notificações WhatsApp no seu perfil para receber alertas.',
      };
    }
    if (!user?.phone) {
      return {
        sent: false,
        info: 'Nenhum número de WhatsApp/telefone cadastrado no perfil.',
      };
    }

    const summary = await this.getTodaySummary(userId);
    if (!summary.hasAlerts) {
      return { sent: false, info: 'Nenhuma conta fixa vence hoje.' };
    }

    const brl = (v: number) =>
      Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const firstName = user.name?.split(' ')[0] ?? 'você';
    const today = new Date();
    const dateStr = today.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    let msg = `Olá, ${firstName}! 👋\n\n`;
    msg += `🔴 *Resumo de contas — ${dateStr}*\n\n`;
    msg += `As seguintes contas fixas vencem *hoje*:\n\n`;
    summary.fixedBills.forEach((b: any) => {
      msg += `  📌 ${b.title} — *R$ ${brl(b.value)}*\n`;
    });
    msg += `\n💰 *Total a pagar hoje: R$ ${brl(summary.total)}*\n`;
    msg += `\n_Acesse o DCash e mantenha suas finanças em dia!_ 📱`;

    const result = await this.sendWhatsapp(user.phone, msg);
    if (!result.ok) {
      return { sent: false, info: `Falha ao enviar: ${result.error}` };
    }
    return { sent: true, info: `Resumo enviado para ${user.phone}` };
  }

  /* ── Auto-create calendar events for today's fixed bills ─────── */
  private async createBillEvents(userId: string, bills: any[]): Promise<void> {
    const today = new Date();
    const dayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const dayEnd = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
    );

    for (const bill of bills) {
      const exists = await this.db.query(
        `SELECT id FROM db_dtasc.calendar_event
         WHERE user_id = $1 AND event_type = 'BILL'
           AND title = $2
           AND start_date >= $3 AND start_date <= $4`,
        [userId, `📋 ${bill.description}`, dayStart, dayEnd],
      );
      if (exists.length > 0) continue;

      await this.db.query(
        `INSERT INTO db_dtasc.calendar_event
           (title, description, start_date, event_type, color, all_day, notify_whatsapp, user_id)
         VALUES ($1, $2, $3, 'BILL', '#ef4444', true, false, $4)`,
        [
          `📋 ${bill.description}`,
          `Vencimento hoje — R$ ${Number(bill.amount || bill.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          dayStart,
          userId,
        ],
      );
    }
  }

  /* ── Daily reminder logic ───────────────────────────────────── */
  async runDailyReminders(hour?: number): Promise<void> {
    this.logger.log(
      `Running daily reminders${hour !== undefined ? ` (hour=${hour})` : ''}...`,
    );

    const today = new Date();
    const todayDay = today.getDate();

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const users = await this.db.query(
      `SELECT id, name, whatsapp_number AS "whatsappNumber", family_group_id AS "familyGroupId"
       FROM db_dtasc.users
       WHERE whatsapp_number IS NOT NULL AND whatsapp_number != ''
         AND whatsapp_consent = true
         AND ($1::int IS NULL OR COALESCE(whatsapp_alert_hour, 8) = $1)`,
      [hour ?? null],
    );
    // Filter by plan feature dynamically
    const eligibleUsers: typeof users = [];
    for (const u of users) {
      if (await this.planService.hasFeature(u.id, 'whatsapp_alerts')) {
        eligibleUsers.push(u);
      }
    }

    for (const user of eligibleUsers) {
      try {
        const fgId = user.familyGroupId;
        const txScopeFilter = fgId
          ? `(t.family_group_id = '${fgId}')`
          : `(t.user_id = '${user.id}' AND t.family_group_id IS NULL)`;
        const fbScopeFilter = fgId
          ? `fb.family_group_id = '${fgId}'`
          : `fb.user_id = '${user.id}' AND fb.family_group_id IS NULL`;

        const [transactions, events, fixedBills] = await Promise.all([
          this.db.query(
            `SELECT description, amount, type FROM db_dtasc.transactions t
             WHERE t.date >= $1 AND t.date <= $2 AND ${txScopeFilter} ORDER BY type`,
            [tomorrow, tomorrowEnd],
          ),
          this.db.query(
            `SELECT title, start_date AS "startDate" FROM db_dtasc.calendar_event
             WHERE start_date >= $1 AND start_date <= $2
               AND user_id = $3 AND notify_whatsapp = true`,
            [tomorrow, tomorrowEnd, user.id],
          ),
          this.db.query(
            `SELECT id, description, amount FROM db_dtasc.fixed_bills fb
             WHERE fb.day_of_month = $1
               AND ${fbScopeFilter}
               AND COALESCE(fb.payment_method_type, 'OTHER') != 'CREDIT_CARD'`,
            [todayDay],
          ),
        ]);

        // Auto-create calendar events for today's fixed bills
        if (fixedBills.length > 0) {
          await this.createBillEvents(user.id, fixedBills).catch(() => {});
        }

        if (
          transactions.length === 0 &&
          events.length === 0 &&
          fixedBills.length === 0
        )
          continue;

        const message = this.buildMessage(
          user.name,
          tomorrow,
          transactions,
          events,
          fixedBills,
        );
        await this.sendWhatsapp(user.whatsappNumber, message);
      } catch (err: any) {
        this.logger.error(
          `Reminder failed for user ${user.id}: ${err.message}`,
        );
      }
    }
  }

  private buildMessage(
    name: string,
    tomorrow: Date,
    transactions: any[],
    events: any[],
    fixedBills: any[] = [],
  ): string {
    const firstName = name?.split(' ')[0] ?? 'você';
    const today = new Date();
    const fmt = (d: Date) =>
      d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
    const brl = (v: number) =>
      v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    let msg = `Olá, ${firstName}! 👋\n\n`;

    // ── Fixed bills due TODAY ──────────────────────────────────
    if (fixedBills.length > 0) {
      const total = fixedBills.reduce(
        (s: number, b: any) => s + Number(b.amount),
        0,
      );
      msg += `🔴 *Contas com vencimento HOJE (${fmt(today)}):*\n`;
      fixedBills.forEach((b: any) => {
        msg += `  • ${b.description} — *R$ ${brl(Number(b.amount))}*\n`;
      });
      msg += `  💰 Total a pagar hoje: *R$ ${brl(total)}*\n\n`;
    }

    // ── Tomorrow's transactions ────────────────────────────────
    const expenses = transactions.filter((t) => t.type === 'EXPENSE');
    const income = transactions.filter((t) => t.type === 'INCOME');
    const investments = transactions.filter((t) => t.type === 'INVESTMENT');

    if (
      expenses.length > 0 ||
      income.length > 0 ||
      investments.length > 0 ||
      events.length > 0
    ) {
      msg += `📅 *Amanhã (${fmt(tomorrow)}):*\n`;

      if (expenses.length > 0) {
        msg += `\n💸 Despesas:\n`;
        expenses.forEach((t) => {
          msg += `  • ${t.description} — *R$ ${brl(Number(t.amount))}*\n`;
        });
        msg += `  Total: *R$ ${brl(expenses.reduce((s, t) => s + Number(t.amount), 0))}*\n`;
      }
      if (income.length > 0) {
        msg += `\n💰 Receitas:\n`;
        income.forEach((t) => {
          msg += `  • ${t.description} — *R$ ${brl(Number(t.amount))}*\n`;
        });
      }
      if (investments.length > 0) {
        msg += `\n📈 Investimentos:\n`;
        investments.forEach((t) => {
          msg += `  • ${t.description} — *R$ ${brl(Number(t.amount))}*\n`;
        });
      }
      if (events.length > 0) {
        msg += `\n🗓 Agenda:\n`;
        events.forEach((e) => {
          const time = new Date(e.startDate).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          });
          msg += `  • ${e.title} às ${time}\n`;
        });
      }
    }

    msg += `\n_Acesse o DCash para mais detalhes._ 📱`;
    return msg;
  }
}
