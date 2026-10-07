'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { AppLayout } from '@/components/app-layout';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { cn } from '@/lib/utils';
import { Modal } from '@/app/dashboard-v2/components/Modal';
import { Bell, Check, Edit3, Flame, Loader2, Pause, Play, Plus, Repeat, Trash2 } from '@/components/ui/icons';
import { DcaosGate } from '../components/DcaosGate';
import { WEEKDAYS_SHORT, addDaysISO, apiError, firstName, todayISO, useMe, type Habit, type Home } from '../lib/dcaos';

const NEW_HABIT_EVENT = 'dcaos:new-habit';
const ICONS = ['✅', '💧', '💊', '🏃', '🚶', '📚', '🧘', '🦷', '😴', '📵', '🥗', '💰', '✍️', '🎸', '🎯'];
const ALL = [0, 1, 2, 3, 4, 5, 6];
/* Personal habits only — household chores belong to "Quem Vai Fazer?" */
const CLASSICS: { title: string; icon: string; days: number[] }[] = [
  { title: 'Beber 2L de água', icon: '💧', days: ALL },
  { title: 'Tomar o remédio', icon: '💊', days: ALL },
  { title: 'Fazer exercício', icon: '🏃', days: [1, 3, 5] },
  { title: 'Ler 10 páginas', icon: '📚', days: ALL },
  { title: 'Meditar 10 minutos', icon: '🧘', days: ALL },
  { title: 'Passar fio dental', icon: '🦷', days: ALL },
  { title: 'Dormir antes das 23h', icon: '😴', days: [0, 1, 2, 3, 4] },
  { title: 'Sem celular na cama', icon: '📵', days: ALL },
  { title: 'Comer uma fruta', icon: '🥗', days: ALL },
  { title: 'Anotar os gastos do dia', icon: '💰', days: ALL },
];

type Period = 'today' | 'week' | 'all';

function scheduleLabel(days: number[]) {
  const s = [...days].sort().join(',');
  if (s === '0,1,2,3,4,5,6') return 'Diário';
  if (s === '1,2,3,4,5') return 'Dias úteis';
  if (s === '0,6') return 'Fins de semana';
  return [...days].sort().map((d) => WEEKDAYS_SHORT[d]).join('/');
}

type Form = { id?: string; title: string; icon: string; daysOfWeek: number[]; reminderTime: string; assigneeId: string; active: boolean };
const EMPTY: Form = { title: '', icon: '✅', daysOfWeek: ALL, reminderTime: '', assigneeId: '', active: true };

const pill = (on: boolean) => cn(
  'h-7 shrink-0 rounded-full px-3 text-xs font-medium transition-colors',
  on ? 'bg-fg text-background' : 'text-fg-2 hover:bg-hover hover:text-fg',
);

function HabitsContent() {
  const params = useSearchParams();
  const me = useMe();
  const today = todayISO();
  const { data: habits = [], mutate, isLoading } = useSWR<Habit[]>('/dcaos/habits');
  const { data: home } = useSWR<Home>('/dcaos/home');
  const members = home?.members ?? [];
  const [busy, setBusy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [period, setPeriod] = useState<Period>('today');
  const [who, setWho] = useState<string>('all');
  const [form, setForm] = useState<Form | null>(() => (params.get('novo') === '1' ? { ...EMPTY } : null));

  const meRef = useRef(me.id);
  useEffect(() => { meRef.current = me.id; }, [me.id]);

  // Header "+" lives in AppLayout (outside this component)
  useEffect(() => {
    const open = () => setForm({ ...EMPTY, assigneeId: meRef.current });
    window.addEventListener(NEW_HABIT_EVENT, open);
    return () => window.removeEventListener(NEW_HABIT_EVENT, open);
  }, []);

  const week = Array.from({ length: 7 }, (_, i) => addDaysISO(today, i - 6));
  const byPerson = habits.filter((h) => who === 'all' || (who === 'family' ? !h.assigneeId : h.assigneeId === who));
  const scoped = period === 'all' ? byPerson : byPerson.filter((h) => h.active && (period === 'week' || h.scheduledToday));
  const pending = scoped.filter((h) => h.active && h.scheduledToday && !h.doneToday);
  const done = scoped.filter((h) => h.active && h.scheduledToday && h.doneToday);
  const others = scoped.filter((h) => !h.active || !h.scheduledToday);

  const todays = habits.filter((h) => h.active && h.scheduledToday);
  const doneToday = todays.filter((h) => h.doneToday).length;
  const best = Math.max(0, ...habits.map((h) => h.streak));
  const suggestions = CLASSICS.filter((c) => !habits.some((h) => h.title.toLowerCase() === c.title.toLowerCase()));

  const toggle = async (h: Habit, date = today) => {
    const isDone = h.checks.includes(date);
    setBusy(`${h.id}:${date}`);
    try {
      await api.post(`/dcaos/habits/${h.id}/${isDone ? 'uncheck' : 'check'}`, { date });
      await mutate();
    } catch (err) {
      alert(apiError(err, 'Não foi possível marcar.'));
    } finally {
      setBusy(null);
    }
  };

  const quickCreate = async (c: (typeof CLASSICS)[number]) => {
    setBusy(`new:${c.title}`);
    try {
      await api.post('/dcaos/habits', { title: c.title, icon: c.icon, daysOfWeek: c.days, assigneeId: me.id || null });
      await mutate();
    } catch (err) {
      alert(apiError(err, 'Não foi possível criar o hábito.'));
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!form || form.title.trim().length < 2 || form.daysOfWeek.length === 0) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(), icon: form.icon, daysOfWeek: form.daysOfWeek,
      reminderTime: form.reminderTime || null, assigneeId: form.assigneeId || null,
      ...(form.id ? { active: form.active } : {}),
    };
    try {
      if (form.id) await api.patch(`/dcaos/habits/${form.id}`, payload);
      else await api.post('/dcaos/habits', payload);
      setForm(null);
      mutate();
    } catch (err) {
      alert(apiError(err, 'Não foi possível salvar o hábito.'));
    } finally {
      setSaving(false);
    }
  };

  const whoLabel = (h: Habit) => (h.assigneeId ? (h.assigneeId === me.id ? 'Você' : firstName(h.assigneeName)) : 'Família');

  const row = (h: Habit) => {
    const key = `${h.id}:${today}`;
    const canCheck = h.active && h.scheduledToday;
    return (
      <li key={h.id} className={cn('group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-hover', !h.active && 'opacity-50')}>
        <button
          onClick={() => canCheck && toggle(h)}
          disabled={!canCheck || busy === key}
          aria-label={h.doneToday ? 'Desmarcar hoje' : 'Marcar como feito hoje'}
          className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors',
            h.doneToday ? 'border-primary bg-primary text-on-primary'
              : canCheck ? 'border-border-hover text-fg-muted hover:border-primary hover:text-accent' : 'border-border text-fg-disabled')}
        >
          {busy === key ? <Loader2 size={15} className="animate-spin" /> : <Check size={16} strokeWidth={2.5} />}
        </button>

        <span className="text-lg leading-none">{h.icon ?? '✅'}</span>

        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-[14px] font-medium', h.doneToday ? 'text-fg-muted line-through' : 'text-fg')}>{h.title}</p>
          <p className="truncate text-[11px] text-fg-muted">
            {scheduleLabel(h.daysOfWeek)} · {whoLabel(h)}
            {h.reminderTime && <> · <Bell size={9} className="inline" /> {h.reminderTime}</>}
            {!h.active ? ' · pausado' : !h.scheduledToday ? ' · folga hoje' : h.doneToday && h.doneTodayBy ? ` · feito por ${firstName(h.doneTodayBy)}` : ''}
          </p>
        </div>

        {period !== 'today' && (
          <div className="hidden items-center gap-1 md:flex">
            {week.map((d) => {
              const scheduled = h.daysOfWeek.includes(new Date(`${d}T00:00:00`).getDay());
              const isDone = h.checks.includes(d);
              return (
                <button key={d} onClick={() => h.active && toggle(h, d)} disabled={!h.active || busy === `${h.id}:${d}`}
                  title={new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })}
                  className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold transition-colors',
                    isDone ? 'bg-primary text-on-primary' : scheduled ? (d < today ? 'bg-danger-soft text-danger' : 'bg-track text-fg-muted') : 'text-fg-disabled',
                    d === today && !isDone && 'ring-1 ring-primary-border')}>
                  {WEEKDAYS_SHORT[new Date(`${d}T00:00:00`).getDay()].charAt(0)}
                </button>
              );
            })}
          </div>
        )}

        <span className={cn('flex w-12 shrink-0 items-center justify-end gap-0.5 text-[13px] font-semibold tabular-nums', h.streak > 0 ? 'text-warning' : 'text-fg-disabled')}>
          <Flame size={13} /> {h.streak}
        </span>

        <div className="flex shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
          <button onClick={() => setForm({ id: h.id, title: h.title, icon: h.icon ?? '✅', daysOfWeek: h.daysOfWeek, reminderTime: h.reminderTime ?? '', assigneeId: h.assigneeId ?? '', active: h.active })}
            aria-label="Editar" className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-card hover:text-accent"><Edit3 size={13} /></button>
          <button onClick={async () => { await api.patch(`/dcaos/habits/${h.id}`, { active: !h.active }); mutate(); }}
            aria-label={h.active ? 'Pausar' : 'Retomar'} className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-card hover:text-fg">{h.active ? <Pause size={13} /> : <Play size={13} />}</button>
          <button onClick={async () => { if (!confirm(`Excluir "${h.title}" e todo o histórico?`)) return; await api.delete(`/dcaos/habits/${h.id}`); mutate(); }}
            aria-label="Excluir" className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-danger-soft hover:text-danger"><Trash2 size={13} /></button>
        </div>
      </li>
    );
  };

  const section = (title: string, list: Habit[], emptyTitle?: string, emptyText?: string) => (
    <section className="space-y-2">
      <h2 className="flex items-baseline gap-2 text-base font-semibold text-fg">
        {title} <span className="text-sm font-normal tabular-nums text-fg-muted">{list.length}</span>
      </h2>
      {list.length === 0 ? (
        emptyTitle ? (
          <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center">
            <p className="text-sm font-semibold text-fg">{emptyTitle}</p>
            <p className="mt-0.5 text-xs text-fg-muted">{emptyText}</p>
          </div>
        ) : null
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">{list.map(row)}</ul>
      )}
    </section>
  );

  if (isLoading) {
    return <div className="flex justify-center py-24"><Loader2 size={24} className="animate-spin text-accent" /></div>;
  }

  return (
    <div data-tour="dcaos-habits-page" className="w-full p-4 md:p-6 space-y-6">
      {/* Empty state / summary */}
      {habits.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-card ring-1 ring-border">
            <Repeat size={24} className="text-accent" />
          </span>
          <p className="mt-4 text-base font-semibold text-fg">Crie o 1º hábito</p>
          <p className="mt-1 max-w-sm text-sm text-fg-2">
            Hábito é pessoal: saúde, estudo, bem-estar — beber água, ler, se exercitar. O sistema lembra; você faz.
          </p>
          <button onClick={() => setForm({ ...EMPTY, assigneeId: me.id })} className="btn btn-secondary mt-5 rounded-full px-4">
            <Plus size={14} /> Criar hábito
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-fg-muted">Hoje</p>
            <p className="text-2xl font-semibold tracking-tight text-fg">
              {todays.length === 0 ? 'Folga geral hoje.' : doneToday === todays.length ? 'Tudo feito. Quem diria.' : `${doneToday} de ${todays.length} feitos`}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-fg-muted">
            <span className="flex items-center gap-1"><Flame size={13} className="text-warning" /> maior sequência <strong className="tabular-nums text-fg">{best}</strong></span>
            {todays.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-32 overflow-hidden rounded-full bg-track">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(doneToday / todays.length) * 100}%` }} />
                </div>
                <span className="tabular-nums">{Math.round((doneToday / todays.length) * 100)}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Classics */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-fg-muted">{habits.length === 0 ? 'Comece com os clássicos:' : 'Mais ideias:'}</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((c) => (
              <button key={c.title} onClick={() => quickCreate(c)} disabled={!!busy}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-card px-3 text-xs font-medium text-fg-2 ring-1 ring-border transition-colors hover:text-fg hover:ring-primary-border disabled:opacity-60">
                {busy === `new:${c.title}` ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                {c.icon} {c.title} <span className="text-fg-muted">· {scheduleLabel(c.days)}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-fg-muted">
            Afazer da casa — lixo, louça, roupa, plantas, pet?{' '}
            <Link href="/dcaos/tarefas" className="font-medium text-accent underline underline-offset-2">Isso é tarefa →</Link>
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1">
        {([['today', 'Hoje'], ['week', 'Semana'], ['all', 'Tudo']] as [Period, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setPeriod(k)} className={pill(period === k)}>{l}</button>
        ))}
        <span className="mx-2 h-5 w-px bg-border" />
        {[{ id: 'all', label: 'Todos' }, { id: 'family', label: 'Família' }, ...members.map((m) => ({ id: m.id, label: m.id === me.id ? 'Eu' : firstName(m.name) }))].map((p) => (
          <button key={p.id} onClick={() => setWho(p.id)} className={pill(who === p.id)}>{p.label}</button>
        ))}
      </div>

      {/* Lists */}
      {section('Pendentes', pending, 'Tudo em dia ✓', habits.length ? 'Nada pendente pra esse filtro.' : 'Crie um hábito para começar.')}
      {done.length > 0 && section('Feitos hoje', done)}
      {period !== 'today' && others.length > 0 && section(period === 'all' ? 'Folga hoje e pausados' : 'Folga hoje', others)}

      {form && (
        <Modal title={form.id ? 'Editar hábito' : 'Novo hábito'} onClose={() => setForm(null)}>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex h-10 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-xl">{form.icon}</div>
              <input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Beber 2L de água" className="field" />
            </div>
            <div className="flex flex-wrap gap-1">
              {ICONS.map((ic) => (
                <button key={ic} type="button" onClick={() => setForm({ ...form, icon: ic })}
                  className={cn('h-8 w-8 rounded-md border text-base', form.icon === ic ? 'border-primary bg-primary-soft' : 'border-transparent hover:bg-hover')}>{ic}</button>
              ))}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg-2">Quando?</label>
              <div className="mb-2 flex gap-1.5">
                {([['Todo dia', ALL], ['Dias úteis', [1, 2, 3, 4, 5]], ['Fim de semana', [0, 6]]] as [string, number[]][]).map(([l, d]) => (
                  <button key={l} type="button" onClick={() => setForm({ ...form, daysOfWeek: d })}
                    className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-fg-2 hover:bg-hover">{l}</button>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS_SHORT.map((w, i) => {
                  const on = form.daysOfWeek.includes(i);
                  return (
                    <button key={w} type="button"
                      onClick={() => setForm({ ...form, daysOfWeek: on ? form.daysOfWeek.filter((x) => x !== i) : [...form.daysOfWeek, i] })}
                      className={cn('h-8 rounded-md border text-[11px] font-medium', on ? 'border-primary bg-primary-soft text-accent' : 'border-border text-fg-2 hover:bg-hover')}>{w}</button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-fg-2">De quem?</label>
                <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} className="field">
                  {members.map((m) => <option key={m.id} value={m.id}>{m.id === me.id ? 'Eu' : firstName(m.name)}</option>)}
                  <option value="">Família toda (desafio coletivo)</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-fg-2">Lembrete</label>
                <input type="time" value={form.reminderTime} onChange={(e) => setForm({ ...form, reminderTime: e.target.value })} className="field" />
              </div>
            </div>
            <p className="text-[11px] text-fg-muted">O lembrete chega na hora cheia escolhida (horário de Brasília), só se ainda não foi feito.</p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setForm(null)} className="btn btn-secondary flex-1">Cancelar</button>
              <button onClick={save} disabled={saving || form.title.trim().length < 2 || form.daysOfWeek.length === 0} className="btn btn-primary flex-1">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function DcaosHabitsPage() {
  useAuth();
  const newHabit = (
    <button onClick={() => window.dispatchEvent(new Event(NEW_HABIT_EVENT))} aria-label="Novo hábito" title="Novo hábito" className="icon-btn">
      <Plus className="h-4 w-4" />
    </button>
  );
  return (
    <AppLayout title="Faz Todo Dia" subtitle="Hábitos pessoais · saúde, estudo e bem-estar" actions={newHabit} noPadding>
      <div className="h-full overflow-y-auto">
        <DcaosGate>
          <Suspense fallback={null}><HabitsContent /></Suspense>
        </DcaosGate>
      </div>
    </AppLayout>
  );
}
