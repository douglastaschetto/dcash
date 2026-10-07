'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2, ChevronLeft, ChevronRight, Check, Trash2, Target, Copy,
  Wand2, Search, AlertTriangle, RotateCcw, CalendarCheck,
} from '@/components/ui/icons';
import { LucideIcon } from '@/lib/icon-picker';
import { CurrencyInput } from '@/lib/currency-input';
import { AppLayout } from '@/components/app-layout';
import { cn, parseDateOnly } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dcash:token') : null;
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtBRL = (n: number) => `R$ ${fmt(n)}`;

type YearlyStatus = { month: number; hasPlanning: boolean; totalPlanned: number; totalSpent: number; percent: number };

type CategoryLimit = {
  id: string;
  amount: number;
  spent: number;
  percent: number;
  categoryId: string;
  category: { id: string; name: string; color: string; icon: string };
};

type ExpenseCategory = { id: string; name: string; color: string; icon: string };

type Row = { categoryId: string; name: string; color: string; icon: string; amount: number; limitId?: string };

/* Income forecast + reserve % are planning aids the API doesn't store — kept per browser */
const BASE_KEY = (y: number, m: number) => `dcash:planning-base:${y}-${m}`;
function readBase(y: number, m: number): { income: number; reservePct: number } {
  try {
    const raw = localStorage.getItem(BASE_KEY(y, m));
    if (raw) return { income: 0, reservePct: 20, ...JSON.parse(raw) };
  } catch {}
  return { income: 0, reservePct: 20 };
}
function writeBase(y: number, m: number, v: { income: number; reservePct: number }) {
  try { localStorage.setItem(BASE_KEY(y, m), JSON.stringify(v)); } catch {}
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ percent, color, className }: { percent: number; color?: string; className?: string }) {
  const over = percent > 100;
  return (
    <div className={cn('h-1.5 w-full rounded-full bg-track overflow-hidden', className)}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: over ? 'var(--danger)' : color || 'var(--primary)' }}
      />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PlanningPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [yearlyStatus, setYearlyStatus] = useState<YearlyStatus[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [existingLimits, setExistingLimits] = useState<CategoryLimit[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [panelLoading, setPanelLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [replicating, setReplicating] = useState(false);
  const [search, setSearch] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

  const [income, setIncome] = useState(0);
  const [reservePct, setReservePct] = useState(20);

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadYearlyStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch(`${API}/category-limits/yearly-status?year=${year}`, { headers: getAuthHeaders() });
      if (res.ok) setYearlyStatus(await res.json());
    } finally {
      setLoadingStatus(false);
    }
  }, [year]);

  useEffect(() => { loadYearlyStatus(); }, [loadYearlyStatus]);

  useEffect(() => {
    fetch(`${API}/categories`, { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((all) => setCategories((all || []).filter((c: any) => c.type === 'expense')))
      .catch(() => setCategories([]));
    fetch(`${API}/transactions`, { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setTransactions(Array.isArray(d) ? d : []))
      .catch(() => setTransactions([]));
  }, []);

  const merge = useCallback((cats: ExpenseCategory[], limits: CategoryLimit[], keepIds = true): Row[] =>
    cats.map((c) => {
      const l = limits.find((x) => x.categoryId === c.id);
      return {
        categoryId: c.id, name: c.name, color: c.color, icon: c.icon,
        amount: l ? Number(l.amount) : 0,
        limitId: keepIds ? l?.id : undefined,
      };
    }), []);

  const loadMonth = useCallback(async () => {
    setPanelLoading(true);
    try {
      const res = await fetch(`${API}/category-limits?month=${month}&year=${year}`, { headers: getAuthHeaders() });
      const limits: CategoryLimit[] = res.ok ? await res.json() : [];
      setExistingLimits(limits);
    } finally {
      setPanelLoading(false);
    }
  }, [month, year]);

  useEffect(() => { loadMonth(); }, [loadMonth]);
  useEffect(() => { setRows(merge(categories, existingLimits)); }, [categories, existingLimits, merge]);
  useEffect(() => {
    const b = readBase(year, month);
    setIncome(b.income);
    setReservePct(b.reservePct);
  }, [year, month]);

  const updateBase = (patch: Partial<{ income: number; reservePct: number }>) => {
    const next = { income, reservePct, ...patch };
    setIncome(next.income);
    setReservePct(next.reservePct);
    writeBase(year, month, next);
  };

  // ── Spending history per category ─────────────────────────────────────────
  const spentBy = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((t) => {
      if (t.type !== 'EXPENSE' || t.piggyBankId || !t.category?.id) return;
      const d = parseDateOnly(t.date);
      const key = `${t.category.id}|${d.getFullYear()}-${d.getMonth() + 1}`;
      map[key] = (map[key] || 0) + Number(t.amount);
    });
    return map;
  }, [transactions]);

  const spentIn = (catId: string, y: number, m: number) => spentBy[`${catId}|${y}-${m}`] || 0;
  const avg3 = (catId: string) => {
    let sum = 0;
    for (let i = 1; i <= 3; i++) {
      const d = new Date(year, month - 1 - i, 1);
      sum += spentIn(catId, d.getFullYear(), d.getMonth() + 1);
    }
    return Math.round((sum / 3) * 100) / 100;
  };

  // ── Derived numbers ───────────────────────────────────────────────────────
  const reserveAmt = income * (reservePct / 100);
  const available = income - reserveAmt;
  const distributed = rows.reduce((s, r) => s + r.amount, 0);
  const remaining = available - distributed;
  const spentTotal = rows.reduce((s, r) => s + spentIn(r.categoryId, year, month), 0);
  const plannedCount = rows.filter((r) => r.amount > 0).length;
  const overCount = rows.filter((r) => r.amount > 0 && spentIn(r.categoryId, year, month) > r.amount).length;

  const dirty = useMemo(() => {
    const saved = new Map(existingLimits.map((l) => [l.categoryId, Number(l.amount)]));
    return rows.some((r) => (saved.get(r.categoryId) ?? 0) !== r.amount);
  }, [rows, existingLimits]);

  const visibleRows = rows.filter((r) => !search.trim() || r.name.toLowerCase().includes(search.trim().toLowerCase()));

  // ── Navigation (guards unsaved edits) ─────────────────────────────────────
  const confirmLeave = () => !dirty || confirm('Há alterações não salvas neste mês. Descartar?');
  const selectMonth = (m: number, y = year) => {
    if ((m === month && y === year) || !confirmLeave()) return;
    setYear(y); setMonth(m); setSearch('');
  };
  const changeYear = (delta: number) => {
    if (!confirmLeave()) return;
    setYear((y) => y + delta);
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const setAmount = (categoryId: string, amount: number) =>
    setRows((prev) => prev.map((r) => (r.categoryId === categoryId ? { ...r, amount } : r)));

  const fillWithAverage = () => {
    const anyAvg = rows.some((r) => avg3(r.categoryId) > 0);
    if (!anyAvg) { alert('Não há gastos nos últimos 3 meses para calcular a média.'); return; }
    setRows((prev) => prev.map((r) => {
      const a = avg3(r.categoryId);
      return a > 0 && r.amount === 0 ? { ...r, amount: Math.ceil(a) } : r;
    }));
  };

  const replicatePrevMonth = async () => {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear  = month === 1 ? year - 1 : year;
    setReplicating(true);
    try {
      const res = await fetch(`${API}/category-limits?month=${prevMonth}&year=${prevYear}`, { headers: getAuthHeaders() });
      const limits: CategoryLimit[] = res.ok ? await res.json() : [];
      if (limits.length === 0) {
        alert(`Não há planejamento em ${MONTHS[prevMonth - 1]} para replicar.`);
        return;
      }
      const copied = merge(categories, limits, false);
      setRows((prev) => prev.map((r) => ({ ...r, amount: copied.find((c) => c.categoryId === r.categoryId)?.amount ?? 0 })));
      const prevBase = readBase(prevYear, prevMonth);
      if (income === 0 && prevBase.income > 0) updateBase(prevBase);
    } finally {
      setReplicating(false);
    }
  };

  const clearAll = () => {
    if (distributed === 0) return;
    if (!confirm('Zerar todos os limites deste mês? (Só será aplicado ao salvar.)')) return;
    setRows((prev) => prev.map((r) => ({ ...r, amount: 0 })));
  };

  const discard = () => setRows(merge(categories, existingLimits));

  const savePlanning = async () => {
    setSaving(true);
    try {
      const saved = new Map(existingLimits.map((l) => [l.categoryId, l]));
      for (const r of rows) {
        const prev = saved.get(r.categoryId);
        if (r.amount > 0 && Number(prev?.amount ?? 0) !== r.amount) {
          await fetch(`${API}/category-limits`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ categoryId: r.categoryId, amount: r.amount, month, year }),
          });
        } else if (r.amount === 0 && prev) {
          await fetch(`${API}/category-limits/${prev.id}`, { method: 'DELETE', headers: getAuthHeaders() });
        }
      }
      await Promise.all([loadYearlyStatus(), loadMonth()]);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch {
      alert('Não foi possível salvar o planejamento.');
    } finally {
      setSaving(false);
    }
  };

  const getStatus = (m: number) => yearlyStatus.find((s) => s.month === m);
  const yearPlanned = yearlyStatus.reduce((s, x) => s + (x.totalPlanned || 0), 0);
  const yearSpent = yearlyStatus.reduce((s, x) => s + (x.hasPlanning ? x.totalSpent || 0 : 0), 0);
  const monthsPlanned = yearlyStatus.filter((s) => s.hasPlanning).length;
  const isCurrent = (m: number) => m === now.getMonth() + 1 && year === now.getFullYear();
  const hasPlanning = existingLimits.length > 0;
  const prevMonthName = MONTHS[month === 1 ? 11 : month - 2];

  return (
    <AppLayout title="Planejamento" subtitle="Defina limites por categoria para cada mês" noPadding>
      <div className="grid h-full grid-cols-1 overflow-y-auto lg:grid-cols-[300px_minmax(0,1fr)] lg:overflow-hidden 2xl:grid-cols-[340px_minmax(0,1fr)]">

        {/* ═══════════════ Meses (esquerda) ═══════════════ */}
        <aside className="flex flex-col border-b border-border lg:min-h-0 lg:border-b-0 lg:border-r">
          {/* Year selector */}
          <div className="shrink-0 p-4 pb-3">
            <div data-tour="planning-year-nav" className="flex items-center justify-between rounded-lg border border-border bg-card p-0.5">
              <button onClick={() => changeYear(-1)} aria-label="Ano anterior"
                className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-fg transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold tabular-nums text-fg">{year}</span>
              <button onClick={() => changeYear(1)} aria-label="Próximo ano"
                className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-fg transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border bg-card px-3 py-2">
                <p className="text-[11px] text-fg-muted">Planejado no ano</p>
                <p className="truncate text-[13px] font-semibold tabular-nums text-fg">{fmtBRL(yearPlanned)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card px-3 py-2">
                <p className="text-[11px] text-fg-muted">Meses planejados</p>
                <p className="text-[13px] font-semibold tabular-nums text-fg">{monthsPlanned}/12</p>
              </div>
            </div>
            {yearPlanned > 0 && (
              <div className="mt-2">
                <ProgressBar percent={(yearSpent / yearPlanned) * 100} />
                <p className="mt-1 text-[11px] text-fg-muted tabular-nums">{fmtBRL(yearSpent)} gastos nos meses planejados</p>
              </div>
            )}
          </div>

          {/* Month list */}
          <div
            data-tour="planning-months-grid"
            className="flex gap-2 overflow-x-auto px-4 pb-4 scrollbar-none lg:min-h-0 lg:flex-1 lg:flex-col lg:gap-1 lg:overflow-y-auto lg:overflow-x-hidden"
          >
            {loadingStatus && yearlyStatus.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            ) : MONTHS.map((name, idx) => {
              const m = idx + 1;
              const st = getStatus(m);
              const planned = st?.hasPlanning ?? false;
              const selected = m === month;
              const over = planned && (st?.percent ?? 0) > 100;
              return (
                <button
                  key={m}
                  onClick={() => selectMonth(m)}
                  aria-current={selected ? 'date' : undefined}
                  className={cn(
                    'group relative flex min-w-[150px] shrink-0 flex-col gap-1.5 rounded-lg border px-3 py-2.5 text-left transition-colors lg:min-w-0',
                    selected
                      ? 'border-primary-border bg-primary-soft'
                      : 'border-transparent hover:bg-hover',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('text-[13px] font-medium', selected ? 'text-accent' : 'text-fg')}>{name}</span>
                    <span className="flex items-center gap-1.5">
                      {isCurrent(m) && (
                        <span className="rounded px-1.5 py-px text-[10px] font-semibold bg-primary-soft text-accent border border-primary-border">Atual</span>
                      )}
                      {planned
                        ? <span className={cn('text-[11px] font-medium tabular-nums', over ? 'text-danger' : 'text-fg-2')}>{(st?.percent ?? 0).toFixed(0)}%</span>
                        : <span className="text-[11px] text-fg-muted">—</span>}
                    </span>
                  </div>
                  {planned ? (
                    <>
                      <ProgressBar percent={st?.percent ?? 0} />
                      <span className="text-[11px] tabular-nums text-fg-muted">
                        {fmtBRL(st?.totalSpent ?? 0)} de {fmtBRL(st?.totalPlanned ?? 0)}
                      </span>
                    </>
                  ) : (
                    <span className="text-[11px] text-fg-muted">Sem planejamento</span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* ═══════════════ Editor do mês (direita) ═══════════════ */}
        <section className="flex flex-col lg:min-h-0">
          {/* Header */}
          <div className="shrink-0 space-y-4 border-b border-border p-4 md:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-fg">{MONTHS[month - 1]} {year}</h2>
                  {hasPlanning
                    ? <span className="rounded-md border border-primary-border bg-primary-soft px-1.5 py-0.5 text-[11px] font-medium text-accent">Planejado</span>
                    : <span className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-fg-2">Sem planejamento</span>}
                </div>
                <p className="text-xs text-fg-muted">Defina quanto pode ser gasto em cada categoria.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={fillWithAverage} className="btn btn-secondary" title="Preenche as categorias vazias com a média de gastos dos últimos 3 meses">
                  <Wand2 size={14} /> Usar média 3 meses
                </button>
                <button onClick={replicatePrevMonth} disabled={replicating} className="btn btn-secondary">
                  {replicating ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />} Copiar {prevMonthName.toLowerCase()}
                </button>
                <button onClick={clearAll} disabled={distributed === 0} className="btn btn-secondary btn-square" title="Zerar todos os limites" aria-label="Zerar todos os limites">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Budget strip */}
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
              <div className="col-span-2 rounded-xl border border-border bg-card p-3 xl:col-span-1">
                <p className="text-[11px] text-fg-muted">Receita prevista</p>
                <CurrencyInput
                  value={income}
                  onChange={(v) => updateBase({ income: v })}
                  placeholder="0,00"
                  className="mt-0.5 w-full bg-transparent text-base font-semibold tabular-nums text-fg outline-none border-none p-0"
                />
              </div>
              <div className="col-span-2 rounded-xl border border-border bg-card p-3 xl:col-span-1">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-fg-muted">Reserva</p>
                  <span className="text-[11px] font-semibold tabular-nums text-accent">{reservePct}% · {fmtBRL(reserveAmt)}</span>
                </div>
                <input
                  type="range" min={0} max={50} step={1}
                  value={reservePct}
                  onChange={(e) => updateBase({ reservePct: Number(e.target.value) })}
                  aria-label="Percentual de reserva"
                  className="mt-2 w-full accent-primary"
                />
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-[11px] text-fg-muted">Planejado</p>
                <p className="text-base font-semibold tabular-nums text-fg">{fmtBRL(distributed)}</p>
                <p className="text-[11px] text-fg-muted">{plannedCount} categoria{plannedCount === 1 ? '' : 's'}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-[11px] text-fg-muted">{income > 0 ? (remaining < 0 ? 'Acima do disponível' : 'Livre para distribuir') : 'Gasto no mês'}</p>
                {income > 0 ? (
                  <>
                    <p className={cn('text-base font-semibold tabular-nums', remaining < 0 ? 'text-danger' : 'text-accent')}>{fmtBRL(Math.abs(remaining))}</p>
                    <p className="text-[11px] text-fg-muted tabular-nums">de {fmtBRL(available)} disponíveis</p>
                  </>
                ) : (
                  <>
                    <p className="text-base font-semibold tabular-nums text-fg">{fmtBRL(spentTotal)}</p>
                    <p className="text-[11px] text-fg-muted">informe a receita para distribuir</p>
                  </>
                )}
              </div>
              <div className="col-span-2 rounded-xl border border-border bg-card p-3 xl:col-span-1">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-fg-muted">Realizado</p>
                  {overCount > 0 && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-danger"><AlertTriangle size={11} /> {overCount} acima</span>
                  )}
                </div>
                <p className="text-base font-semibold tabular-nums text-fg">
                  {distributed > 0 ? `${((spentTotal / distributed) * 100).toFixed(0)}%` : '—'}
                </p>
                <ProgressBar percent={distributed > 0 ? (spentTotal / distributed) * 100 : 0} className="mt-1" />
              </div>
            </div>
          </div>

          {/* Category table */}
          <div className="flex-1 p-4 md:px-6 lg:min-h-0 lg:overflow-y-auto">
            {panelLoading && rows.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <Target size={24} strokeWidth={1.5} className="text-fg-disabled" />
                <p className="text-[13px] text-fg-muted">Nenhuma categoria de despesa cadastrada.</p>
                <a href="/categories" className="text-xs font-medium text-accent hover:underline">Cadastrar categorias</a>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-fg">Limites por categoria</p>
                  <div className="relative w-48 sm:w-60">
                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar categoria..."
                      className="field h-8 !pl-8 !text-[13px]"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-[13px]">
                    <thead>
                      <tr className="border-b border-border bg-surface-2 text-left text-xs text-fg-muted">
                        <th className="px-4 py-2.5 font-medium">Categoria</th>
                        <th className="px-3 py-2.5 font-medium text-right">Média 3m</th>
                        <th className="px-3 py-2.5 font-medium text-right">Gasto no mês</th>
                        <th className="px-3 py-2.5 font-medium w-44">Limite</th>
                        <th className="px-3 py-2.5 font-medium w-[22%]">Uso do limite</th>
                        <th className="px-3 py-2.5 font-medium text-right">% do plano</th>
                        <th className="px-4 py-2.5 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {visibleRows.map((r) => {
                        const spent = spentIn(r.categoryId, year, month);
                        const avg = avg3(r.categoryId);
                        const usePct = r.amount > 0 ? (spent / r.amount) * 100 : 0;
                        const over = r.amount > 0 && spent > r.amount;
                        const share = distributed > 0 ? (r.amount / distributed) * 100 : 0;
                        const savedAmt = Number(existingLimits.find((l) => l.categoryId === r.categoryId)?.amount ?? 0);
                        const changed = savedAmt !== r.amount;
                        return (
                          <tr key={r.categoryId} className="group hover:bg-hover transition-colors">
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                  style={{ backgroundColor: `color-mix(in srgb, ${r.color || 'var(--primary)'} 16%, transparent)`, color: r.color || 'var(--primary)' }}
                                >
                                  <LucideIcon name={r.icon || 'Tag'} size={15} />
                                </span>
                                <span className="truncate font-medium text-fg">{r.name}</span>
                                {changed && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" title="Alterado (não salvo)" />}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {avg > 0 ? (
                                <button
                                  onClick={() => setAmount(r.categoryId, Math.ceil(avg))}
                                  title="Usar a média como limite"
                                  className="rounded-md px-1.5 py-0.5 tabular-nums text-fg-2 hover:bg-primary-soft hover:text-accent transition-colors"
                                >
                                  {fmtBRL(avg)}
                                </button>
                              ) : <span className="text-fg-muted">—</span>}
                            </td>
                            <td className={cn('px-3 py-2.5 text-right tabular-nums', over ? 'font-medium text-danger' : spent > 0 ? 'text-fg' : 'text-fg-muted')}>
                              {fmtBRL(spent)}
                            </td>
                            <td className="px-3 py-2">
                              <CurrencyInput
                                value={r.amount}
                                onChange={(v) => setAmount(r.categoryId, v)}
                                placeholder="0,00"
                                className={cn('field h-8 !px-2.5 !text-[13px] text-right font-semibold tabular-nums', changed && '!border-warning/60')}
                              />
                            </td>
                            <td className="px-3 py-2.5">
                              {r.amount > 0 ? (
                                <div className="flex items-center gap-2">
                                  <ProgressBar percent={usePct} color={r.color} className="flex-1" />
                                  <span className={cn('w-10 text-right text-[11px] tabular-nums', over ? 'font-medium text-danger' : 'text-fg-muted')}>
                                    {usePct.toFixed(0)}%
                                  </span>
                                </div>
                              ) : <span className="text-[11px] text-fg-muted">Sem limite</span>}
                            </td>
                            <td className="px-3 py-2.5 text-right text-[11px] tabular-nums text-fg-muted">
                              {r.amount > 0 ? `${share.toFixed(0)}%` : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <button
                                onClick={() => setAmount(r.categoryId, 0)}
                                disabled={r.amount === 0}
                                title="Zerar limite"
                                aria-label="Zerar limite"
                                className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted opacity-0 transition hover:bg-danger-soft hover:text-danger group-hover:opacity-100 disabled:!opacity-0"
                              >
                                <RotateCcw size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {visibleRows.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-10 text-center text-[13px] text-fg-muted">Nenhuma categoria encontrada.</td></tr>
                      )}
                    </tbody>
                    {visibleRows.length > 0 && (
                      <tfoot>
                        <tr className="border-t border-border bg-surface-2 text-[13px]">
                          <td className="px-4 py-2.5 font-medium text-fg-2">Total</td>
                          <td />
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-fg">{fmtBRL(spentTotal)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-fg">{fmtBRL(distributed)}</td>
                          <td colSpan={3} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Save bar */}
          <div className="shrink-0 border-t border-border bg-card px-4 py-3 md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-fg-muted">
                {savedFlash
                  ? <span className="flex items-center gap-1.5 font-medium text-accent"><Check size={13} /> Planejamento salvo</span>
                  : dirty
                    ? <span className="flex items-center gap-1.5 font-medium text-warning"><span className="h-1.5 w-1.5 rounded-full bg-warning" /> Alterações não salvas</span>
                    : hasPlanning
                      ? <span className="flex items-center gap-1.5"><CalendarCheck size={13} /> Tudo salvo</span>
                      : 'Preencha os limites e salve para criar o planejamento.'}
              </p>
              <div className="flex gap-2">
                {dirty && (
                  <button onClick={discard} disabled={saving} className="btn btn-secondary">Descartar</button>
                )}
                <button
                  data-tour="planning-start-btn"
                  onClick={savePlanning}
                  disabled={saving || !dirty}
                  className="btn btn-primary"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {hasPlanning ? 'Salvar alterações' : 'Criar planejamento'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
