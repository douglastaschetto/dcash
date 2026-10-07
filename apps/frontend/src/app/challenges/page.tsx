'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Trophy, Plus, Edit3, Trash2, Loader2, ChevronLeft, ChevronRight, CheckCircle2, X, Flame,
  Circle, Lightbulb, Target, ListChecks, CalendarDays, Sparkles,
} from '@/components/ui/icons';
import { AppLayout } from '@/components/app-layout';
import { PlanGate } from '@/components/plan-gate';
import { cn } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type StatusValue = 'Não iniciada' | 'Em andamento' | 'Concluída';

const STATUSES: { value: StatusValue; label: string; dot: string; chip: string }[] = [
  { value: 'Não iniciada', label: 'Pendente',     dot: 'bg-fg-muted', chip: 'border-border bg-surface-2 text-fg-2' },
  { value: 'Em andamento', label: 'Em andamento', dot: 'bg-warning',  chip: 'border-warning/30 bg-warning-soft text-warning' },
  { value: 'Concluída',    label: 'Concluída',    dot: 'bg-primary',  chip: 'border-primary-border bg-primary-soft text-accent' },
];

type Challenge = {
  id: string;
  month: string;
  year: number;
  challenge: string;
  status: string;
  achieved?: string;
  observations?: string;
  userId?: string;
  familyGroupId?: string | null;
};

type Item = { text: string; done: boolean };
type Filter = 'all' | 'Não iniciada' | 'Em andamento' | 'Concluída' | 'empty';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dcash:token') : null;
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

const statusMeta = (status: string) => STATUSES.find((s) => s.value === status) ?? STATUSES[0];

// ── Checklist parsing (keeps the plain-text format the API stores) ────────

const DONE_RE = /^\s*(?:✅|☑️|☑|✔️|✔|\[[xX]\])\s*(.+)$/u;
const TODO_RE = /^\s*(?:⬜|☐|◻️|◻|❌|\[\s\]|[-•*]\s)\s*(.+)$/u;

function parseChallenge(text: string): { intro: string; items: Item[] } {
  const intro: string[] = [];
  const items: Item[] = [];
  text.split('\n').forEach((line) => {
    const done = line.match(DONE_RE);
    const todo = !done && line.match(TODO_RE);
    if (done) items.push({ text: done[1].trim(), done: true });
    else if (todo) items.push({ text: todo[1].trim(), done: false });
    else if (line.trim()) intro.push(line.trim());
  });
  return { intro: intro.join('\n'), items };
}

function serializeChallenge(intro: string, items: Item[]) {
  return [intro.trim(), ...items.filter((i) => i.text.trim()).map((i) => `${i.done ? '✅' : '⬜'} ${i.text.trim()}`)]
    .filter(Boolean)
    .join('\n');
}

const autoStatus = (items: Item[], fallback: string): StatusValue => {
  if (items.length === 0) return (fallback as StatusValue) || 'Não iniciada';
  const done = items.filter((i) => i.done).length;
  return done === items.length ? 'Concluída' : done > 0 ? 'Em andamento' : 'Não iniciada';
};

// ── Challenge ideas ───────────────────────────────────────────────────────

const IDEAS: { title: string; items: string[] }[] = [
  { title: '🎯 Controle total', items: ['Registrar 100% das receitas', 'Registrar 100% das despesas', 'Conferir o extrato toda semana'] },
  { title: '🍽️ Mês sem delivery', items: ['Zero pedidos de delivery', 'Cozinhar em casa 5x por semana', 'Levar marmita para o trabalho'] },
  { title: '💰 Poupar 10% da renda', items: ['Separar 10% no dia do pagamento', 'Depositar no cofrinho', 'Não resgatar antes do fim do mês'] },
  { title: '✂️ Faxina de assinaturas', items: ['Listar todas as assinaturas', 'Cancelar as que não uso', 'Renegociar planos de celular/internet'] },
  { title: '🛑 Zero compra por impulso', items: ['Esperar 48h antes de compras não planejadas', 'Usar a lista de desejos', 'Comparar preços antes de comprar'] },
  { title: '📉 Lazer 20% mais barato', items: ['Definir limite para lazer no planejamento', 'Trocar 2 saídas pagas por gratuitas', 'Acompanhar o gasto semanalmente'] },
];

// ── Page ──────────────────────────────────────────────────────────────────

export default function ChallengesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const currentMonth = MONTHS[now.getMonth()];
  const isCurrentYear = year === now.getFullYear();

  const [form, setForm] = useState<{ id: string; month: string; intro: string; items: Item[]; status: string; observations: string; autoStatus: boolean }>({
    id: '', month: currentMonth, intro: '', items: [], status: 'Não iniciada', observations: '', autoStatus: true,
  });
  const [newItem, setNewItem] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/challenges?year=${year}`, { headers: getAuthHeaders() });
      if (res.ok) setChallenges(await res.json());
    } catch {}
    setLoading(false);
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const map = useMemo(() => new Map(challenges.map((c) => [c.month, c])), [challenges]);

  const upsert = async (c: { id?: string; month: string; challenge: string; status: string; observations?: string }) => {
    const res = await fetch(`${API}/challenges`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id: c.id || undefined, month: c.month, year, challenge: c.challenge, status: c.status, observations: c.observations ?? '' }),
    });
    if (!res.ok) throw new Error();
    return res;
  };

  // ── Panel ─────────────────────────────────────────────────────────────
  const firstFreeMonth = () => {
    const start = isCurrentYear ? now.getMonth() : 0;
    for (let i = start; i < 12; i++) if (!map.has(MONTHS[i])) return MONTHS[i];
    return MONTHS.find((m) => !map.has(m)) ?? currentMonth;
  };

  function openNew(month: string, idea?: { title: string; items: string[] }) {
    setForm({
      id: '', month,
      intro: idea?.title ?? '',
      items: idea ? idea.items.map((t) => ({ text: t, done: false })) : [],
      status: 'Não iniciada', observations: '', autoStatus: true,
    });
    setNewItem('');
    setPanelOpen(true);
  }

  function openEdit(c: Challenge) {
    const parsed = parseChallenge(c.challenge);
    setForm({
      id: c.id, month: c.month, intro: parsed.intro, items: parsed.items,
      status: c.status, observations: c.observations ?? '',
      autoStatus: parsed.items.length > 0 && autoStatus(parsed.items, c.status) === c.status,
    });
    setNewItem('');
    setPanelOpen(true);
  }

  const addItem = () => {
    if (!newItem.trim()) return;
    setForm((f) => ({ ...f, items: [...f.items, { text: newItem.trim(), done: false }] }));
    setNewItem('');
  };

  const formStatus = form.autoStatus && form.items.length > 0 ? autoStatus(form.items, form.status) : form.status;
  const formText = serializeChallenge(form.intro, form.items);
  const monthTaken = !form.id && map.has(form.month);

  async function save() {
    if (!formText.trim() || monthTaken) return;
    setSaving(true);
    try {
      await upsert({ id: form.id, month: form.month, challenge: formText, status: formStatus, observations: form.observations });
      await load();
      setPanelOpen(false);
    } catch {
      alert('Não foi possível salvar o desafio.');
    }
    setSaving(false);
  }

  // ── Inline actions ────────────────────────────────────────────────────
  async function toggleItem(c: Challenge, index: number) {
    const parsed = parseChallenge(c.challenge);
    const items = parsed.items.map((it, i) => (i === index ? { ...it, done: !it.done } : it));
    const text = serializeChallenge(parsed.intro, items);
    const status = autoStatus(items, c.status);
    setChallenges((prev) => prev.map((ch) => (ch.id === c.id ? { ...ch, challenge: text, status } : ch)));
    setBusyId(c.id);
    try {
      await upsert({ ...c, challenge: text, status });
    } catch {
      setChallenges((prev) => prev.map((ch) => (ch.id === c.id ? c : ch)));
    }
    setBusyId(null);
  }

  async function quickStatus(c: Challenge, status: string) {
    setChallenges((prev) => prev.map((ch) => (ch.id === c.id ? { ...ch, status } : ch)));
    try { await upsert({ ...c, status }); } catch { setChallenges((prev) => prev.map((ch) => (ch.id === c.id ? c : ch))); }
  }

  async function deleteChallenge(c: Challenge) {
    if (!confirm(`Excluir o desafio de ${c.month}?`)) return;
    setDeleting(c.id);
    try {
      const res = await fetch(`${API}/challenges/${c.id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (res.ok) setChallenges((prev) => prev.filter((x) => x.id !== c.id));
    } catch {}
    setDeleting(null);
  }

  // ── Stats ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let itemsTotal = 0, itemsDone = 0;
    challenges.forEach((c) => {
      const { items } = parseChallenge(c.challenge);
      itemsTotal += items.length;
      itemsDone += items.filter((i) => i.done).length;
    });
    const completed = challenges.filter((c) => c.status === 'Concluída').length;
    const inProgress = challenges.filter((c) => c.status === 'Em andamento').length;
    // Consecutive completed months ending at the current (or last elapsed) month
    const lastIdx = isCurrentYear ? now.getMonth() : year < now.getFullYear() ? 11 : -1;
    let streak = 0;
    for (let i = lastIdx; i >= 0; i--) {
      const c = map.get(MONTHS[i]);
      if (c?.status === 'Concluída') streak++;
      else if (i === lastIdx && isCurrentYear) continue; // current month still open
      else break;
    }
    return {
      completed, inProgress, itemsTotal, itemsDone, streak,
      pct: challenges.length > 0 ? Math.round((completed / challenges.length) * 100) : 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenges, map, year]);

  const current = isCurrentYear ? map.get(currentMonth) : undefined;

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: 12 },
    { key: 'Em andamento', label: 'Em andamento', count: stats.inProgress },
    { key: 'Não iniciada', label: 'Pendentes', count: challenges.filter((c) => c.status === 'Não iniciada').length },
    { key: 'Concluída', label: 'Concluídos', count: stats.completed },
    { key: 'empty', label: 'Sem desafio', count: 12 - challenges.length },
  ];

  const visibleMonths = MONTHS.filter((m) => {
    const c = map.get(m);
    if (filter === 'all') return true;
    if (filter === 'empty') return !c;
    return c?.status === filter;
  });

  const r = 22, circ = 2 * Math.PI * r;

  // ── Checklist renderer (shared by highlight + month cards) ─────────────
  const Checklist = ({ c, limit }: { c: Challenge; limit?: number }) => {
    const { intro, items } = parseChallenge(c.challenge);
    const shown = limit ? items.slice(0, limit) : items;
    return (
      <div className="space-y-2">
        {intro && <p className={cn('whitespace-pre-line text-[13px] leading-relaxed', items.length ? 'font-medium text-fg' : 'text-fg-2', !!limit && 'line-clamp-3')}>{intro}</p>}
        {shown.length > 0 && (
          <ul className="space-y-1">
            {shown.map((it, i) => (
              <li key={i}>
                <button
                  onClick={() => toggleItem(c, i)}
                  disabled={busyId === c.id}
                  className="group/item flex w-full items-start gap-2 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-hover disabled:opacity-60"
                >
                  {it.done
                    ? <CheckCircle2 size={15} className="mt-px shrink-0 text-accent" />
                    : <Circle size={15} className="mt-px shrink-0 text-fg-muted group-hover/item:text-accent" />}
                  <span className={cn('text-xs leading-snug', it.done ? 'text-fg-muted line-through' : 'text-fg-2')}>{it.text}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {limit && items.length > limit && (
          <button onClick={() => openEdit(c)} className="pl-1 text-[11px] font-medium text-accent hover:underline">+{items.length - limit} itens</button>
        )}
      </div>
    );
  };

  return (
    <AppLayout title="Desafios Financeiros" subtitle="Um objetivo por mês para evoluir suas finanças" noPadding>
      <PlanGate feature="financial_challenges">
      <div className="h-full overflow-y-auto">
      <div className="w-full p-4 md:p-6 space-y-4">

        {/* ── KPIs ─────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div data-tour="challenges-stats-card" className="hero-card relative overflow-hidden rounded-2xl p-5">
            <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full border border-white/10" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-[13px] font-medium text-white/70"><Trophy size={15} strokeWidth={1.75} /> Performance {year}</p>
                <p className="mt-3 text-[26px] leading-none font-semibold tracking-tight tabular-nums">{stats.pct}%</p>
                <p className="mt-2 text-[11px] text-white/60">{stats.completed} de {challenges.length} desafio{challenges.length === 1 ? '' : 's'} concluído{stats.completed === 1 ? '' : 's'}</p>
              </div>
              <div className="relative h-14 w-14 shrink-0">
                <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
                  <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
                  <circle cx="28" cy="28" r={r} fill="none" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={circ} strokeDashoffset={circ - (stats.pct / 100) * circ} className="transition-[stroke-dashoffset] duration-700" />
                </svg>
                <Trophy size={16} className="absolute inset-0 m-auto text-white/80" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-fg-2">Meses com desafio</p>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-fg-muted"><CalendarDays size={15} strokeWidth={1.75} /></span>
            </div>
            <p className="mt-3 text-[26px] leading-none font-semibold tracking-tight tabular-nums text-fg">{challenges.length}<span className="text-base font-normal text-fg-muted">/12</span></p>
            <div className="mt-3 flex gap-1">
              {MONTHS.map((m) => {
                const c = map.get(m);
                return <span key={m} title={`${m}: ${c ? statusMeta(c.status).label : 'sem desafio'}`}
                  className={cn('h-1.5 flex-1 rounded-full', c ? statusMeta(c.status).dot : 'bg-track')} />;
              })}
            </div>
            <p className="mt-2 text-[11px] text-fg-muted">{stats.inProgress} em andamento</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-fg-2">Metas cumpridas</p>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-fg-muted"><ListChecks size={15} strokeWidth={1.75} /></span>
            </div>
            <p className="mt-3 text-[26px] leading-none font-semibold tracking-tight tabular-nums text-fg">
              {stats.itemsDone}<span className="text-base font-normal text-fg-muted">/{stats.itemsTotal}</span>
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-track">
              <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${stats.itemsTotal ? (stats.itemsDone / stats.itemsTotal) * 100 : 0}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-fg-muted">itens de checklist no ano</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-fg-2">Sequência</p>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-warning"><Flame size={15} strokeWidth={1.75} /></span>
            </div>
            <p className="mt-3 text-[26px] leading-none font-semibold tracking-tight tabular-nums text-fg">
              {stats.streak} <span className="text-base font-normal text-fg-muted">{stats.streak === 1 ? 'mês' : 'meses'}</span>
            </p>
            <p className="mt-3 text-[11px] text-fg-muted">
              {stats.streak > 0 ? 'concluídos seguidos — continue assim!' : 'Conclua desafios em meses seguidos'}
            </p>
          </div>
        </section>

        {/* ── Toolbar ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-fit max-w-full overflow-x-auto scrollbar-none rounded-lg border border-border bg-surface-2 p-0.5" role="tablist">
            {filters.map((fl) => (
              <button key={fl.key} role="tab" aria-selected={filter === fl.key} onClick={() => setFilter(fl.key)}
                className={cn('flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 text-xs font-medium transition-colors',
                  filter === fl.key ? 'bg-card text-fg border-border shadow-xs' : 'text-fg-muted hover:text-fg border-transparent')}>
                {fl.label}
                {fl.key !== 'all' && <span className="text-[10px] tabular-nums text-fg-muted">{fl.count}</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
              <button onClick={() => setYear((y) => y - 1)} aria-label="Ano anterior"
                className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-fg transition-colors"><ChevronLeft size={16} /></button>
              <span className="min-w-[64px] text-center text-[13px] font-semibold tabular-nums text-fg">{year}</span>
              <button onClick={() => setYear((y) => y + 1)} aria-label="Próximo ano"
                className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-fg transition-colors"><ChevronRight size={16} /></button>
            </div>
            <button data-tour="challenges-new-btn" onClick={() => openNew(firstFreeMonth())} className="btn btn-primary">
              <Plus size={15} /> Novo desafio
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
            {/* ═══════ Meses ═══════ */}
            <div data-tour="challenges-months-grid" className="grid min-w-0 grid-cols-1 content-start gap-4 sm:grid-cols-2 2xl:grid-cols-3 min-[1900px]:grid-cols-4">
              {visibleMonths.length === 0 && (
                <div className="col-span-full rounded-2xl border border-border bg-card py-14 text-center text-[13px] text-fg-muted">Nenhum mês neste filtro.</div>
              )}
              {visibleMonths.map((month) => {
                const c = map.get(month);
                const idx = MONTHS.indexOf(month);
                const isCurrent = month === currentMonth && isCurrentYear;
                const isPast = year < now.getFullYear() || (isCurrentYear && idx < now.getMonth());
                const meta = c ? statusMeta(c.status) : null;
                const parsed = c ? parseChallenge(c.challenge) : null;
                const done = parsed?.items.filter((i) => i.done).length ?? 0;
                const total = parsed?.items.length ?? 0;
                return (
                  <article key={month} className={cn(
                    'group flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-colors',
                    isCurrent ? 'border-primary-border ring-1 ring-primary-border' : 'border-border hover:border-border-hover',
                  )}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-[13px] font-semibold', c ? 'text-fg' : 'text-fg-muted')}>{month}</span>
                        {isCurrent && <span className="rounded border border-primary-border bg-primary-soft px-1.5 py-px text-[10px] font-semibold text-accent">Atual</span>}
                      </div>
                      {c && (
                        <div className="flex items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                          <button onClick={() => openEdit(c)} aria-label="Editar" className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-accent"><Edit3 size={13} /></button>
                          <button onClick={() => deleteChallenge(c)} disabled={deleting === c.id} aria-label="Excluir" className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-danger-soft hover:text-danger">
                            {deleting === c.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </button>
                        </div>
                      )}
                    </div>

                    {c ? (
                      <>
                        <div className="flex-1"><Checklist c={c} limit={isCurrent ? undefined : 4} /></div>
                        {total > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-track">
                              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(done / total) * 100}%` }} />
                            </div>
                            <span className="text-[11px] tabular-nums text-fg-muted">{done}/{total}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                          <div className="flex rounded-md border border-border bg-surface-2 p-0.5">
                            {STATUSES.map((s) => (
                              <button key={s.value} onClick={() => quickStatus(c, s.value)} title={s.label}
                                className={cn('flex h-6 items-center gap-1 rounded px-1.5 text-[10px] font-medium transition-colors',
                                  c.status === s.value ? 'bg-card text-fg shadow-xs' : 'text-fg-muted hover:text-fg')}>
                                <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} /> {s.label}
                              </button>
                            ))}
                          </div>
                          {meta && c.status === 'Concluída' && <Trophy size={14} className="text-accent" />}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
                        <Target size={20} strokeWidth={1.5} className="text-fg-disabled" />
                        <p className="text-xs text-fg-muted">{isPast ? 'Mês sem desafio' : 'Nenhum desafio ainda'}</p>
                        <button onClick={() => openNew(month)} className="btn btn-secondary h-8 px-3 text-xs"><Plus size={13} /> Adicionar</button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {/* ═══════ Lateral ═══════ */}
            <div className="min-w-0 space-y-4">
              {isCurrentYear && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} strokeWidth={1.75} className="text-accent" />
                      <p className="text-sm font-semibold text-fg">Desafio de {currentMonth.toLowerCase()}</p>
                    </div>
                    {current && <span className={cn('rounded-md border px-1.5 py-0.5 text-[11px] font-medium', statusMeta(current.status).chip)}>{statusMeta(current.status).label}</span>}
                  </div>
                  {current ? (
                    (() => {
                      const { items } = parseChallenge(current.challenge);
                      const done = items.filter((i) => i.done).length;
                      const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
                      return (
                        <>
                          <p className="text-[11px] text-fg-muted">
                            {items.length > 0 ? `${done} de ${items.length} metas · ` : ''}{daysLeft === 0 ? 'último dia do mês' : `${daysLeft} dia${daysLeft === 1 ? '' : 's'} restantes`}
                          </p>
                          {items.length > 0 && done < items.length && daysLeft <= 7 && (
                            <p className="mt-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-[11px] text-warning">
                              Reta final! Faltam {items.length - done} meta{items.length - done === 1 ? '' : 's'} para fechar o mês.
                            </p>
                          )}
                          {items.length === 0 && (
                            <p className="mt-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-[11px] text-fg-muted">
                              Dica: edite e transforme o desafio em itens de checklist para marcar o progresso.
                            </p>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-4 text-center">
                      <p className="text-[13px] text-fg-muted">Você ainda não definiu o desafio deste mês.</p>
                      <button onClick={() => openNew(currentMonth)} className="btn btn-primary h-8 px-3 text-xs"><Plus size={13} /> Criar agora</button>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-1 flex items-center gap-2">
                  <Lightbulb size={16} strokeWidth={1.75} className="text-warning" />
                  <p className="text-sm font-semibold text-fg">Ideias de desafios</p>
                </div>
                <p className="mb-3 text-xs text-fg-muted">Clique para usar no próximo mês livre ({firstFreeMonth().toLowerCase()}).</p>
                <ul className="space-y-2">
                  {IDEAS.map((idea) => (
                    <li key={idea.title}>
                      <button onClick={() => openNew(firstFreeMonth(), idea)}
                        className="w-full rounded-xl border border-border bg-surface-2/50 px-3 py-2.5 text-left transition-colors hover:border-primary-border hover:bg-primary-soft">
                        <p className="text-[13px] font-medium text-fg">{idea.title}</p>
                        <p className="mt-0.5 truncate text-[11px] text-fg-muted">{idea.items.join(' · ')}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* ── Slide-over ──────────────────────────────────────────────── */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-overlay backdrop-blur-sm" onClick={() => setPanelOpen(false)} />
          <div className="flex w-full max-w-md flex-col bg-card shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-[11px] font-medium text-fg-muted">{form.id ? 'Editar desafio' : 'Novo desafio'}</p>
                <h2 className="text-base font-semibold text-fg">{form.month} · {year}</h2>
              </div>
              <button onClick={() => setPanelOpen(false)} aria-label="Fechar" className="icon-btn !h-8 !w-8"><X size={14} /></button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {!form.id && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-fg-2">Mês</label>
                  <select value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))} className="field">
                    {MONTHS.map((m) => <option key={m} value={m}>{m}{map.has(m) ? ' (já tem desafio)' : ''}</option>)}
                  </select>
                  {monthTaken && <p className="mt-1 text-[11px] text-danger">Este mês já tem um desafio. Edite o existente ou escolha outro mês.</p>}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-fg-2">Objetivo do mês</label>
                <textarea rows={2} value={form.intro} onChange={(e) => setForm((f) => ({ ...f, intro: e.target.value }))}
                  placeholder="Ex: 🎯 Mês do controle total"
                  className="field !h-auto resize-none py-2.5" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-fg-2">Metas (checklist)</label>
                {form.items.length > 0 && (
                  <ul className="mb-2 divide-y divide-border rounded-xl border border-border">
                    {form.items.map((it, i) => (
                      <li key={i} className="flex items-center gap-2 px-2.5 py-2">
                        <button type="button" onClick={() => setForm((f) => ({ ...f, items: f.items.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) }))}
                          aria-label={it.done ? 'Desmarcar' : 'Marcar'}>
                          {it.done ? <CheckCircle2 size={16} className="text-accent" /> : <Circle size={16} className="text-fg-muted" />}
                        </button>
                        <input value={it.text}
                          onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) }))}
                          className={cn('min-w-0 flex-1 bg-transparent text-[13px] outline-none', it.done ? 'text-fg-muted line-through' : 'text-fg')} />
                        <button type="button" onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, j) => j !== i) }))}
                          aria-label="Remover meta" className="flex h-6 w-6 items-center justify-center rounded text-fg-muted hover:bg-danger-soft hover:text-danger">
                          <X size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  <input value={newItem} onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
                    placeholder="Ex: Registrar 100% das despesas" className="field h-9 !text-[13px]" />
                  <button type="button" onClick={addItem} disabled={!newItem.trim()} className="btn btn-secondary btn-square" aria-label="Adicionar meta"><Plus size={14} /></button>
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-fg-2">Status</label>
                  {form.items.length > 0 && (
                    <label className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                      <input type="checkbox" checked={form.autoStatus} onChange={(e) => setForm((f) => ({ ...f, autoStatus: e.target.checked }))} />
                      Automático pelas metas
                    </label>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {STATUSES.map((s) => (
                    <button key={s.value} type="button" disabled={form.autoStatus && form.items.length > 0}
                      onClick={() => setForm((f) => ({ ...f, status: s.value }))}
                      className={cn('flex h-9 items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition-colors disabled:cursor-default',
                        formStatus === s.value ? 'border-primary bg-primary-soft text-accent' : 'border-border text-fg-2 hover:bg-hover disabled:hover:bg-transparent')}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} /> {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-fg-2">Observações (opcional)</label>
                <textarea rows={2} value={form.observations} onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
                  placeholder="Anotações, aprendizados, resultado..." className="field !h-auto resize-none py-2.5" />
              </div>

              {!form.id && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-fg-2">Usar uma ideia</p>
                  <div className="flex flex-wrap gap-1.5">
                    {IDEAS.map((idea) => (
                      <button key={idea.title} type="button"
                        onClick={() => setForm((f) => ({ ...f, intro: idea.title, items: idea.items.map((t) => ({ text: t, done: false })) }))}
                        className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-fg-2 hover:border-primary-border hover:bg-primary-soft hover:text-accent transition-colors">
                        {idea.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-border px-5 py-4">
              <button onClick={() => setPanelOpen(false)} className="btn btn-secondary">Cancelar</button>
              <button onClick={save} disabled={saving || !formText.trim() || monthTaken} className="btn btn-primary flex-1">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {form.id ? 'Salvar alterações' : 'Criar desafio'}
              </button>
            </div>
          </div>
        </div>
      )}
      </PlanGate>
    </AppLayout>
  );
}
