'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { AppLayout } from '@/components/app-layout';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { cn } from '@/lib/utils';
import { Modal } from '@/app/dashboard-v2/components/Modal';
import {
  Check, CheckCircle2, Circle, Crown, Edit3, Hand, Loader2, Plus, Repeat, RotateCcw, Search, Trash2, Trophy,
} from '@/components/ui/icons';
import { DcaosGate } from '../components/DcaosGate';
import { apiError, dueLabel, firstName, todayISO, useMe, type Home, type Scoreboard, type Task } from '../lib/dcaos';

type Filter = 'mine' | 'all' | 'unassigned' | 'done';

const AREAS = ['Cozinha', 'Banheiro', 'Sala', 'Quartos', 'Lavanderia', 'Quintal', 'Pets', 'Compras', 'Geral'];
const RECURRENCES: { value: Task['recurrence']; label: string }[] = [
  { value: 'none', label: 'Não repete' },
  { value: 'daily', label: 'Diária' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
];
const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAY_PRESETS: [string, number[]][] = [['Seg/Qua/Sex', [1, 3, 5]], ['Dias úteis', [1, 2, 3, 4, 5]], ['Fim de semana', [0, 6]]];

function recurrenceText(recurrence: Task['recurrence'], days: number[] = []) {
  if (recurrence === 'weekly' && days.length) {
    const s = [...days].sort().join(',');
    if (s === '0,1,2,3,4,5,6') return 'Todo dia';
    if (s === '1,2,3,4,5') return 'Dias úteis';
    if (s === '0,6') return 'Fins de semana';
    return [...days].sort().map((d) => WEEKDAY_SHORT[d]).join(', ');
  }
  return { none: 'Não repete', daily: 'Todo dia', weekly: 'Toda semana', biweekly: 'A cada 2 semanas', monthly: 'Todo mês' }[recurrence];
}

/* Household classics — one click creates them (habits are personal and live in Faz Todo Dia) */
const CLASSICS: { title: string; recurrence: Task['recurrence']; days?: number[]; area: string; points: number }[] = [
  { title: 'Lavar roupa', recurrence: 'weekly', days: [6], area: 'Lavanderia', points: 3 },
  { title: 'Limpar banheiro', recurrence: 'weekly', days: [6], area: 'Banheiro', points: 4 },
  { title: 'Trocar lençóis', recurrence: 'biweekly', area: 'Quartos', points: 2 },
  { title: 'Aspirar a casa', recurrence: 'weekly', days: [3], area: 'Sala', points: 3 },
  { title: 'Tirar o lixo', recurrence: 'weekly', days: [1, 3, 5], area: 'Cozinha', points: 1 },
  { title: 'Lavar a louça', recurrence: 'daily', area: 'Cozinha', points: 2 },
  { title: 'Regar as plantas', recurrence: 'weekly', days: [1, 4], area: 'Quintal', points: 1 },
  { title: 'Alimentar o pet', recurrence: 'daily', area: 'Pets', points: 1 },
  { title: 'Limpar a geladeira', recurrence: 'monthly', area: 'Cozinha', points: 3 },
];

type FormState = { id?: string; title: string; notes: string; assigneeId: string; dueDate: string; recurrence: Task['recurrence']; recurrenceDays: number[]; points: number; area: string };
const EMPTY: FormState = { title: '', notes: '', assigneeId: '', dueDate: '', recurrence: 'none', recurrenceDays: [], points: 1, area: '' };

function TasksContent() {
  const params = useSearchParams();
  const { data: tasks = [], mutate, isLoading } = useSWR<Task[]>('/dcaos/tasks');
  const { data: home } = useSWR<Home>('/dcaos/home');
  const { data: scoreboard = [], mutate: mutateScore } = useSWR<Scoreboard>('/dcaos/tasks/scoreboard?days=30');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(() => (params.get('novo') === '1' ? { ...EMPTY, dueDate: todayISO() } : null));
  const [saving, setSaving] = useState(false);
  const { id: myId } = useMe();

  const members = home?.members ?? [];
  const today = todayISO();

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks
      .filter((t) => !q || t.title.toLowerCase().includes(q))
      .filter((t) => {
        if (filter === 'done') return t.isCompleted;
        if (t.isCompleted) return false;
        if (filter === 'mine') return t.assigneeId === myId;
        if (filter === 'unassigned') return !t.assigneeId;
        return true;
      });
  }, [tasks, filter, search, myId]);

  const groups = useMemo(() => {
    if (filter === 'done') return [{ key: 'done', title: 'Concluídas recentemente', items: visible }];
    const overdue = visible.filter((t) => t.dueDate && t.dueDate < today);
    const todays = visible.filter((t) => t.dueDate === today);
    const upcoming = visible.filter((t) => t.dueDate && t.dueDate > today);
    const noDate = visible.filter((t) => !t.dueDate);
    return [
      { key: 'overdue', title: 'Atrasadas · a casa está de olho', items: overdue },
      { key: 'today', title: 'Hoje', items: todays },
      { key: 'upcoming', title: 'Próximas', items: upcoming },
      { key: 'nodate', title: 'Sem data', items: noDate },
    ].filter((g) => g.items.length > 0);
  }, [visible, filter, today]);

  const pending = tasks.filter((t) => !t.isCompleted);
  const counts: Record<Filter, number> = {
    mine: pending.filter((t) => t.assigneeId === myId).length,
    all: pending.length,
    unassigned: pending.filter((t) => !t.assigneeId).length,
    done: tasks.filter((t) => t.isCompleted).length,
  };

  const refresh = () => { mutate(); mutateScore(); };

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    try { await fn(); refresh(); } catch (err) { alert(apiError(err, 'Não foi possível concluir a ação.')); } finally { setBusy(null); }
  };

  const save = async () => {
    if (!form || form.title.trim().length < 2) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      notes: form.notes.trim() || undefined,
      assigneeId: form.assigneeId || null,
      dueDate: form.dueDate || null,
      recurrence: form.recurrence,
      recurrenceDays: form.recurrence === 'weekly' ? form.recurrenceDays : [],
      points: form.points,
      area: form.area || null,
    };
    try {
      if (form.id) await api.patch(`/dcaos/tasks/${form.id}`, payload);
      else await api.post('/dcaos/tasks', payload);
      setForm(null);
      refresh();
    } catch (err) {
      alert(apiError(err, 'Não foi possível salvar a tarefa.'));
    } finally {
      setSaving(false);
    }
  };

  const edit = (t: Task) => setForm({
    id: t.id, title: t.title, notes: t.notes ?? '', assigneeId: t.assigneeId ?? '', dueDate: t.dueDate ?? '',
    recurrence: t.recurrence, recurrenceDays: t.recurrenceDays ?? [], points: t.points, area: t.area ?? '',
  });

  const suggestions = CLASSICS.filter((c) => !tasks.some((t) => !t.isCompleted && t.title.toLowerCase() === c.title.toLowerCase()));
  const quickCreate = (c: (typeof CLASSICS)[number]) =>
    act(`new:${c.title}`, () => api.post('/dcaos/tasks', {
      title: c.title, recurrence: c.recurrence, recurrenceDays: c.days ?? [], area: c.area, points: c.points,
    }));

  const maxPoints = Math.max(...scoreboard.map((s) => s.points), 1);
  const pendingBy = (id: string) => pending.filter((t) => t.assigneeId === id).length;

  return (
    <div data-tour="dcaos-tasks-page" className="w-full p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-fit max-w-full overflow-x-auto scrollbar-none rounded-lg border border-border bg-surface-2 p-0.5" role="tablist">
          {([['all', 'Todas'], ['mine', 'Minhas'], ['unassigned', 'Sem dono'], ['done', 'Concluídas']] as [Filter, string][]).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
              className={cn('flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 text-xs font-medium transition-colors',
                filter === k ? 'bg-card text-fg border-border shadow-xs' : 'text-fg-muted hover:text-fg border-transparent')}>
              {l} <span className="text-[10px] tabular-nums text-fg-muted">{counts[k]}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 lg:w-60 lg:flex-none">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar tarefa..." className="field h-9 !pl-8 !text-[13px]" />
          </div>
          <button onClick={() => setForm({ ...EMPTY, dueDate: today })} className="btn btn-primary"><Plus size={15} /> Nova tarefa</button>
        </div>
      </div>

      {suggestions.length > 0 && !isLoading && (
        <div className="space-y-2">
          <p className="text-xs text-fg-muted">{tasks.length === 0 ? 'Comece com as clássicas:' : 'Clássicas da casa:'}</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((c) => (
              <button key={c.title} onClick={() => quickCreate(c)} disabled={!!busy}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-card px-3 text-xs font-medium text-fg-2 ring-1 ring-border transition-colors hover:text-fg hover:ring-primary-border disabled:opacity-60">
                {busy === `new:${c.title}` ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                {c.title} <span className="text-fg-muted">· {recurrenceText(c.recurrence, c.days)}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-fg-muted">
            Algo pessoal pra fazer todo dia — beber água, ler, se exercitar?{' '}
            <a href="/dcaos/habitos" className="font-medium text-accent underline underline-offset-2">Isso é um hábito →</a>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-accent" /></div>
          ) : groups.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card py-14 text-center">
              <CheckCircle2 size={28} strokeWidth={1.5} className="mx-auto text-accent" />
              <p className="mt-2 text-sm font-medium text-fg">{filter === 'done' ? 'Nada concluído ainda.' : 'Nenhuma tarefa aqui.'}</p>
              <p className="text-xs text-fg-muted">{filter === 'done' ? 'Ninguém fez nada? Interessante.' : 'Ou a casa está em ordem, ou ninguém cadastrou nada.'}</p>
            </div>
          ) : groups.map((g) => (
            <section key={g.key} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className={cn('text-sm font-semibold', g.key === 'overdue' ? 'text-danger' : 'text-fg')}>{g.title}</p>
                <span className="text-xs tabular-nums text-fg-muted">{g.items.length}</span>
              </div>
              <ul className="divide-y divide-border">
                {g.items.map((t) => {
                  const due = dueLabel(t.dueDate);
                  return (
                    <li key={t.id} className="group flex items-start gap-3 px-4 py-3 hover:bg-hover transition-colors">
                      <button
                        onClick={() => act(t.id, () => api.post(`/dcaos/tasks/${t.id}/${t.isCompleted ? 'reopen' : 'complete'}`))}
                        disabled={busy === t.id}
                        aria-label={t.isCompleted ? 'Reabrir' : 'Concluir'}
                        className="mt-0.5 shrink-0 text-fg-muted hover:text-accent"
                      >
                        {busy === t.id ? <Loader2 size={19} className="animate-spin" />
                          : t.isCompleted ? <CheckCircle2 size={19} className="text-accent" /> : <Circle size={19} />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-[13px] font-medium', t.isCompleted ? 'text-fg-muted line-through' : 'text-fg')}>{t.title}</p>
                        {t.notes && <p className="mt-0.5 line-clamp-2 text-xs text-fg-muted">{t.notes}</p>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
                            t.assigneeId ? (t.assigneeId === myId ? 'border-primary-border bg-primary-soft text-accent' : 'border-border bg-surface-2 text-fg-2') : 'border-dashed border-border text-fg-muted')}>
                            {t.assigneeId ? (t.assigneeId === myId ? 'Você' : firstName(t.assigneeName)) : 'Sem dono'}
                          </span>
                          {due && !t.isCompleted && (
                            <span className={cn('rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
                              due.tone === 'danger' ? 'border-danger/30 bg-danger-soft text-danger'
                                : due.tone === 'warning' ? 'border-warning/30 bg-warning-soft text-warning' : 'border-border text-fg-2')}>
                              {due.text}
                            </span>
                          )}
                          {t.recurrence !== 'none' && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-info/30 bg-info-soft px-1.5 py-0.5 text-[11px] font-medium text-info">
                              <Repeat size={10} /> {recurrenceText(t.recurrence, t.recurrenceDays)}
                            </span>
                          )}
                          {t.area && <span className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-fg-muted">{t.area}</span>}
                          <span className="text-[11px] tabular-nums text-fg-muted">· {t.points} pt{t.points === 1 ? '' : 's'}</span>
                          {t.isCompleted && t.completedByName && <span className="text-[11px] text-fg-muted">· feita por {firstName(t.completedByName)}</span>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {!t.isCompleted && !t.assigneeId && myId && (
                          <button onClick={() => act(t.id, () => api.patch(`/dcaos/tasks/${t.id}`, { assigneeId: myId }))}
                            className="btn btn-secondary h-7 px-2 text-[11px]"><Hand size={12} /> Eu faço!</button>
                        )}
                        <div className="flex opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                          {!t.isCompleted ? (
                            <button onClick={() => edit(t)} aria-label="Editar" className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-card hover:text-accent"><Edit3 size={13} /></button>
                          ) : (
                            <button onClick={() => act(t.id, () => api.post(`/dcaos/tasks/${t.id}/reopen`))} aria-label="Reabrir" className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-card hover:text-fg"><RotateCcw size={13} /></button>
                          )}
                          <button onClick={() => { if (confirm(`Excluir "${t.title}"?`)) act(t.id, () => api.delete(`/dcaos/tasks/${t.id}`)); }}
                            aria-label="Excluir" className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-danger-soft hover:text-danger"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <div className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2"><Trophy size={16} strokeWidth={1.75} className="text-accent" /><p className="text-sm font-semibold text-fg">Placar da casa</p></div>
              <span className="text-[11px] text-fg-muted">30 dias</span>
            </div>
            <ul className="space-y-3">
              {scoreboard.map((s, i) => (
                <li key={s.userId}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-fg">
                      {i === 0 && s.points > 0 ? <Crown size={13} className="text-warning" /> : <span className="w-[13px] text-center text-fg-muted">{i + 1}</span>}
                      {s.userId === myId ? 'Você' : firstName(s.name)}
                    </span>
                    <span className="tabular-nums text-fg-muted">{s.points} pts · {pendingBy(s.userId)} pendente{pendingBy(s.userId) === 1 ? '' : 's'}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-track">
                    <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${(s.points / maxPoints) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-fg-muted">Cada tarefa concluída vale os pontos de esforço definidos nela.</p>
          </section>
          {counts.unassigned > 0 && (
            <section className="rounded-2xl border border-warning/30 bg-warning-soft p-4 text-xs text-warning">
              {counts.unassigned} tarefa{counts.unassigned === 1 ? '' : 's'} sem dono. Quem vai fazer? Exato, ninguém respondeu.
            </section>
          )}
        </div>
      </div>

      {form && (
        <Modal title={form.id ? 'Editar tarefa' : 'Nova tarefa'} onClose={() => setForm(null)}>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg-2">O que precisa ser feito?</label>
              <input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Ex: Lavar a louça" className="field" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg-2">Quem vai fazer?</label>
              <div className="flex flex-wrap gap-1.5">
                {[{ id: '', name: 'Qualquer um' }, ...members].map((m) => (
                  <button key={m.id || 'any'} type="button" onClick={() => setForm({ ...form, assigneeId: m.id })}
                    className={cn('h-8 rounded-lg border px-2.5 text-xs font-medium transition-colors',
                      form.assigneeId === m.id ? 'border-primary bg-primary-soft text-accent' : 'border-border text-fg-2 hover:bg-hover')}>
                    {m.id === myId ? 'Eu' : m.id ? firstName(m.name) : m.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg-2">Repete?</label>
              <div className="grid grid-cols-5 gap-1.5">
                {RECURRENCES.map((r) => (
                  <button key={r.value} type="button" onClick={() => setForm({ ...form, recurrence: r.value })}
                    className={cn('h-8 rounded-lg border text-[11px] font-medium transition-colors',
                      form.recurrence === r.value ? 'border-primary bg-primary-soft text-accent' : 'border-border text-fg-2 hover:bg-hover')}>{r.label}</button>
                ))}
              </div>
            </div>
            {form.recurrence === 'weekly' && (
              <div className="rounded-xl border border-border bg-surface-2/60 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-fg-2">Em quais dias?</p>
                  <div className="flex gap-1">
                    {DAY_PRESETS.map(([l, d]) => (
                      <button key={l} type="button" onClick={() => setForm({ ...form, recurrenceDays: d })}
                        className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-fg-2 hover:bg-hover">{l}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAY_SHORT.map((w, i) => {
                    const on = form.recurrenceDays.includes(i);
                    return (
                      <button key={w} type="button"
                        onClick={() => setForm({ ...form, recurrenceDays: on ? form.recurrenceDays.filter((x) => x !== i) : [...form.recurrenceDays, i] })}
                        className={cn('h-8 rounded-md border text-[11px] font-medium', on ? 'border-primary bg-primary text-on-primary' : 'border-border bg-card text-fg-2 hover:bg-hover')}>{w}</button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-fg-muted">
                  {form.recurrenceDays.length
                    ? `Repete toda semana: ${recurrenceText('weekly', form.recurrenceDays)}.`
                    : 'Sem dias marcados, repete a cada 7 dias a partir da data abaixo.'}
                </p>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg-2">{form.recurrence === 'none' ? 'Prazo' : 'Começa em'}</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="field" />
              {form.recurrence !== 'none' && !form.dueDate && (
                <p className="mt-1 text-[11px] text-fg-muted">Em branco: começa {form.recurrence === 'weekly' && form.recurrenceDays.length ? 'no próximo dia marcado' : 'hoje'}.</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg-2">Esforço (pontos no placar)</label>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((p) => (
                  <button key={p} type="button" onClick={() => setForm({ ...form, points: p })}
                    className={cn('h-8 rounded-lg border text-xs font-semibold transition-colors',
                      form.points === p ? 'border-primary bg-primary-soft text-accent' : 'border-border text-fg-2 hover:bg-hover')}>{p}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg-2">Cômodo / área</label>
              <div className="flex flex-wrap gap-1.5">
                {AREAS.map((a) => (
                  <button key={a} type="button" onClick={() => setForm({ ...form, area: form.area === a ? '' : a })}
                    className={cn('rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                      form.area === a ? 'border-primary bg-primary-soft text-accent' : 'border-border text-fg-2 hover:bg-hover')}>{a}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg-2">Detalhes (opcional)</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="field !h-auto resize-none py-2.5" />
            </div>
            {form.assigneeId && form.assigneeId !== myId && (
              <p className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-[11px] text-fg-muted">
                {firstName(members.find((m) => m.id === form.assigneeId)?.name)} vai receber um lembrete. Sem chance de dizer que não sabia.
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setForm(null)} className="btn btn-secondary flex-1">Cancelar</button>
              <button onClick={save} disabled={saving || form.title.trim().length < 2} className="btn btn-primary flex-1">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {form.id ? 'Salvar' : 'Criar tarefa'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function DcaosTasksPage() {
  useAuth();
  return (
    <AppLayout title="Quem Vai Fazer?" subtitle="Tarefas da casa · a louça não vai se lavar sozinha" noPadding>
      <div className="h-full overflow-y-auto">
        <DcaosGate>
          <Suspense fallback={null}><TasksContent /></Suspense>
        </DcaosGate>
      </div>
    </AppLayout>
  );
}
