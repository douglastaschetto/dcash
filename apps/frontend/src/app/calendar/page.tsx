'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppLayout } from '@/components/app-layout';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import api from '@/services/api';
import { ColorPicker } from '@/lib/color-picker';
import { cn } from '@/lib/utils';
import {
  ChevronLeft, ChevronRight, Plus, X, Loader2,
  TrendingUp, TrendingDown, Repeat, Calendar,
  Stethoscope, Users, Bell, Receipt,
  CheckCircle2,
  Trash2, Edit3,
} from 'lucide-react';

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
};
type FixedBill = {
  id: string; fixedBillId: string; title: string; value: number;
  dayOfMonth: number; isPaid: boolean; type: 'transaction' | 'aggregation' | 'card';
};
type DayData = {
  transactions: Transaction[];
  events: CalendarEvent[];
  fixedBills: FixedBill[];
};

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
  { id: 'REMINDER',   label: 'Lembrete', icon: Bell },
];
const TYPE_META = {
  INCOME:     { label: 'Receita',      dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  EXPENSE:    { label: 'Despesa',      dot: 'bg-red-500',     text: 'text-red-500' },
  INVESTMENT: { label: 'Investimento', dot: 'bg-blue-500',    text: 'text-blue-500' },
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const isoDate = (d: Date) => d.toISOString().split('T')[0];
const localDay = (iso: string) => new Date(iso.includes('T') ? iso : iso + 'T00:00:00').getDate();

/* ── Tooltip ─────────────────────────────────────────────────────── */
function DayTooltip({ data, day }: { data: DayData; day: number }) {
  const income  = data.transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
  const expense = data.transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
  const bills   = data.fixedBills.length;
  const events  = data.events.length;
  const hasAny  = income > 0 || expense > 0 || bills > 0 || events > 0;
  if (!hasAny) return null;

  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 pointer-events-none">
      <div className="bg-zinc-900 dark:bg-zinc-800 text-white rounded-2xl p-3 shadow-2xl text-[10px] space-y-1.5">
        {income > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-emerald-400 font-bold">Receitas</span>
            <span className="font-black">{fmt(income)}</span>
          </div>
        )}
        {expense > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-red-400 font-bold">Despesas</span>
            <span className="font-black">{fmt(expense)}</span>
          </div>
        )}
        {bills > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-orange-400 font-bold">Contas Fixas</span>
            <span className="font-black">{bills}</span>
          </div>
        )}
        {events > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-purple-400 font-bold">Eventos</span>
            <span className="font-black">{events}</span>
          </div>
        )}
        {data.fixedBills.slice(0, 3).map(b => (
          <div key={b.id} className="flex justify-between items-center border-t border-white/10 pt-1.5 mt-1">
            <span className="text-zinc-300 truncate max-w-[100px]">{b.title}</span>
            <span className="text-orange-300 font-black shrink-0 ml-1">{fmt(b.value)}</span>
          </div>
        ))}
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-900 dark:border-t-zinc-800" />
      </div>
    </div>
  );
}

/* ── Component ─────────────────────────────────────────────────── */
export default function CalendarPage() {
  useAuth();
  const searchParams = useSearchParams();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthData, setMonthData] = useState<{ events: CalendarEvent[]; transactions: Transaction[] } | null>(null);
  const [fixedBills, setFixedBills] = useState<FixedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [syncToGoogle, setSyncToGoogle] = useState(true);
  const [whatsappAlertHour, setWhatsappAlertHour] = useState(8);

  /* ── Event form modal ──────────────────────────────────────────── */
  const [modal, setModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', startDate: '',
    startTime: '09:00', endTime: '10:00',
    eventType: 'EVENT', color: '#10b981',
    allDay: false, notifyWhatsapp: false,
  });
  const f = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  /* ── Load data ─────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [calRes, billsRes] = await Promise.allSettled([
        api.get('/calendar-events/monthly', { params: { month, year } }),
        api.get('/fixed-bills', { params: { month, year } }),
      ]);
      if (calRes.status === 'fulfilled') setMonthData(calRes.value.data);
      if (billsRes.status === 'fulfilled') setFixedBills(billsRes.value.data ?? []);
    } finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (searchParams.get('google') !== 'connected') {
      api.get('/notifications/google/status')
        .then(({ data }) => setGoogleConnected(data.connected))
        .catch(() => {});
    } else {
      setGoogleConnected(true);
    }
    // Sync preference and alert hour now live in the user's profile, not on this page.
    api.get('/auth/me')
      .then(({ data }) => {
        setSyncToGoogle(data?.googleCalendarSync ?? true);
        setWhatsappAlertHour(data?.whatsappAlertHour ?? 8);
      })
      .catch(() => {});
  }, [searchParams]);

  /* ── Build day map ─────────────────────────────────────────────── */
  const dayMap = useMemo<Record<number, DayData>>(() => {
    const map: Record<number, DayData> = {};
    const ensure = (d: number) => { if (!map[d]) map[d] = { transactions: [], events: [], fixedBills: [] }; };

    monthData?.transactions.forEach((t) => {
      const d = localDay(t.date); ensure(d);
      map[d].transactions.push(t);
    });
    monthData?.events.forEach((e) => {
      const d = localDay(e.startDate); ensure(d);
      map[d].events.push(e);
    });
    fixedBills.forEach((b) => {
      if (b.dayOfMonth) { ensure(b.dayOfMonth); map[b.dayOfMonth].fixedBills.push(b); }
    });
    return map;
  }, [monthData, fixedBills]);

  /* ── Monthly summary ───────────────────────────────────────────── */
  const summary = useMemo(() => {
    const txs = monthData?.transactions ?? [];
    return {
      income:     txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0),
      expense:    txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0),
      investment: txs.filter(t => t.type === 'INVESTMENT').reduce((s, t) => s + Number(t.amount), 0),
      fixedTotal: fixedBills.reduce((s, b) => s + Number(b.value), 0),
      events:     monthData?.events.length ?? 0,
    };
  }, [monthData, fixedBills]);

  /* ── Calendar grid ─────────────────────────────────────────────── */
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth  = new Date(year, month, 0).getDate();
  const today        = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = i - firstWeekday + 1;
    return (d >= 1 && d <= daysInMonth) ? d : null;
  });

  /* ── Open modal ────────────────────────────────────────────────── */
  const openCreate = (day?: number) => {
    const date = day ? isoDate(new Date(year, month - 1, day)) : isoDate(new Date());
    setEditingEvent(null);
    setForm({ title: '', description: '', startDate: date, startTime: '09:00', endTime: '10:00', eventType: 'EVENT', color: '#10b981', allDay: false, notifyWhatsapp: false });
    setModal(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    const d = new Date(ev.startDate);
    setEditingEvent(ev);
    setForm({
      title: ev.title, description: ev.description ?? '',
      startDate: isoDate(d), startTime: d.toTimeString().slice(0, 5),
      endTime: ev.endDate ? new Date(ev.endDate).toTimeString().slice(0, 5) : '10:00',
      eventType: ev.eventType, color: ev.color, allDay: ev.allDay, notifyWhatsapp: ev.notifyWhatsapp,
    });
    setModal(true);
  };

  /* ── Save event ────────────────────────────────────────────────── */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const startDate = form.allDay ? `${form.startDate}T00:00:00` : `${form.startDate}T${form.startTime}:00`;
      const endDate   = form.allDay ? `${form.startDate}T23:59:59` : `${form.startDate}T${form.endTime}:00`;
      const payload = { title: form.title, description: form.description || null, startDate, endDate, eventType: form.eventType, color: form.color, allDay: form.allDay, notifyWhatsapp: form.notifyWhatsapp };

      if (editingEvent) {
        await api.patch(`/calendar-events/${editingEvent.id}`, payload);
      } else {
        await api.post('/calendar-events', payload);
        if (googleConnected && syncToGoogle) await api.post('/notifications/google/sync-event', payload);
      }
      load(); setModal(false);
    } catch { alert('Erro ao salvar evento.'); } finally { setSaving(false); }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Remover este evento?')) return;
    try { await api.delete(`/calendar-events/${id}`); load(); } catch { alert('Erro ao remover.'); }
  };

  /* ── Selected day ──────────────────────────────────────────────── */
  const dayInfo = selectedDay ? dayMap[selectedDay] : null;
  const incomeTotal     = dayInfo?.transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0) ?? 0;
  const expenseTotal    = dayInfo?.transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0) ?? 0;
  const investmentTotal = dayInfo?.transactions.filter(t => t.type === 'INVESTMENT').reduce((s, t) => s + Number(t.amount), 0) ?? 0;
  const fixedTotal      = dayInfo?.fixedBills.reduce((s, b) => s + Number(b.value), 0) ?? 0;

  const novoEventoButton = (
    <button
      onClick={() => openCreate()}
      className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 dark:hover:bg-emerald-500 dark:hover:text-white transition active:scale-95"
    >
      <Plus size={14} strokeWidth={3} /> Novo Evento
    </button>
  );

  return (
    <AppLayout title="Agenda" subtitle="Calendário financeiro e eventos" actions={novoEventoButton} noPadding>
      <div className="h-full flex flex-col overflow-hidden">

        {/* Frozen: monthly summary + month nav */}
        <div className="shrink-0 px-6 pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
            {[
              { label: 'Receitas',      value: summary.income,     color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/5', icon: TrendingUp,  iconColor: 'text-emerald-500' },
              { label: 'Despesas',      value: summary.expense,    color: 'text-red-500',     bg: 'bg-red-500/5',     icon: TrendingDown, iconColor: 'text-red-500'     },
              { label: 'Contas Fixas',  value: summary.fixedTotal, color: 'text-orange-500',  bg: 'bg-orange-500/5',  icon: Receipt,      iconColor: 'text-orange-500'  },
              { label: 'Investimentos', value: summary.investment, color: 'text-blue-500',    bg: 'bg-blue-500/5',    icon: Repeat,       iconColor: 'text-blue-500'    },
            ].map(({ label, value, color, bg, icon: Icon, iconColor }) => (
              <div key={label} className={cn('rounded-xl p-3 border border-white/50 dark:border-zinc-800', bg)}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{label}</span>
                  <Icon size={13} className={iconColor} />
                </div>
                <p className={cn('text-base font-black', color)}>{fmt(value)}</p>
              </div>
            ))}
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition active:scale-90"
            >
              <ChevronLeft size={16} />
            </button>
            <h2 className="text-lg font-black uppercase italic tracking-tighter text-zinc-900 dark:text-white">
              {MONTHS[month - 1]} <span className="text-zinc-400 font-bold not-italic text-sm">{year}</span>
            </h2>
            <button
              onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition active:scale-90"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable: calendar grid + day panel */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="flex gap-6">
          {/* ── Calendar ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-[9px] font-black uppercase tracking-widest text-zinc-400 py-1.5">{d}</div>
              ))}
            </div>

            {/* Day grid */}
            {loading ? (
              <div className="h-72 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-zinc-300" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const data = dayMap[day];
                  const isToday    = isCurrentMonth && today.getDate() === day;
                  const isSelected = selectedDay === day;
                  const isHovered  = hoveredDay === day;
                  const hasIncome  = data?.transactions.some(t => t.type === 'INCOME');
                  const hasExpense = data?.transactions.some(t => t.type === 'EXPENSE');
                  const hasInvest  = data?.transactions.some(t => t.type === 'INVESTMENT');
                  const hasBills   = (data?.fixedBills.length ?? 0) > 0;
                  const hasEvents  = (data?.events.length ?? 0) > 0;
                  const hasData    = hasIncome || hasExpense || hasInvest || hasBills || hasEvents;

                  return (
                    <div key={i} className="relative group">
                      {/* Hover tooltip */}
                      {isHovered && data && hasData && (
                        <DayTooltip data={data} day={day} />
                      )}

                      <button
                        onClick={() => setSelectedDay(isSelected ? null : day)}
                        onMouseEnter={() => setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={cn(
                          'relative w-full min-h-[60px] p-1.5 rounded-xl text-left transition-all border',
                          isSelected
                            ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-black shadow-lg'
                            : isToday
                              ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                              : 'bg-white dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-white hover:border-zinc-300 dark:hover:border-zinc-600',
                        )}
                      >
                        <span className={cn('text-sm font-black leading-none', isToday && !isSelected && 'text-emerald-600 dark:text-emerald-400')}>
                          {day}
                        </span>

                        {/* Dots row */}
                        {(hasIncome || hasExpense || hasInvest || hasBills) && (
                          <div className="flex gap-0.5 mt-1.5 flex-wrap">
                            {hasIncome  && <span className={cn('w-1.5 h-1.5 rounded-full bg-emerald-500', isSelected && 'bg-emerald-300')} />}
                            {hasExpense && <span className={cn('w-1.5 h-1.5 rounded-full bg-red-500',     isSelected && 'bg-red-300')} />}
                            {hasInvest  && <span className={cn('w-1.5 h-1.5 rounded-full bg-blue-500',   isSelected && 'bg-blue-300')} />}
                            {hasBills   && <span className={cn('w-1.5 h-1.5 rounded-full bg-orange-500', isSelected && 'bg-orange-300')} />}
                          </div>
                        )}

                        {/* Event pills */}
                        {hasEvents && (
                          <div className="mt-1 space-y-0.5">
                            {data!.events.slice(0, 1).map(ev => (
                              <div key={ev.id} className="rounded-md px-1 py-0.5 text-[8px] font-black truncate text-white leading-none" style={{ backgroundColor: ev.color }}>
                                {ev.title}
                              </div>
                            ))}
                            {data!.events.length > 1 && (
                              <div className="text-[8px] font-black text-zinc-400 leading-none ml-0.5">+{data!.events.length - 1}</div>
                            )}
                          </div>
                        )}
                      </button>

                      {/* Add event button */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); openCreate(day); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); openCreate(day); } }}
                        className="absolute top-1 right-1 p-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-zinc-400 hover:text-emerald-500"
                        title="Adicionar evento"
                      >
                        <Plus size={12} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-5 px-1 flex-wrap">
              {[
                { dot: 'bg-emerald-500', label: 'Receita' },
                { dot: 'bg-red-500',     label: 'Despesa' },
                { dot: 'bg-blue-500',    label: 'Investimento' },
                { dot: 'bg-orange-500',  label: 'Conta Fixa' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className={cn('w-2 h-2 rounded-full', l.dot)} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Day detail panel ─────────────────────────────────── */}
          {selectedDay && (
            <div className="w-72 shrink-0">
              <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden sticky top-0">
                {/* Header */}
                <div className="px-5 pt-5 pb-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{MONTHS[month - 1].slice(0, 3)} {year}</p>
                    <p className="text-3xl font-black italic text-zinc-900 dark:text-white leading-none">{selectedDay}</p>
                  </div>
                  <button onClick={() => openCreate(selectedDay)} className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-500 hover:text-white transition">
                    <Plus size={15} />
                  </button>
                </div>

                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                  {/* Summary chips */}
                  {(incomeTotal > 0 || expenseTotal > 0 || investmentTotal > 0 || fixedTotal > 0) && (
                    <div className="space-y-2">
                      {incomeTotal > 0 && (
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/5">
                          <div className="flex items-center gap-2"><TrendingUp size={14} className="text-emerald-500" /><span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Receitas</span></div>
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{fmt(incomeTotal)}</span>
                        </div>
                      )}
                      {expenseTotal > 0 && (
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-red-500/5">
                          <div className="flex items-center gap-2"><TrendingDown size={14} className="text-red-500" /><span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Despesas</span></div>
                          <span className="text-sm font-black text-red-500">{fmt(expenseTotal)}</span>
                        </div>
                      )}
                      {investmentTotal > 0 && (
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-500/5">
                          <div className="flex items-center gap-2"><Repeat size={14} className="text-blue-500" /><span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Invest.</span></div>
                          <span className="text-sm font-black text-blue-500">{fmt(investmentTotal)}</span>
                        </div>
                      )}
                      {fixedTotal > 0 && (
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-orange-500/5">
                          <div className="flex items-center gap-2"><Receipt size={14} className="text-orange-500" /><span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Contas Fixas</span></div>
                          <span className="text-sm font-black text-orange-500">{fmt(fixedTotal)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fixed bills */}
                  {dayInfo?.fixedBills && dayInfo.fixedBills.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1">Contas Fixas</p>
                      {dayInfo.fixedBills.map(b => (
                        <div key={b.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-orange-500/5 border border-orange-500/10">
                          <div className="flex items-center gap-2 min-w-0">
                            <Receipt size={12} className="text-orange-500 shrink-0" />
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 truncate">{b.title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-xs font-black text-orange-500">{fmt(b.value)}</span>
                            {b.isPaid
                              ? <CheckCircle2 size={12} className="text-emerald-500" />
                              : <span className="w-2 h-2 rounded-full bg-orange-400" />
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Transactions */}
                  {dayInfo?.transactions && dayInfo.transactions.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1">Transações</p>
                      {dayInfo.transactions.map(t => (
                        <div key={t.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn('w-2 h-2 rounded-full shrink-0', TYPE_META[t.type]?.dot ?? 'bg-zinc-400')} />
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 truncate">{t.description}</span>
                          </div>
                          <span className={cn('text-xs font-black shrink-0 ml-2', TYPE_META[t.type]?.text ?? 'text-zinc-500')}>
                            {t.type === 'EXPENSE' ? '-' : '+'}{fmt(Number(t.amount))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Events */}
                  {dayInfo?.events && dayInfo.events.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1">Eventos</p>
                      {dayInfo.events.map(ev => {
                        const TypeIcon = EVENT_TYPES.find(t => t.id === ev.eventType)?.icon ?? Calendar;
                        const time = ev.allDay ? 'Dia todo' : new Date(ev.startDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        return (
                          <div key={ev.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border" style={{ borderColor: `${ev.color}40`, backgroundColor: `${ev.color}08` }}>
                            <TypeIcon size={14} style={{ color: ev.color }} className="mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-zinc-900 dark:text-white leading-none truncate">{ev.title}</p>
                              <p className="text-[9px] text-zinc-400 mt-0.5">{time}</p>
                              {ev.description && <p className="text-[9px] text-zinc-500 mt-0.5 line-clamp-1">{ev.description}</p>}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => openEdit(ev)} className="p-1 text-zinc-400 hover:text-zinc-600 transition"><Edit3 size={12} /></button>
                              <button onClick={() => handleDeleteEvent(ev.id)} className="p-1 text-zinc-400 hover:text-red-500 transition"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!dayInfo && (
                    <div className="py-8 text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Nenhum lançamento</p>
                      <button onClick={() => openCreate(selectedDay)} className="mt-3 text-[9px] font-black uppercase tracking-widest text-emerald-500 hover:underline">
                        Criar evento →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* ── Event modal ───────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setModal(false)}>
          <div className="w-full max-w-lg rounded-[2.5rem] bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-8 pt-8 pb-5 flex items-center justify-between border-b-2 shrink-0" style={{ borderColor: `${form.color}25` }}>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl" style={{ backgroundColor: `${form.color}15` }}>
                  <Calendar size={20} style={{ color: form.color }} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.35em]">{editingEvent ? 'Editar Evento' : 'Novo Evento'}</p>
                  <h2 className="text-xl font-black uppercase italic tracking-tighter text-zinc-900 dark:text-white leading-none mt-0.5">Agenda</h2>
                </div>
              </div>
              <button onClick={() => setModal(false)} className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-8 space-y-5">
              {/* Type selector */}
              <div className="grid grid-cols-4 gap-2">
                {EVENT_TYPES.map(t => (
                  <button key={t.id} type="button" onClick={() => f('eventType', t.id)}
                    className={cn('py-3 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all text-[9px] font-black uppercase', form.eventType === t.id ? '' : 'border-zinc-100 dark:border-zinc-900 text-zinc-500 hover:border-zinc-300')}
                    style={form.eventType === t.id ? { borderColor: form.color, color: form.color, backgroundColor: `${form.color}08` } : {}}
                  >
                    <t.icon size={16} />
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Título *</label>
                <input required value={form.title} onChange={e => f('title', e.target.value)} placeholder="Ex: Consulta médica, Reunião..."
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-emerald-500 transition" />
              </div>

              {/* Date & time */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Data & Hora</label>
                  <div onClick={() => f('allDay', !form.allDay)} className="flex items-center gap-2 cursor-pointer">
                    <div className={cn('relative w-9 h-5 rounded-full transition-colors shrink-0', form.allDay ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700')}>
                      <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', form.allDay ? 'translate-x-4' : 'translate-x-0.5')} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Dia todo</span>
                  </div>
                </div>
                <div className={cn('grid gap-3', form.allDay ? 'grid-cols-1' : 'grid-cols-3')}>
                  <input type="date" required value={form.startDate} onChange={e => f('startDate', e.target.value)}
                    className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-emerald-500 transition" />
                  {!form.allDay && (
                    <>
                      <input type="time" value={form.startTime} onChange={e => f('startTime', e.target.value)}
                        className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-4 text-sm font-bold focus:outline-none focus:border-emerald-500 transition" />
                      <input type="time" value={form.endTime} onChange={e => f('endTime', e.target.value)}
                        className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-4 text-sm font-bold focus:outline-none focus:border-emerald-500 transition" />
                    </>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Descrição</label>
                <textarea value={form.description} onChange={e => f('description', e.target.value)} placeholder="Detalhes opcionais..." rows={2}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-emerald-500 transition resize-none" />
              </div>

              {/* Color */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Cor</label>
                <ColorPicker selected={form.color} onSelect={c => f('color', c)} />
              </div>

              {/* Notifications */}
              <div className="space-y-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Notificações</p>
                <div onClick={() => f('notifyWhatsapp', !form.notifyWhatsapp)} className="flex items-center gap-3 cursor-pointer">
                  <div className={cn('relative w-9 h-5 rounded-full transition-colors shrink-0', form.notifyWhatsapp ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700')}>
                    <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', form.notifyWhatsapp ? 'translate-x-4' : 'translate-x-0.5')} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Alerta WhatsApp</p>
                    <p className="text-[9px] text-zinc-400">Lembrete às {String(whatsappAlertHour).padStart(2, '0')}h do dia anterior</p>
                  </div>
                </div>
                {googleConnected && syncToGoogle && (
                  <p className="text-[9px] text-zinc-400 flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                    Sincronização automática com o Google Agenda ativa (configurável no <a href="/profile" className="underline text-emerald-500">perfil</a>).
                  </p>
                )}
              </div>

              <button type="submit" disabled={saving}
                className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] text-white transition disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                style={{ backgroundColor: form.color }}
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editingEvent ? 'Salvar Evento' : 'Criar Evento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
