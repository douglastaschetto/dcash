import {
  ShoppingCart, StickyNote, CalendarDays, Repeat, Cake, Wrench, ListChecks, BellRing, Users,
} from '@/components/ui/icons';
import useSWR from 'swr';
import { useMemo, useSyncExternalStore, type ElementType } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────

export type Member = { id: string; name: string };

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  isCompleted: boolean;
  assigneeId: string | null;
  assigneeName: string | null;
  createdBy: string | null;
  dueDate: string | null;
  recurrence: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
  recurrenceDays: number[];
  points: number;
  area: string | null;
  completedAt: string | null;
  completedBy: string | null;
  completedByName: string | null;
  userId: string;
  createdAt: string;
};

export type PantryItem = {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  quantity: number;
  minQuantity: number | null;
  onList: boolean;
  listQuantity: number;
  checked: boolean;
  timesRanOut: number;
  lastBoughtAt: string | null;
  shelfLifeDays: number | null;
  addedBy: string | null;
  addedByName: string | null;
  updatedAt: string;
};

export type Note = {
  id: string;
  message: string;
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'purple';
  pinned: boolean;
  reactions: Record<string, string[]>;
  authorId: string;
  authorName: string | null;
  authorAvatar: string | null;
  recipientId: string | null;
  recipientName: string | null;
  read: boolean;
  readCount: number;
  createdAt: string;
};

export type Notification = {
  id: string;
  module: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  eventType: 'EVENT' | 'APPOINTMENT' | 'MEETING' | 'REMINDER';
  allDay: boolean;
  notifyDaysBefore: number;
  participantIds: string[];
  createdBy: string | null;
  createdByName: string | null;
  userId: string;
};

export type Habit = {
  id: string;
  title: string;
  icon: string | null;
  daysOfWeek: number[];
  reminderTime: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  active: boolean;
  checks: string[];
  scheduledToday: boolean;
  doneToday: boolean;
  doneTodayBy: string | null;
  streak: number;
  rate30: number;
};

export type ImportantDate = {
  id: string;
  title: string;
  personName: string | null;
  kind: 'birthday' | 'anniversary' | 'commemorative' | 'document' | 'other';
  eventDate: string;
  yearKnown: boolean;
  yearly: boolean;
  remindDaysBefore: number;
  notes: string | null;
  nextDate: string;
  daysUntil: number;
  years: number | null;
  past: boolean;
  createdByName: string | null;
};

export type Maintenance = {
  id: string;
  title: string;
  description: string | null;
  kind: 'issue' | 'preventive';
  area: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting' | 'done';
  assigneeId: string | null;
  assigneeName: string | null;
  professional: string | null;
  cost: number | null;
  intervalMonths: number | null;
  nextDue: string | null;
  reportedByName: string | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export type Scoreboard = { userId: string; name: string; points: number; tasks: number }[];

export type Home = {
  members: Member[];
  isFamily: boolean;
  tasks: { pending: number; mine: number; unassigned: number; overdue: number; today: Task[] };
  market: { onList: number; pantry: number; low: number };
  notes: { unread: number };
  notifications: { unread: number; latest: Notification[] };
  scoreboard: Scoreboard;
  agenda: { next: CalendarEvent[]; week: number };
  habits: { today: number; doneToday: number; bestStreak: number };
  dates: { next: ImportantDate[] };
  maintenance: { open: number; urgent: number; preventiveDue: number };
};

export type Access = {
  hasAccess: boolean;
  source: 'subscription' | 'admin' | null;
  status: string | null;
  billingCycle: string | null;
  expiresAt: string | null;
  purchasedBy: string | null;
  isPurchaser: boolean;
  price: { monthly: number; yearly: number };
};

// ── Module catalog ────────────────────────────────────────────────────────

export type ModuleKey = 'tasks' | 'market' | 'notes' | 'agenda' | 'habits' | 'dates' | 'maintenance' | 'system' | 'family';

export const MODULES: Record<ModuleKey, {
  name: string; generic: string; icon: ElementType; href: string | null; soon?: boolean; tagline: string;
}> = {
  tasks:       { name: 'Quem Vai Fazer?',       generic: 'Tarefas',            icon: ListChecks,   href: '/dcaos/tarefas',  tagline: 'A louça não vai se lavar sozinha.' },
  market:      { name: 'Abastece Aí',           generic: 'Mercado e despensa', icon: ShoppingCart, href: '/dcaos/mercado',  tagline: 'O leite acabou. Novamente.' },
  notes:       { name: 'Recados',               generic: 'Bilhetes',           icon: StickyNote,   href: '/dcaos/recados',  tagline: 'Porque post-it na geladeira some.' },
  agenda:      { name: 'Quem Tem Compromisso?', generic: 'Agenda da família',  icon: CalendarDays, href: '/calendar',        tagline: 'Ninguém pode dizer que não sabia.' },
  habits:      { name: 'Faz Todo Dia',          generic: 'Hábitos',            icon: Repeat,       href: '/dcaos/habitos', tagline: 'Pequenas vitórias, todo dia.' },
  dates:       { name: 'Não Esquece',           generic: 'Datas importantes',  icon: Cake,         href: '/dcaos/datas', tagline: 'Aniversário da sogra. Boa sorte.' },
  maintenance: { name: 'Deu Ruim',              generic: 'Manutenção da casa', icon: Wrench,       href: '/dcaos/manutencao', tagline: 'A torneira já virou decoração.' },
  system:      { name: 'O Sistema Lembrou',     generic: 'Notificações',       icon: BellRing,     href: '/dcaos/lembretes', tagline: 'Alguém tem que lembrar.' },
  family:      { name: 'Os Envolvidos',         generic: 'Família',            icon: Users,        href: '/profile',         tagline: 'Todo mundo tem culpa.' },
};

export const moduleOf = (key: string) => MODULES[key as ModuleKey] ?? MODULES.system;

// ── Helpers ───────────────────────────────────────────────────────────────

export const useDcaosAccess = () => useSWR<Access>('/dcaos/access');

export const apiError = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

export const firstName = (name?: string | null) => (name ?? '').split(' ')[0] || 'Alguém';

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

export function dueLabel(due: string | null) {
  if (!due) return null;
  const today = todayISO();
  if (due === today) return { text: 'Hoje', tone: 'warning' as const };
  if (due < today) {
    const days = Math.round((new Date(`${today}T00:00:00`).getTime() - new Date(`${due}T00:00:00`).getTime()) / 86400000);
    return { text: `Atrasada ${days}d`, tone: 'danger' as const };
  }
  const d = new Date(`${due}T00:00:00`);
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  if (due === `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`) {
    return { text: 'Amanhã', tone: 'neutral' as const };
  }
  return { text: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', ''), tone: 'neutral' as const };
}

// ── Current user (from the session stored at login) ──────────────────────

const noopSubscribe = () => () => {};

/** User id (`sub`) from the stored JWT — the Google login flow does not save it in dcash:user. */
export function idFromToken(token: string | null): string {
  try {
    const part = token?.split('.')[1];
    if (!part) return '';
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return json.sub ?? json.id ?? '';
  } catch { return ''; }
}

/** Logged-in user as stored by the login flow; empty on the server. */
export function useMe(): { id: string; name: string } {
  const raw = useSyncExternalStore(
    noopSubscribe,
    () => { try { return localStorage.getItem('dcash:user') ?? ''; } catch { return ''; } },
    () => '',
  );
  const token = useSyncExternalStore(
    noopSubscribe,
    () => { try { return localStorage.getItem('dcash:token') ?? ''; } catch { return ''; } },
    () => '',
  );
  return useMemo(() => {
    let u: { id?: string; name?: string } = {};
    try { u = JSON.parse(raw || '{}'); } catch { /* ignore */ }
    return { id: u.id || idFromToken(token), name: u.name ?? '' };
  }, [raw, token]);
}

export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const addDaysISO = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const fmtShortDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
