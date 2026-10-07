'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/services/api';
import { ColorPicker } from '@/lib/color-picker';
import { cn, parseDateOnly } from '@/lib/utils';
import {
  ChevronLeft, ChevronRight, Plus, X, Loader2,
  TrendingUp, TrendingDown, Repeat, Calendar, CalendarDays,
  Stethoscope, Users, Bell, Receipt,
  CheckCircle2, Circle, ListChecks, Cake, Wrench, Home,
  Trash2, Edit3, ArrowRight, Sun,
} from '@/components/ui/icons';

/* ── Types ─────────────────────────────────────────────────────── */
type Transaction = {
  id: string; description: string; amount: number;
  type: 'INCOME' | 'EXPENSE' | 'INVESTMENT'; date: string;
};
type CalendarEvent = {
  id: string; title: string; description?: string;
  startDate: string; endDate?: string;
  eventType: string; color: string; allDay: boolean;
  notifyWhatsapp: boolean;
  participantIds?: string[];
};
type FixedBill = {
  id: string; fixedBillId: string; title: string; value: number;
  dayOfMonth: number; isPaid: boolean; type: 'transaction' | 'aggregation' | 'card';
};
/* DCaos layer (household): tasks, habits, important dates, maintenance */
type DcaosItem = {
  id: string; refId: string; kind: 'task' | 'habits' | 'date' | 'maintenance';
  date: string; title: string; subtitle?: string | null; done: boolean; overdue?: boolean;
  actionable?: boolean; link: string;
  children?: { id: string; title: string; icon: string | null; done: boolean }[];
};
type Member = { id: string; name: string };
type DayData = {
  transactions: Transaction[];
  events: CalendarEvent[];
  fixedBills: FixedBill[];
  dcaos: DcaosItem[];
};
type MonthBundle = { events: CalendarEvent[]; transactions: Transaction[]; bills: FixedBill[]; dcaos: DcaosItem[] };

type LayerKey = 'finance' | 'events' | 'tasks' | 'habits' | 'dates' | 'maintenance';
const LAYERS: { key: LayerKey; label: string; icon: React.ElementType; dcaos?: boolean; on: string }[] = [
  { key: 'finance',     label: 'Finanças',   icon: TrendingUp, on: 'border-primary-border bg-primary-soft text-accent' },
  { key: 'events',      label: 'Eventos',    icon: Calendar,   on: 'border-info/30 bg-info-soft text-info' },
  { key: 'tasks',       label: 'Tarefas',    icon: ListChecks, dcaos: true, on: 'border-primary-border bg-primary-soft text-accent' },
  { key: 'habits',      label: 'Hábitos',    icon: Repeat,     dcaos: true, on: 'border-info/30 bg-info-soft text-info' },
  { key: 'dates',       label: 'Datas',      icon: Cake,       dcaos: true, on: 'border-warning/30 bg-warning-soft text-warning' },
  { key: 'maintenance', label: 'Manutenção', icon: Wrench,     dcaos: true, on: 'border-danger/30 bg-danger-soft text-danger' },
];
const KIND_LAYER: Record<DcaosItem['kind'], LayerKey> = { task: 'tasks', habits: 'habits', date: 'dates', maintenance: 'maintenance' };

/* ── Constants ─────────────────────────────────────────────────── */
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const EVENT_TYPES = [
  { id: 'EVENT',       label: 'Evento',   icon: Calendar },
  { id: 'APPOINTMENT', label: 'Consulta', icon: Stethoscope },
  { id: 'MEETING',     label: 'Reunião',  icon: Users },
  { id: 'REMINDER',    label: 'Lembrete', icon: Bell },
];

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtCompact = (v: number) => {
  const a = Math.abs(v);
  const s = a >= 1000 ? `${(a / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : a.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  return `${v < 0 ? '−' : '+'}R$ ${s}`;
};
/** Local calendar day (avoids the UTC rollover after 21h in Brazil). */
const localIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const isoOfEvent = (iso: string) => localIso(new Date(iso));
const isoOfDateOnly = (iso: string) => localIso(parseDateOnly(iso));
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const addDaysIso = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return localIso(d); };
const longDate = (iso: string) => {
  const s = new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const shortDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace(/\./g, '');

/** Groups a month's data by ISO day. */
function buildIsoMap(bundle: MonthBundle, year: number, month: number) {
  const map: Record<string, DayData> = {};
  const at = (iso: string) => (map[iso] ||= { transactions: [], events: [], fixedBills: [], dcaos: [] });
  bundle.transactions.forEach((t) => at(isoOfDateOnly(t.date)).transactions.push(t));
  bundle.events.forEach((e) => at(isoOfEvent(e.startDate)).events.push(e));
  const last = new Date(year, month, 0).getDate();
  bundle.bills.forEach((b) => {
    if (b.dayOfMonth) at(localIso(new Date(year, month - 1, Math.min(b.dayOfMonth, last)))).fixedBills.push(b);
  });
  bundle.dcaos.forEach((i) => at(i.date).dcaos.push(i));
  return map;
}

/* Unified visual entry used by cells, the day panel and "Próximos dias" */
type Entry = {
  key: string; kind: 'event' | 'date' | 'task' | 'habits' | 'maintenance' | 'bill' | 'tx';
  title: string; time?: string; allDay?: boolean; color: string; icon: React.ElementType;
  sub?: string | null; done?: boolean; danger?: boolean; sortKey: string;
};

function entriesOf(d: DayData | undefined, layers: Record<LayerKey, boolean>): Entry[] {
  if (!d) return [];
  const out: Entry[] = [];
  if (layers.events) {
    d.events.forEach((e) => {
      const type = EVENT_TYPES.find((t) => t.id === e.eventType) ?? EVENT_TYPES[0];
      out.push({
        key: `ev:${e.id}`, kind: 'event', title: e.title, time: e.allDay ? undefined : timeOf(e.startDate), allDay: e.allDay,
        color: e.color || 'var(--primary)', icon: type.icon, sub: e.allDay ? 'Dia todo' : type.label,
        sortKey: e.allDay ? '0' : `1${timeOf(e.startDate)}`,
      });
    });
  }
  d.dcaos.forEach((i) => {
    if (!layers[KIND_LAYER[i.kind]]) return;
    if (i.kind === 'date') out.push({ key: i.id, kind: 'date', title: i.title, color: 'var(--warning)', icon: Cake, sub: i.subtitle, allDay: true, sortKey: '0' });
    if (i.kind === 'task') out.push({ key: i.id, kind: 'task', title: i.title, color: 'var(--primary)', icon: ListChecks, sub: i.subtitle, done: i.done, danger: i.overdue && !i.done, sortKey: '2' });
    if (i.kind === 'habits') out.push({ key: i.id, kind: 'habits', title: i.title, color: 'var(--info)', icon: Repeat, done: i.done, sortKey: '3' });
    if (i.kind === 'maintenance') out.push({ key: i.id, kind: 'maintenance', title: i.title, color: 'var(--danger)', icon: Wrench, sub: i.subtitle, danger: i.overdue, sortKey: '4' });
  });
  if (layers.finance) {
    d.fixedBills.forEach((b) => out.push({
      key: `bill:${b.id}`, kind: 'bill', title: b.title, color: 'var(--warning)', icon: Receipt,
      sub: `${fmt(Number(b.value))}${b.isPaid ? ' · paga' : ''}`, done: b.isPaid, sortKey: '5',
    }));
  }
  return out.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

const netOf = (d: DayData | undefined) =>
  (d?.transactions ?? []).reduce((s, t) => s + (t.type === 'INCOME' ? 1 : t.type === 'EXPENSE' ? -1 : 0) * Number(t.amount), 0);

/* ── Component ─────────────────────────────────────────────────── */
/** Fired by page headers (outside the component) to open the "new event" form. */
export const NEW_EVENT_EVENT = 'calendar:new-event';

/**
 * Unified agenda (finance + events + DCaos household layers). Used full-page on
 * /calendar and `embedded` (no summary cards, compact cells, side panel that
 * moves beside the grid only when the container is wide) on /painel.
 */
export function UnifiedCalendar({ embedded = false, initialMonth, variant = 'calendar' }: { embedded?: boolean; initialMonth?: Date; variant?: 'calendar' | 'agenda' }) {
  const searchParams = useSearchParams();

  const todayIso = localIso(new Date());
  const [currentDate, setCurrentDate] = useState(() => { const d = initialMonth ?? new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [bundle, setBundle] = useState<MonthBundle>({ events: [], transactions: [], bills: [], dcaos: [] });
  const [upcomingMap, setUpcomingMap] = useState<Record<string, DayData>>({});
  const [loading, setLoading] = useState(true);
  const [selectedIso, setSelectedIso] = useState(todayIso);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [syncToGoogle, setSyncToGoogle] = useState(true);
  const [whatsappAlertHour, setWhatsappAlertHour] = useState(8);
  const [dcaosAccess, setDcaosAccess] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    finance: true, events: true, tasks: true, habits: true, dates: true, maintenance: true,
  });
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const toggleLayer = (k: LayerKey) => setLayers((l) => ({ ...l, [k]: !l[k] }));

  /* ── Event form modal ──────────────────────────────────────────── */
  const [modal, setModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', startDate: '',
    startTime: '09:00', endTime: '10:00',
    eventType: 'EVENT', color: '#10b981',
    allDay: false, notifyWhatsapp: false,
    participantIds: [] as string[],
  });
  const f = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  /* ── Data ─────────────────────────────────────────────────────── */
  const fetchMonth = useCallback(async (m: number, y: number, withDcaos: boolean): Promise<MonthBundle> => {
    const [cal, bills, dc] = await Promise.allSettled([
      api.get('/calendar-events/monthly', { params: { month: m, year: y } }),
      api.get('/fixed-bills', { params: { month: m, year: y } }),
      withDcaos ? api.get('/dcaos/calendar', { params: { month: m, year: y } }) : Promise.resolve({ data: [] }),
    ]);
    return {
      events: cal.status === 'fulfilled' ? cal.value.data?.events ?? [] : [],
      transactions: cal.status === 'fulfilled' ? cal.value.data?.transactions ?? [] : [],
      bills: bills.status === 'fulfilled' ? bills.value.data ?? [] : [],
      dcaos: dc.status === 'fulfilled' ? dc.value.data ?? [] : [],
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try { setBundle(await fetchMonth(month, year, dcaosAccess)); } finally { setLoading(false); }
  }, [fetchMonth, month, year, dcaosAccess]);

  /** Today + next 7 days may cross into next month, so both are loaded. */
  const loadUpcoming = useCallback(async () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const [a, b] = await Promise.all([
      fetchMonth(now.getMonth() + 1, now.getFullYear(), dcaosAccess),
      fetchMonth(next.getMonth() + 1, next.getFullYear(), dcaosAccess),
    ]);
    setUpcomingMap({ ...buildIsoMap(a, now.getFullYear(), now.getMonth() + 1), ...buildIsoMap(b, next.getFullYear(), next.getMonth() + 1) });
  }, [fetchMonth, dcaosAccess]);

  const reloadAll = useCallback(() => { load(); loadUpcoming(); }, [load, loadUpcoming]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadUpcoming(); }, [loadUpcoming]);

  useEffect(() => {
    api.get('/dcaos/access').then(({ data }) => { if (data?.hasAccess) setDcaosAccess(true); }).catch(() => {});
    api.get('/family/members')
      .then(({ data }) => setMembers((data?.members ?? []).map((m: Member) => ({ id: m.id, name: m.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (searchParams.get('google') !== 'connected') {
      api.get('/notifications/google/status').then(({ data }) => setGoogleConnected(data.connected)).catch(() => {});
    } else {
      setGoogleConnected(true);
    }
    api.get('/auth/me')
      .then(({ data }) => {
        setSyncToGoogle(data?.googleCalendarSync ?? true);
        setWhatsappAlertHour(data?.whatsappAlertHour ?? 8);
      })
      .catch(() => {});
  }, [searchParams]);

  const monthMap = useMemo(() => buildIsoMap(bundle, year, month), [bundle, year, month]);
  const dataFor = (iso: string) => monthMap[iso] ?? upcomingMap[iso];

  /* ── Summary ──────────────────────────────────────────────────── */
  const summary = useMemo(() => ({
    income: bundle.transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0),
    expense: bundle.transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0),
    investment: bundle.transactions.filter((t) => t.type === 'INVESTMENT').reduce((s, t) => s + Number(t.amount), 0),
    fixedTotal: bundle.bills.reduce((s, b) => s + Number(b.value), 0),
    events: bundle.events.length,
    tasks: bundle.dcaos.filter((i) => i.kind === 'task' && !i.done).length,
    tasksDone: bundle.dcaos.filter((i) => i.kind === 'task' && i.done).length,
    dates: bundle.dcaos.filter((i) => i.kind === 'date').length,
  }), [bundle]);

  /* ── Grid ─────────────────────────────────────────────────────── */
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks = Math.ceil((firstWeekday + daysInMonth) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const d = i - firstWeekday + 1;
    return d >= 1 && d <= daysInMonth ? localIso(new Date(year, month - 1, d)) : null;
  });

  const goMonth = (delta: number) => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  const goToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedIso(todayIso);
  };

  /* ── Modal ────────────────────────────────────────────────────── */
  const openCreate = (iso?: string) => {
    setEditingEvent(null);
    setForm({ title: '', description: '', startDate: iso ?? selectedIso, startTime: '09:00', endTime: '10:00', eventType: 'EVENT', color: '#10b981', allDay: false, notifyWhatsapp: false, participantIds: [] });
    setModal(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    const d = new Date(ev.startDate);
    setEditingEvent(ev);
    setForm({
      title: ev.title, description: ev.description ?? '',
      startDate: localIso(d), startTime: d.toTimeString().slice(0, 5),
      endTime: ev.endDate ? new Date(ev.endDate).toTimeString().slice(0, 5) : '10:00',
      eventType: ev.eventType, color: ev.color, allDay: ev.allDay, notifyWhatsapp: ev.notifyWhatsapp,
      participantIds: ev.participantIds ?? [],
    });
    setModal(true);
  };

  useEffect(() => {
    const open = () => openCreate();
    window.addEventListener(NEW_EVENT_EVENT, open);
    return () => window.removeEventListener(NEW_EVENT_EVENT, open);
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const startDate = form.allDay ? `${form.startDate}T00:00:00` : `${form.startDate}T${form.startTime}:00`;
      const endDate = form.allDay ? `${form.startDate}T23:59:59` : `${form.startDate}T${form.endTime}:00`;
      const payload = { title: form.title, description: form.description || null, startDate, endDate, eventType: form.eventType, color: form.color, allDay: form.allDay, notifyWhatsapp: form.notifyWhatsapp };
      const base = dcaosAccess ? '/dcaos/agenda' : '/calendar-events';
      const body = dcaosAccess ? { ...payload, participantIds: form.participantIds } : payload;
      if (editingEvent) {
        await api.patch(`${base}/${editingEvent.id}`, body);
      } else {
        await api.post(base, body);
        if (googleConnected && syncToGoogle) await api.post('/notifications/google/sync-event', payload);
      }
      reloadAll();
      setModal(false);
    } catch { alert('Erro ao salvar evento.'); } finally { setSaving(false); }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Remover este evento?')) return;
    try { await api.delete(`/calendar-events/${id}`); reloadAll(); } catch { alert('Erro ao remover.'); }
  };

  /* ── Household actions ────────────────────────────────────────── */
  const completeTask = async (it: DcaosItem) => {
    setBusyItem(it.id);
    try { await api.post(`/dcaos/tasks/${it.refId}/complete`); reloadAll(); }
    catch { alert('Não foi possível concluir a tarefa.'); }
    finally { setBusyItem(null); }
  };
  const toggleHabit = async (habitId: string, date: string, done: boolean) => {
    setBusyItem(`${habitId}:${date}`);
    try { await api.post(`/dcaos/habits/${habitId}/${done ? 'uncheck' : 'check'}`, { date }); reloadAll(); }
    catch { alert('Não foi possível marcar o hábito.'); }
    finally { setBusyItem(null); }
  };
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name?.split(' ')[0] ?? '—';

  /* ── Selected day ─────────────────────────────────────────────── */
  const day = dataFor(selectedIso);
  const dayEvents = layers.events ? (day?.events ?? []).slice().sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate)) : [];
  const allDayEvents = dayEvents.filter((e) => e.allDay);
  const timedEvents = dayEvents.filter((e) => !e.allDay);
  const house = (day?.dcaos ?? []).filter((i) => layers[KIND_LAYER[i.kind]]);
  const dayDates = house.filter((i) => i.kind === 'date');
  const dayTasks = house.filter((i) => i.kind === 'task');
  const dayHabits = house.find((i) => i.kind === 'habits');
  const dayMaint = house.filter((i) => i.kind === 'maintenance');
  const dayBills = layers.finance ? day?.fixedBills ?? [] : [];
  const dayTx = layers.finance ? day?.transactions ?? [] : [];
  const dayIncome = dayTx.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
  const dayExpense = dayTx.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
  const dayEmpty = !dayEvents.length && !house.length && !dayBills.length && !dayTx.length;
  const isToday = selectedIso === todayIso;

  const upcoming = Array.from({ length: 7 }, (_, i) => addDaysIso(todayIso, i + 1))
    .map((iso) => ({ iso, entries: entriesOf(upcomingMap[iso], layers) }));
  const upcomingCount = upcoming.reduce((s, u) => s + u.entries.filter((e) => !e.done).length, 0);


  const panelSection = (title: string, children: React.ReactNode, href?: string) => (
    <div key={title} className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{title}</p>
        {href && <Link href={href} className="flex items-center gap-0.5 text-[10px] font-semibold text-accent hover:underline">Abrir <ArrowRight size={10} /></Link>}
      </div>
      {children}
    </div>
  );

  const dayContent = (
    <>
      {dayEmpty ? (
                  <div className="rounded-xl border border-dashed border-border py-8 text-center">
                    <CalendarDays size={22} strokeWidth={1.5} className="mx-auto text-fg-muted" />
                    <p className="mt-2 text-sm font-semibold text-fg">Nada marcado nesse dia</p>
                    <p className="text-xs text-fg-muted">Toque em &quot;Marcar&quot; para adicionar um evento.</p>
                  </div>
                ) : (
                  <>
                    {(dayDates.length > 0 || allDayEvents.length > 0) && panelSection('Dia todo', (
                      <div className="space-y-1.5">
                        {dayDates.map((dt) => (
                          <div key={dt.id} className="flex items-center gap-2.5 rounded-xl bg-warning-soft px-3 py-2.5">
                            <Cake size={15} className="shrink-0 text-warning" />
                            <div className="min-w-0"><p className="truncate text-[13px] font-semibold text-fg">{dt.title}</p><p className="text-[11px] text-fg-muted">{dt.subtitle}</p></div>
                          </div>
                        ))}
                        {allDayEvents.map((ev) => (
                          <div key={ev.id} className="group flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ backgroundColor: `color-mix(in srgb, ${ev.color} 14%, transparent)` }}>
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ev.color }} />
                            <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-fg">{ev.title}</p>
                            <button onClick={() => openEdit(ev)} aria-label="Editar" className="text-fg-muted opacity-0 hover:text-fg group-hover:opacity-100"><Edit3 size={12} /></button>
                            <button onClick={() => handleDeleteEvent(ev.id)} aria-label="Remover" className="text-fg-muted opacity-0 hover:text-danger group-hover:opacity-100"><Trash2 size={12} /></button>
                          </div>
                        ))}
                      </div>
                    ))}

                    {timedEvents.length > 0 && panelSection('Compromissos', (
                      <ol className="relative space-y-2 before:absolute before:left-[43px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                        {timedEvents.map((ev) => {
                          const TypeIcon = EVENT_TYPES.find((t) => t.id === ev.eventType)?.icon ?? Calendar;
                          return (
                            <li key={ev.id} className="group relative flex items-start gap-3">
                              <span className="w-9 shrink-0 pt-2 text-right text-[11px] font-semibold tabular-nums text-fg-2">{timeOf(ev.startDate)}</span>
                              <span className="relative z-10 mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-card" style={{ backgroundColor: ev.color }} />
                              <div className="min-w-0 flex-1 rounded-xl border px-3 py-2" style={{ borderColor: `color-mix(in srgb, ${ev.color} 35%, transparent)`, backgroundColor: `color-mix(in srgb, ${ev.color} 8%, transparent)` }}>
                                <div className="flex items-start justify-between gap-2">
                                  <p className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-fg"><TypeIcon size={12} style={{ color: ev.color }} className="shrink-0" /><span className="truncate">{ev.title}</span></p>
                                  <div className="flex shrink-0 gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                                    <button onClick={() => openEdit(ev)} aria-label="Editar" className="text-fg-muted hover:text-fg"><Edit3 size={12} /></button>
                                    <button onClick={() => handleDeleteEvent(ev.id)} aria-label="Remover" className="text-fg-muted hover:text-danger"><Trash2 size={12} /></button>
                                  </div>
                                </div>
                                <p className="text-[11px] text-fg-muted">
                                  {timeOf(ev.startDate)}{ev.endDate ? `–${timeOf(ev.endDate)}` : ''}
                                  {dcaosAccess && (ev.participantIds?.length ?? 0) > 0 && <> · <Users size={10} className="inline" /> {ev.participantIds!.map(nameOf).join(', ')}</>}
                                </p>
                                {ev.description && <p className="mt-0.5 line-clamp-2 text-[11px] text-fg-2">{ev.description}</p>}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    ))}

                    {dayTasks.length > 0 && panelSection('Tarefas da casa', (
                      <div className="space-y-1.5">
                        {dayTasks.map((t) => (
                          <div key={t.id} className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2">
                            {t.done ? <CheckCircle2 size={16} className="shrink-0 text-accent" />
                              : t.actionable ? (
                                <button onClick={() => completeTask(t)} disabled={busyItem === t.id} aria-label="Concluir" className="shrink-0 text-fg-muted hover:text-accent">
                                  {busyItem === t.id ? <Loader2 size={16} className="animate-spin" /> : <Circle size={16} />}
                                </button>
                              ) : <Repeat size={14} className="shrink-0 text-fg-disabled" />}
                            <div className="min-w-0 flex-1">
                              <p className={cn('truncate text-[13px] font-medium', t.done ? 'text-fg-muted line-through' : t.overdue ? 'text-danger' : 'text-fg')}>{t.title}</p>
                              <p className="truncate text-[11px] text-fg-muted">{t.subtitle}{!t.done && !t.actionable ? ' · prevista' : ''}{t.overdue && !t.done ? ' · atrasada' : ''}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ), '/dcaos/tarefas')}

                    {dayHabits && panelSection(dayHabits.title, (
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                        {dayHabits.children?.map((h) => (
                          <button key={h.id} onClick={() => toggleHabit(h.id, selectedIso, h.done)}
                            disabled={busyItem === `${h.id}:${selectedIso}` || selectedIso > todayIso}
                            className={cn('flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors disabled:cursor-default',
                              h.done ? 'border-info/30 bg-info-soft' : 'border-border bg-surface-2 hover:bg-hover')}>
                            {busyItem === `${h.id}:${selectedIso}` ? <Loader2 size={14} className="animate-spin text-fg-muted" />
                              : h.done ? <CheckCircle2 size={14} className="shrink-0 text-info" /> : <Circle size={14} className="shrink-0 text-fg-muted" />}
                            <span className={cn('truncate text-xs font-medium', h.done ? 'text-fg-muted line-through' : 'text-fg')}>{h.icon ?? '✅'} {h.title}</span>
                          </button>
                        ))}
                      </div>
                    ), '/dcaos/habitos')}

                    {dayMaint.length > 0 && panelSection('Manutenção', (
                      <div className="space-y-1.5">
                        {dayMaint.map((m) => (
                          <div key={m.id} className="flex items-center gap-2.5 rounded-xl bg-danger-soft px-3 py-2.5">
                            <Wrench size={14} className="shrink-0 text-danger" />
                            <div className="min-w-0"><p className="truncate text-[13px] font-semibold text-fg">{m.title}</p><p className="text-[11px] text-fg-muted">{m.subtitle}{m.overdue ? ' · atrasada' : ''}</p></div>
                          </div>
                        ))}
                      </div>
                    ), '/dcaos/manutencao')}

                    {(dayBills.length > 0 || dayTx.length > 0) && panelSection('Finanças do dia', (
                      <div className="space-y-1.5">
                        {(dayIncome > 0 || dayExpense > 0) && (
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="rounded-xl bg-primary-soft px-3 py-2"><p className="text-[10px] text-fg-muted">Entrou</p><p className="text-[13px] font-semibold tabular-nums text-accent">{fmt(dayIncome)}</p></div>
                            <div className="rounded-xl bg-danger-soft px-3 py-2"><p className="text-[10px] text-fg-muted">Saiu</p><p className="text-[13px] font-semibold tabular-nums text-danger">{fmt(dayExpense)}</p></div>
                          </div>
                        )}
                        {dayBills.map((b) => (
                          <div key={b.id} className="flex items-center justify-between gap-2 rounded-xl bg-warning-soft px-3 py-2">
                            <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-fg"><Receipt size={12} className="shrink-0 text-warning" /><span className="truncate">{b.title}</span></span>
                            <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold tabular-nums text-warning">
                              {fmt(Number(b.value))} {b.isPaid ? <CheckCircle2 size={12} className="text-accent" /> : <span className="h-1.5 w-1.5 rounded-full bg-warning" />}
                            </span>
                          </div>
                        ))}
                        {dayTx.map((t) => (
                          <div key={t.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
                            <span className="truncate text-xs font-medium text-fg-2">{t.description}</span>
                            <span className={cn('shrink-0 text-xs font-semibold tabular-nums', t.type === 'INCOME' ? 'text-accent' : t.type === 'EXPENSE' ? 'text-danger' : 'text-info')}>
                              {t.type === 'EXPENSE' ? '−' : '+'}{fmt(Number(t.amount))}
                            </span>
                          </div>
                        ))}
                      </div>
                    ), '/transactions')}
                  </>
                )}
    </>
  );

  const eventModal = modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-overlay backdrop-blur-sm" onClick={() => setModal(false)}>
          <div className="w-full max-w-lg rounded-3xl bg-card dark:bg-surface shadow-2xl overflow-hidden max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b-2 shrink-0" style={{ borderColor: `${form.color}25` }}>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl" style={{ backgroundColor: `${form.color}15` }}>
                  <Calendar size={20} style={{ color: form.color }} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-fg-muted">{editingEvent ? 'Editar evento' : 'Novo evento'}</p>
                  <h2 className="text-xl font-semibold tracking-tight text-fg leading-none mt-0.5">{form.startDate ? longDate(form.startDate) : 'Agenda'}</h2>
                </div>
              </div>
              <button onClick={() => setModal(false)} className="p-2.5 rounded-xl bg-surface-2 dark:bg-card hover:bg-hover transition" aria-label="Fechar">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-6 space-y-3.5">
              <div className="grid grid-cols-4 gap-2">
                {EVENT_TYPES.map((t) => (
                  <button key={t.id} type="button" onClick={() => f('eventType', t.id)}
                    className={cn('py-3 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all text-[11px] font-semibold', form.eventType === t.id ? '' : 'border-border text-fg-muted hover:border-border-hover')}
                    style={form.eventType === t.id ? { borderColor: form.color, color: form.color, backgroundColor: `${form.color}08` } : {}}
                  >
                    <t.icon size={16} />
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-fg-muted ml-1">Título *</label>
                <input required autoFocus value={form.title} onChange={(e) => f('title', e.target.value)} placeholder="Ex: Consulta médica, Reunião..." className="field" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-fg-muted ml-1">Data & hora</label>
                  <div onClick={() => f('allDay', !form.allDay)} className="flex items-center gap-2 cursor-pointer">
                    <div className={cn('relative w-9 h-5 rounded-full transition-colors shrink-0', form.allDay ? 'bg-primary' : 'bg-track')}>
                      <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', form.allDay ? 'translate-x-4' : 'translate-x-0.5')} />
                    </div>
                    <span className="text-[11px] font-semibold text-fg-muted">Dia todo</span>
                  </div>
                </div>
                <div className={cn('grid gap-3', form.allDay ? 'grid-cols-1' : 'grid-cols-3')}>
                  <input type="date" required value={form.startDate} onChange={(e) => f('startDate', e.target.value)} className="field" />
                  {!form.allDay && (
                    <>
                      <input type="time" value={form.startTime} onChange={(e) => f('startTime', e.target.value)} className="field" />
                      <input type="time" value={form.endTime} onChange={(e) => f('endTime', e.target.value)} className="field" />
                    </>
                  )}
                </div>
              </div>

              {dcaosAccess && members.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-fg-muted ml-1">Quem vai?</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => f('participantIds', [])}
                      className={cn('h-8 rounded-lg border px-2.5 text-xs font-medium', form.participantIds.length === 0 ? 'border-primary bg-primary-soft text-accent' : 'border-border text-fg-2 hover:bg-hover')}>
                      Família toda
                    </button>
                    {members.map((m) => {
                      const on = form.participantIds.includes(m.id);
                      return (
                        <button key={m.id} type="button"
                          onClick={() => f('participantIds', on ? form.participantIds.filter((x) => x !== m.id) : [...form.participantIds, m.id])}
                          className={cn('h-8 rounded-lg border px-2.5 text-xs font-medium', on ? 'border-primary bg-primary-soft text-accent' : 'border-border text-fg-2 hover:bg-hover')}>
                          {m.name.split(' ')[0]}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-fg-muted ml-1">Quem for marcado recebe o aviso do DCaos.</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-fg-muted ml-1">Descrição</label>
                <textarea value={form.description} onChange={(e) => f('description', e.target.value)} placeholder="Detalhes opcionais..." rows={2} className="field !h-auto resize-none py-2.5" />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-fg-muted ml-1">Cor</label>
                <ColorPicker selected={form.color} onSelect={(c) => f('color', c)} />
              </div>

              <div className="space-y-3 p-4 rounded-2xl bg-surface-2 dark:bg-card border border-border">
                <p className="text-[11px] font-semibold text-fg-muted">Notificações</p>
                <div onClick={() => f('notifyWhatsapp', !form.notifyWhatsapp)} className="flex items-center gap-3 cursor-pointer">
                  <div className={cn('relative w-9 h-5 rounded-full transition-colors shrink-0', form.notifyWhatsapp ? 'bg-primary' : 'bg-track')}>
                    <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', form.notifyWhatsapp ? 'translate-x-4' : 'translate-x-0.5')} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-fg-2">Alerta WhatsApp</p>
                    <p className="text-[11px] text-fg-muted">Lembrete às {String(whatsappAlertHour).padStart(2, '0')}h do dia anterior</p>
                  </div>
                </div>
                {googleConnected && syncToGoogle && (
                  <p className="text-[11px] text-fg-muted flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-accent shrink-0" />
                    Sincronização automática com o Google Agenda ativa (configurável no <a href="/profile" className="underline text-accent">perfil</a>).
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {editingEvent && (
                  <button type="button" onClick={() => { setModal(false); handleDeleteEvent(editingEvent.id); }} className="btn btn-secondary btn-square" aria-label="Remover evento">
                    <Trash2 size={14} />
                  </button>
                )}
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 rounded-2xl font-semibold text-[13px] text-white transition disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                  style={{ backgroundColor: form.color }}>
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {editingEvent ? 'Salvar evento' : 'Criar evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      );

  /* ── Agenda variant (painel): today in focus + next 7 days as cards ── */
  if (variant === 'agenda') {
    const week = Array.from({ length: 7 }, (_, i) => addDaysIso(todayIso, i)).map((iso) => ({ iso, entries: entriesOf(dataFor(iso), layers) }));
    const weekCount = week.reduce((sum, w) => sum + w.entries.filter((e) => !e.done).length, 0);
    const todayEntries = entriesOf(dataFor(selectedIso), layers);
    const openToday = todayEntries.filter((e) => !e.done).length;
    const habitsToday = dayHabits?.children ?? [];
    const habitsDone = habitsToday.filter((h) => h.done).length;
    const stats = [
      { label: 'compromisso', plural: 'compromissos', n: dayEvents.length, icon: Calendar, tone: 'text-info' },
      { label: 'tarefa', plural: 'tarefas', n: dayTasks.filter((t) => !t.done).length, icon: ListChecks, tone: 'text-accent' },
      ...(habitsToday.length ? [{ label: `hábito ${habitsDone}/${habitsToday.length}`, plural: `hábitos ${habitsDone}/${habitsToday.length}`, n: -1, icon: Repeat, tone: 'text-info' }] : []),
      { label: 'conta', plural: 'contas', n: dayBills.filter((b) => !b.isPaid).length, icon: Receipt, tone: 'text-warning' },
    ];
    return (
      <>
        <div className="@container space-y-4">
          {/* Today + next 6 days — pick a day to see it below */}
          <section data-tour="painel-week">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-sm font-semibold text-fg">Próximos dias</p>
              <span className="text-[11px] text-fg-muted">{weekCount} pendência{weekCount === 1 ? '' : 's'} · {shortDay(todayIso)} até {shortDay(addDaysIso(todayIso, 6))}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 @xl:grid-cols-4 @5xl:grid-cols-7">
              {week.map(({ iso, entries }, idx) => {
                const open = entries.filter((e) => !e.done);
                const d = new Date(`${iso}T00:00:00`);
                const weekend = d.getDay() === 0 || d.getDay() === 6;
                const net = netOf(dataFor(iso));
                const selected = selectedIso === iso;
                return (
                  <button key={iso} onClick={() => setSelectedIso(iso)} aria-pressed={selected}
                    className={cn('group flex min-h-[140px] flex-col rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md',
                      selected ? 'border-primary bg-primary-soft/50 ring-2 ring-primary/25' : 'border-border bg-card hover:border-border-hover')}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={cn('text-[10px] font-semibold uppercase tracking-wide', idx <= 1 ? 'text-accent' : weekend ? 'text-info' : 'text-fg-muted')}>
                          {idx === 0 ? 'Hoje' : idx === 1 ? 'Amanhã' : WEEKDAYS[d.getDay()]}
                        </p>
                        <p className="text-2xl font-semibold leading-none tabular-nums text-fg">{d.getDate()}</p>
                        <p className="mt-0.5 text-[10px] text-fg-muted">{idx <= 1 ? WEEKDAYS[d.getDay()].toLowerCase() + ' · ' : ''}{MONTHS[d.getMonth()].slice(0, 3).toLowerCase()}</p>
                      </div>
                      {open.length > 0 ? (
                        <span className={cn('flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                          selected ? 'bg-primary text-on-primary' : 'bg-surface-2 text-fg-2')}>{open.length}</span>
                      ) : entries.length > 0 ? <CheckCircle2 size={15} className="text-accent" /> : null}
                    </div>
                    <div className="mt-3 flex-1">
                      {open.length === 0 ? (
                        <p className="text-xs text-fg-disabled">{entries.length ? 'Tudo feito ✅' : 'Livre 🎉'}</p>
                      ) : (
                        <ul className="space-y-1">
                          {open.slice(0, 4).map((en) => (
                            <li key={en.key} className={cn('flex items-center gap-1.5 text-[11px] leading-tight', en.danger ? 'text-danger' : 'text-fg-2')}>
                              <en.icon size={11} className="shrink-0" style={{ color: en.color }} />
                              {en.time && <span className="shrink-0 tabular-nums text-fg-muted">{en.time}</span>}
                              <span className="truncate">{en.title}</span>
                            </li>
                          ))}
                          {open.length > 4 && <li className="text-[10px] font-semibold text-fg-muted">+{open.length - 4} mais</li>}
                        </ul>
                      )}
                    </div>
                    {net !== 0 && layers.finance && (
                      <p className={cn('mt-2 border-t border-border pt-1.5 text-[10px] font-semibold tabular-nums', net > 0 ? 'text-accent' : 'text-danger')}>{fmtCompact(net)}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Selected day: tasks, habits, finances… */}
          <section data-tour="painel-day" className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-primary-soft/60 px-4 py-2.5">
              <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-fg">
                <span className={cn('flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em]', isToday ? 'text-accent' : 'text-fg-muted')}>
                  {isToday && <Sun size={12} className="motion-safe:animate-[spin_12s_linear_infinite]" />}
                  {isToday ? 'Hoje' : selectedIso < todayIso ? 'Passou' : 'Dia'}
                </span>
                <span className="text-fg-disabled">·</span>
                <span className="truncate">{longDate(selectedIso)}</span>
              </p>
              <div className="flex flex-wrap gap-1">
                {stats.filter((st) => st.n !== 0).map((st) => (
                  <span key={st.plural} className="inline-flex h-5 items-center gap-1 rounded-full border border-border bg-card px-1.5 text-[10px] font-medium text-fg-2">
                    <st.icon size={10} className={st.tone} />
                    {st.n < 0 ? st.label : `${st.n} ${st.n === 1 ? st.label : st.plural}`}
                  </span>
                ))}
                {openToday === 0 && !dayEmpty && <span className="inline-flex h-5 items-center gap-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-on-primary"><CheckCircle2 size={10} /> Tudo em dia</span>}
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-1">
                {!isToday && <button onClick={() => setSelectedIso(todayIso)} className="btn btn-secondary h-7 rounded-full px-2.5 text-[11px]">Hoje</button>}
                <button onClick={() => openCreate(selectedIso)} className="btn btn-primary h-7 rounded-full px-2.5 text-[11px]"><Plus size={12} /> Marcar</button>
                <Link href="/calendar" aria-label="Abrir agenda" title="Abrir agenda" className="btn btn-secondary h-7 w-7 rounded-full p-0"><CalendarDays size={13} /></Link>
              </div>
            </div>
            <div className="p-4 [&>div]:grid [&>div]:grid-cols-1 [&>div]:gap-4 @3xl:[&>div]:grid-cols-2 @6xl:[&>div]:grid-cols-3">
              <div>{dayContent}</div>
            </div>
          </section>

        </div>
        {eventModal}
      </>
    );
  }

  return (
    <>
      <div className={embedded ? '@container space-y-4' : 'w-full p-4 md:p-6 space-y-4'}>

        {/* ── Summary ──────────────────────────────────────────────── */}
        {!embedded && <section data-tour="calendar-summary-cards" className={cn('grid grid-cols-2 gap-3', dcaosAccess ? 'sm:grid-cols-3 xl:grid-cols-6' : 'sm:grid-cols-3 xl:grid-cols-5')}>
          {[
            { label: 'Receitas', value: fmt(summary.income), tone: 'text-accent', icon: TrendingUp },
            { label: 'Despesas', value: fmt(summary.expense), tone: 'text-danger', icon: TrendingDown },
            { label: 'Contas fixas', value: fmt(summary.fixedTotal), tone: 'text-warning', icon: Receipt },
            { label: 'Investimentos', value: fmt(summary.investment), tone: 'text-info', icon: Repeat },
            { label: 'Eventos', value: String(summary.events), tone: 'text-fg', icon: CalendarDays },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium text-fg-2">{k.label}</p>
                <k.icon size={14} className={k.tone} />
              </div>
              <p className={cn('mt-1.5 truncate text-lg font-semibold tabular-nums', k.tone)}>{k.value}</p>
            </div>
          ))}
          {dcaosAccess && (
            <Link href="/dcaos" className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary-border">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium text-fg-2">Casa</p>
                <Home size={14} className="text-accent" />
              </div>
              <p className="mt-1.5 text-lg font-semibold tabular-nums text-fg">{summary.tasks} <span className="text-xs font-normal text-fg-muted">tarefas</span></p>
              <p className="text-[11px] text-fg-muted">{summary.tasksDone} feitas · {summary.dates} datas</p>
            </Link>
          )}
        </section>}

        <div className={cn('grid grid-cols-1 gap-4', embedded
          ? '@4xl:grid-cols-[minmax(0,1fr)_300px]'
          : 'xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]')}>

          {/* ═══════ Calendar ═══════ */}
          <section className="min-w-0 rounded-2xl border border-border bg-card p-3 md:p-4">
            <div data-tour="calendar-month-nav" className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <button onClick={() => goMonth(-1)} aria-label="Mês anterior" className="icon-btn !h-8 !w-8"><ChevronLeft size={16} /></button>
                <h2 className="min-w-[170px] text-center text-lg font-semibold tracking-tight text-fg">
                  {MONTHS[month - 1]} <span className="font-normal text-fg-muted">de {year}</span>
                </h2>
                <button onClick={() => goMonth(1)} aria-label="Próximo mês" className="icon-btn !h-8 !w-8"><ChevronRight size={16} /></button>
                <button onClick={goToday} className="btn btn-secondary h-8 px-3 text-xs">Hoje</button>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {LAYERS.filter((l) => !l.dcaos || dcaosAccess).map((l) => (
                  <button key={l.key} onClick={() => toggleLayer(l.key)} aria-pressed={layers[l.key]} title={layers[l.key] ? `Ocultar ${l.label}` : `Mostrar ${l.label}`}
                    className={cn('inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold transition-colors',
                      layers[l.key] ? l.on : 'border-border text-fg-muted line-through hover:text-fg')}>
                    <l.icon size={11} /> {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-7">
              {WEEKDAYS.map((d) => (
                <div key={d} className="pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{d}</div>
              ))}
            </div>

            {loading ? (
              <div className="flex h-96 items-center justify-center"><Loader2 size={28} className="animate-spin text-accent" /></div>
            ) : (
              <div data-tour="calendar-grid" className="grid grid-cols-7 gap-1 md:gap-1.5">
                {cells.map((iso, i) => {
                  if (!iso) return <div key={i} className={cn('min-h-[56px] rounded-xl', embedded ? 'md:min-h-[84px]' : 'md:min-h-[112px]')} />;
                  const d = monthMap[iso];
                  const entries = entriesOf(d, layers);
                  const net = layers.finance ? netOf(d) : 0;
                  const today = iso === todayIso;
                  const selected = iso === selectedIso;
                  const past = iso < todayIso;
                  return (
                    <div
                      key={iso}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedIso(iso)}
                      onDoubleClick={() => openCreate(iso)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setSelectedIso(iso); }}
                      className={cn(
                        'group relative flex min-h-[56px] cursor-pointer flex-col rounded-xl border p-1.5 text-left transition-all md:p-2',
                        embedded ? 'md:min-h-[84px]' : 'md:min-h-[112px]',
                        selected ? 'border-primary bg-primary-soft ring-1 ring-primary' : 'border-border bg-surface-2/40 hover:border-border-hover hover:bg-card-hover',
                      )}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums',
                          today ? 'bg-primary text-on-primary' : selected ? 'text-accent' : past ? 'text-fg-muted' : 'text-fg')}>
                          {Number(iso.slice(8))}
                        </span>
                        {net !== 0 && (
                          <span className={cn('hidden rounded px-1 text-[10px] font-semibold tabular-nums md:inline', net > 0 ? 'text-accent' : 'text-danger')}>
                            {fmtCompact(net)}
                          </span>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); openCreate(iso); }} title="Adicionar evento" aria-label="Adicionar evento"
                          className="absolute bottom-1 right-1 hidden h-5 w-5 items-center justify-center rounded-md text-fg-muted opacity-0 transition-opacity hover:bg-card hover:text-accent group-hover:opacity-100 md:flex">
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Desktop: readable lines */}
                      <div className="mt-1 hidden space-y-0.5 md:block">
                        {entries.slice(0, embedded ? 2 : 3).map((en) => (
                          <div key={en.key}
                            className={cn('flex items-center gap-1 truncate rounded px-1 py-px text-[10px] font-medium leading-4',
                              en.done ? 'text-fg-muted line-through' : en.danger ? 'text-danger' : 'text-fg-2')}
                            style={en.kind === 'event' ? { backgroundColor: `color-mix(in srgb, ${en.color} 16%, transparent)` } : undefined}>
                            {en.kind === 'event'
                              ? <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: en.color }} />
                              : <en.icon size={9} className="shrink-0" style={{ color: en.color }} />}
                            {en.time && <span className="shrink-0 tabular-nums text-fg-muted">{en.time}</span>}
                            <span className="truncate">{en.title}</span>
                          </div>
                        ))}
                        {entries.length > (embedded ? 2 : 3) && <p className="px-1 text-[10px] font-semibold text-fg-muted">+{entries.length - (embedded ? 2 : 3)} mais</p>}
                      </div>

                      {/* Mobile: dots */}
                      {entries.length > 0 && (
                        <div className="mt-auto flex flex-wrap justify-center gap-0.5 md:hidden">
                          {entries.slice(0, 4).map((en) => <span key={en.key} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: en.color }} />)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-1 text-[11px] text-fg-muted">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Evento (cor escolhida)</span>
              <span className="flex items-center gap-1.5"><Receipt size={11} className="text-warning" /> Conta fixa</span>
              <span className="flex items-center gap-1.5"><span className="font-semibold text-accent">+R$</span>/<span className="font-semibold text-danger">−R$</span> saldo do dia</span>
              {dcaosAccess && (
                <>
                  <span className="flex items-center gap-1.5"><ListChecks size={11} className="text-accent" /> Tarefa</span>
                  <span className="flex items-center gap-1.5"><Repeat size={11} className="text-info" /> Hábitos</span>
                  <span className="flex items-center gap-1.5"><Cake size={11} className="text-warning" /> Data importante</span>
                  <span className="flex items-center gap-1.5"><Wrench size={11} className="text-danger" /> Manutenção</span>
                </>
              )}
              <span className="text-fg-disabled">· clique duplo num dia cria um evento</span>
            </div>
          </section>

          {/* ═══════ Day + upcoming ═══════ */}
          <aside className="min-w-0 space-y-4">
            <section className="rounded-2xl border border-border bg-card">
              <div className="flex items-start justify-between gap-3 border-b border-border p-4">
                <div className="min-w-0">
                  <p className={cn('flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em]', isToday ? 'text-accent' : 'text-fg-muted')}>
                    {isToday && <Sun size={11} />} {isToday ? 'Hoje' : selectedIso < todayIso ? 'Passou' : 'Dia selecionado'}
                  </p>
                  <p className="mt-0.5 text-lg font-semibold leading-tight text-fg">{longDate(selectedIso)}</p>
                </div>
                <button onClick={() => openCreate(selectedIso)} className="btn btn-secondary h-8 shrink-0 rounded-full px-3 text-xs"><Plus size={13} /> Marcar</button>
              </div>

              <div className={cn('space-y-4 overflow-y-auto p-4', embedded ? 'max-h-[340px]' : 'max-h-[62vh]')}>
                {dayContent}
              </div>
            </section>

            {/* Upcoming */}
            <section className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-fg">Próximos dias</p>
                <span className="text-[11px] text-fg-muted">{upcomingCount} pendência{upcomingCount === 1 ? '' : 's'} em 7 dias</span>
              </div>
              <ul className="space-y-1">
                {upcoming.map(({ iso, entries }, idx) => {
                  const open = entries.filter((e) => !e.done);
                  return (
                    <li key={iso}>
                      <button onClick={() => { const d = new Date(`${iso}T00:00:00`); setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1)); setSelectedIso(iso); }}
                        className={cn('flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-hover', selectedIso === iso && 'bg-primary-soft')}>
                        <span className="flex w-11 shrink-0 flex-col items-center rounded-lg border border-border bg-surface-2 py-1">
                          <span className="text-[9px] font-semibold uppercase text-fg-muted">{idx === 0 ? 'amanhã' : WEEKDAYS[new Date(`${iso}T00:00:00`).getDay()]}</span>
                          <span className="text-sm font-semibold tabular-nums text-fg">{Number(iso.slice(8))}</span>
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          {open.length === 0 ? (
                            <p className="pt-1.5 text-xs text-fg-disabled">Livre</p>
                          ) : (
                            <ul className="space-y-0.5">
                              {open.slice(0, 3).map((en) => (
                                <li key={en.key} className={cn('flex items-center gap-1.5 truncate text-xs', en.danger ? 'text-danger' : 'text-fg-2')}>
                                  <en.icon size={11} className="shrink-0" style={{ color: en.color }} />
                                  {en.time && <span className="shrink-0 tabular-nums text-fg-muted">{en.time}</span>}
                                  <span className="truncate">{en.title}</span>
                                </li>
                              ))}
                              {open.length > 3 && <li className="text-[10px] font-semibold text-fg-muted">+{open.length - 3} mais</li>}
                            </ul>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 border-t border-border pt-2 text-center text-[11px] text-fg-muted">{shortDay(addDaysIso(todayIso, 1))} até {shortDay(addDaysIso(todayIso, 7))}</p>
            </section>
          </aside>
        </div>
      </div>

      {eventModal}
    </>
  );
}
