'use client';

import React, { useMemo, useState } from 'react';
import {
  CreditCard, ChevronLeft, ChevronRight, TrendingDown, TrendingUp,
  ChevronDown, Loader2, CheckCircle2, CalendarDays, Layers,
  AlertTriangle, Search, Wallet, CalendarClock, Sparkles, Check,
} from '@/components/ui/icons';
import { useInstallments, InstallmentTransaction } from '@/hooks/useInstallments';
import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui';
import api from '@/services/api';
import { cn, parseDateOnly } from '@/lib/utils';

/* ── Inline date helpers (no date-fns) ─────────────────────────────── */
const MONTHS_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];
const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const fmtMonthYear = (d: Date) => `${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`;
const fmtShortMonthYear = (d: Date) => `${MONTHS_SHORT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
const fmtDay = (d: Date) =>
  `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const isSameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
const fmtBRL = (n: number) =>
  `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtCompact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : n.toFixed(0);
/* ──────────────────────────────────────────────────────────────────── */

type GroupStatus = 'done' | 'overdue' | 'due' | 'ok';
type Filter = 'active' | 'month' | 'overdue' | 'done' | 'all';
type Sort = 'balance' | 'end' | 'name';

type Group = {
  id: string;
  description: string;
  owner: string;
  installments: InstallmentTransaction[];
  totalInstallments: number;
  paidCount: number;
  countRemaining: number;
  remainingValue: number;
  monthlyValue: number;
  nextPending: InstallmentTransaction | null;
  overdueCount: number;
  monthInstallment: InstallmentTransaction | null;
  lastExpiration: Date | null;
  firstDate: Date | null;
  status: GroupStatus;
};

const STATUS_META: Record<GroupStatus, { label: string; tone: 'success' | 'danger' | 'warning' | 'neutral' }> = {
  done:    { label: 'Quitado',          tone: 'success' },
  overdue: { label: 'Parcela vencida',  tone: 'danger' },
  due:     { label: 'Parcela do mês',   tone: 'warning' },
  ok:      { label: 'Em dia',           tone: 'neutral' },
};

export default function InstallmentsPage() {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('active');
  const [sort, setSort] = useState<Sort>('balance');
  const [search, setSearch] = useState('');
  const [paying, setPaying] = useState<Set<string>>(new Set());
  const { data: rawTransactions, isLoading, refresh } = useInstallments();

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const thisMonth = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  const isCurrentMonth = isSameMonth(currentDate, thisMonth);

  /* ── Agrupamento por installmentGroup ────────────────────────── */
  const groups: Group[] = useMemo(() => {
    if (!rawTransactions) return [];
    const map: Record<string, { id: string; description: string; owner: string; installments: InstallmentTransaction[] }> = {};

    rawTransactions.forEach((t) => {
      const cleanDescription = t.description
        .replace(/\s?\(\d+\/\d+\)/g, '')
        .replace(/\s?\d+\/\d+/g, '')
        .trim();
      const groupId = t.installmentGroup || cleanDescription;
      if (!map[groupId]) {
        map[groupId] = { id: groupId, description: cleanDescription, owner: t.user?.name || '—', installments: [] };
      }
      map[groupId].installments.push(t);
    });

    return Object.values(map).map((group) => {
      const sorted = [...group.installments].sort(
        (a, b) => parseDateOnly(a.date).getTime() - parseDateOnly(b.date).getTime(),
      );
      const remaining = sorted.filter((i) => !i.isPaid);
      const remainingValue = remaining.reduce((acc, i) => acc + Number(i.amount), 0);
      const totalInstallments = sorted[0]?.totalInstallments || sorted.length;
      const nextPending = remaining[0] ?? null;
      const overdueCount = remaining.filter((i) => parseDateOnly(i.date) < today).length;
      const monthInstallment = sorted.find((i) => isSameMonth(parseDateOnly(i.date), currentDate)) ?? null;

      const status: GroupStatus =
        remaining.length === 0 ? 'done'
          : overdueCount > 0 ? 'overdue'
          : monthInstallment && !monthInstallment.isPaid ? 'due'
          : 'ok';

      return {
        ...group,
        installments: sorted,
        totalInstallments,
        paidCount: sorted.length - remaining.length,
        countRemaining: remaining.length,
        remainingValue,
        monthlyValue: Number((nextPending ?? sorted[sorted.length - 1])?.amount ?? 0),
        nextPending,
        overdueCount,
        monthInstallment,
        lastExpiration: sorted.length > 0 ? parseDateOnly(sorted[sorted.length - 1].date) : null,
        firstDate: sorted.length > 0 ? parseDateOnly(sorted[0].date) : null,
        status,
      };
    });
  }, [rawTransactions, currentDate, today]);

  /* ── Insights ────────────────────────────────────────────────── */
  const insights = useMemo(() => {
    if (!rawTransactions || rawTransactions.length === 0) return null;

    const monthData = (date: Date) => {
      const rows = rawTransactions.filter((t) => isSameMonth(parseDateOnly(t.date), date));
      const paid = rows.filter((t) => t.isPaid);
      return {
        total: rows.reduce((s, t) => s + Number(t.amount), 0),
        count: rows.length,
        paidTotal: paid.reduce((s, t) => s + Number(t.amount), 0),
        paidCount: paid.length,
      };
    };

    const endingGroups = (date: Date) => {
      const list = groups.filter((g) => g.lastExpiration && isSameMonth(g.lastExpiration, date));
      return {
        count: list.length,
        value: list.reduce((s, g) => s + Number(g.installments[g.installments.length - 1]?.amount ?? 0), 0),
      };
    };

    const current = monthData(currentDate);
    const next = monthData(addMonths(currentDate, 1));
    const overdueRows = rawTransactions.filter((t) => !t.isPaid && parseDateOnly(t.date) < today);

    return {
      current,
      next,
      endingCurrent: endingGroups(currentDate),
      endingNext: endingGroups(addMonths(currentDate, 1)),
      totalOpen: groups.filter((g) => g.countRemaining > 0).length,
      totalValue: groups.reduce((s, g) => s + g.remainingValue, 0),
      totalPaidValue: rawTransactions.filter((t) => t.isPaid).reduce((s, t) => s + Number(t.amount), 0),
      newThisMonth: groups.filter((g) => g.firstDate && isSameMonth(g.firstDate, currentDate)).length,
      overdueCount: overdueRows.length,
      overdueValue: overdueRows.reduce((s, t) => s + Number(t.amount), 0),
      diffPct: current.total > 0 ? ((next.total - current.total) / current.total) * 100 : null,
    };
  }, [groups, rawTransactions, currentDate, today]);

  /* ── Próximos 12 meses (comprometimento futuro) ──────────────── */
  const timeline = useMemo(() => {
    if (!rawTransactions) return [];
    const start = addMonths(thisMonth, -1);
    return Array.from({ length: 12 }, (_, i) => {
      const month = addMonths(start, i);
      const value = rawTransactions
        .filter((t) => isSameMonth(parseDateOnly(t.date), month))
        .reduce((s, t) => s + Number(t.amount), 0);
      return { month, value };
    });
  }, [rawTransactions, thisMonth]);
  const timelineMax = Math.max(...timeline.map((t) => t.value), 0);

  /* ── Quitações futuras (alívio no orçamento) ─────────────────── */
  const upcomingPayoffs = useMemo(
    () => groups
      .filter((g) => g.countRemaining > 0 && g.lastExpiration)
      .sort((a, b) => a.lastExpiration!.getTime() - b.lastExpiration!.getTime())
      .slice(0, 6),
    [groups],
  );

  /* ── Lista filtrada ──────────────────────────────────────────── */
  const visibleGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups
      .filter((g) => {
        if (q && !g.description.toLowerCase().includes(q) && !g.owner.toLowerCase().includes(q)) return false;
        switch (filter) {
          case 'active':  return g.countRemaining > 0;
          case 'month':   return !!g.monthInstallment;
          case 'overdue': return g.overdueCount > 0;
          case 'done':    return g.countRemaining === 0;
          default:        return true;
        }
      })
      .sort((a, b) => {
        if (sort === 'name') return a.description.localeCompare(b.description, 'pt-BR');
        if (sort === 'end') return (a.lastExpiration?.getTime() ?? 0) - (b.lastExpiration?.getTime() ?? 0);
        return b.remainingValue - a.remainingValue;
      });
  }, [groups, filter, sort, search]);

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'active',  label: 'Ativos',          count: groups.filter((g) => g.countRemaining > 0).length },
    { key: 'month',   label: 'Neste mês',       count: groups.filter((g) => g.monthInstallment).length },
    { key: 'overdue', label: 'Vencidos',        count: groups.filter((g) => g.overdueCount > 0).length },
    { key: 'done',    label: 'Quitados',        count: groups.filter((g) => g.countRemaining === 0).length },
    { key: 'all',     label: 'Todos',           count: groups.length },
  ];

  /* ── Ações ───────────────────────────────────────────────────── */
  const markPaid = async (ids: string[], confirmMsg?: string) => {
    if (ids.length === 0) return;
    if (confirmMsg && !confirm(confirmMsg)) return;
    setPaying((prev) => new Set([...prev, ...ids]));
    try {
      if (ids.length === 1) await api.patch(`/transactions/${ids[0]}/paid`);
      else await api.patch('/transactions/mark-paid', { ids });
      await refresh();
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Não foi possível marcar como paga.');
    } finally {
      setPaying((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const pageSubtitle = `${groups.length} grupo${groups.length === 1 ? '' : 's'} · ${rawTransactions?.length ?? 0} parcelas no total`;

  if (isLoading && !rawTransactions) return (
    <AppLayout title="Parcelamentos" subtitle={pageSubtitle}>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="text-accent animate-spin" size={28} />
      </div>
    </AppLayout>
  );

  const monthPaidPct = insights && insights.current.total > 0
    ? Math.round((insights.current.paidTotal / insights.current.total) * 100)
    : 0;
  const totalPaidPct = insights && insights.totalValue + insights.totalPaidValue > 0
    ? Math.round((insights.totalPaidValue / (insights.totalValue + insights.totalPaidValue)) * 100)
    : 0;

  return (
    <AppLayout title="Parcelamentos" subtitle={pageSubtitle} noPadding>
      <div className="h-full overflow-y-auto">
      <div className="w-full p-4 md:p-6 space-y-4">

        {/* ── Toolbar: mês ───────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-fg">Visão de {fmtMonthYear(currentDate)}</p>
            <p className="text-xs text-fg-muted">Parcelas, quitações e comprometimento futuro</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {!isCurrentMonth && (
              <button onClick={() => setCurrentDate(thisMonth)} className="btn btn-secondary h-9">
                Mês atual
              </button>
            )}
            <div data-tour="installments-month-nav" className="flex items-center rounded-lg border border-border bg-card p-0.5">
              <button onClick={() => setCurrentDate((p) => addMonths(p, -1))} aria-label="Mês anterior"
                className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-fg transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[128px] px-2 text-center text-[13px] font-medium text-fg">
                {fmtMonthYear(currentDate)}
              </span>
              <button onClick={() => setCurrentDate((p) => addMonths(p, 1))} aria-label="Próximo mês"
                className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-fg transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── KPIs ───────────────────────────────────────────────── */}
        {insights && (
          <section data-tour="installments-insights" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* Saldo devedor */}
            <div className="hero-card relative overflow-hidden rounded-2xl p-5">
              <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full border border-white/10" />
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-[13px] font-medium text-white/70">
                  <Wallet size={15} strokeWidth={1.75} /> Saldo devedor total
                </p>
                <span className="text-[11px] text-white/50">{insights.totalOpen} em aberto</span>
              </div>
              <p className="mt-4 text-[26px] leading-none font-semibold tracking-tight tabular-nums">{fmtBRL(insights.totalValue)}</p>
              <div className="mt-4 h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${totalPaidPct}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-white/60 tabular-nums">{totalPaidPct}% já pago · {fmtBRL(insights.totalPaidValue)}</p>
            </div>

            {/* Parcelas do mês */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-medium text-fg-2">Parcelas de {MONTHS_PT[currentDate.getMonth()].toLowerCase()}</p>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-fg-muted">
                  <CalendarDays size={15} strokeWidth={1.75} />
                </span>
              </div>
              <p className="mt-3 text-[26px] leading-none font-semibold tracking-tight tabular-nums text-fg">{fmtBRL(insights.current.total)}</p>
              <div className="mt-3 h-1.5 rounded-full bg-track overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${monthPaidPct}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-fg-muted tabular-nums">
                {insights.current.paidCount} de {insights.current.count} paga{insights.current.count === 1 ? '' : 's'} · {monthPaidPct}%
              </p>
            </div>

            {/* Próximo mês */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-medium text-fg-2">Próximo mês</p>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-fg-muted">
                  <CalendarClock size={15} strokeWidth={1.75} />
                </span>
              </div>
              <p className="mt-3 text-[26px] leading-none font-semibold tracking-tight tabular-nums text-fg">{fmtBRL(insights.next.total)}</p>
              <div className="mt-3 flex items-center gap-2 min-h-5">
                {insights.diffPct === null || Math.round(insights.diffPct) === 0 ? (
                  <span className="inline-flex items-center rounded-md border border-border px-1.5 py-0.5 text-[11px] font-medium text-fg-muted">= 0%</span>
                ) : insights.diffPct < 0 ? (
                  <span className="inline-flex items-center gap-0.5 rounded-md border border-primary-border bg-primary-soft px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-accent">
                    <TrendingDown size={11} /> {Math.abs(insights.diffPct).toFixed(0)}%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 rounded-md border border-danger/30 bg-danger-soft px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-danger">
                    <TrendingUp size={11} /> {insights.diffPct.toFixed(0)}%
                  </span>
                )}
                <span className="text-[11px] text-fg-muted">{insights.next.count} parcela{insights.next.count === 1 ? '' : 's'} · vs {MONTHS_PT[currentDate.getMonth()].toLowerCase()}</span>
              </div>
            </div>

            {/* Quitações / vencidas */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-medium text-fg-2">Quitações</p>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-accent">
                  <Sparkles size={15} strokeWidth={1.75} />
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[26px] leading-none font-semibold tabular-nums text-fg">{insights.endingCurrent.count}</p>
                  <p className="mt-1.5 text-[11px] text-fg-muted">neste mês</p>
                </div>
                <div>
                  <p className="text-[26px] leading-none font-semibold tabular-nums text-fg">{insights.endingNext.count}</p>
                  <p className="mt-1.5 text-[11px] text-fg-muted">no próximo</p>
                </div>
              </div>
              {insights.overdueCount > 0 ? (
                <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-danger">
                  <AlertTriangle size={11} /> {insights.overdueCount} vencida{insights.overdueCount === 1 ? '' : 's'} · {fmtBRL(insights.overdueValue)}
                </p>
              ) : insights.endingCurrent.count + insights.endingNext.count > 0 ? (
                <p className="mt-2 text-[11px] font-medium text-accent">
                  Libera {fmtBRL(insights.endingCurrent.value + insights.endingNext.value)}/mês
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-fg-muted">{insights.newThisMonth} novo{insights.newThisMonth === 1 ? '' : 's'} neste mês</p>
              )}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">

          {/* ═══════════════ Lista de grupos ═══════════════ */}
          <div data-tour="installments-groups-list" className="min-w-0 rounded-2xl border border-border bg-card overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex rounded-lg border border-border bg-surface-2 p-0.5 overflow-x-auto scrollbar-none" role="tablist">
                {filters.map((f) => (
                  <button
                    key={f.key}
                    role="tab"
                    aria-selected={filter === f.key}
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      'flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 text-xs font-medium transition-colors',
                      filter === f.key ? 'bg-card text-fg border-border shadow-xs' : 'text-fg-muted hover:text-fg border-transparent',
                    )}
                  >
                    {f.label}
                    <span className={cn(
                      'rounded px-1 text-[10px] tabular-nums',
                      f.key === 'overdue' && f.count > 0 ? 'bg-danger-soft text-danger' : 'text-fg-muted',
                    )}>
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 lg:w-56 lg:flex-none">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar parcelamento..."
                    className="field h-9 !pl-8 !text-[13px]"
                  />
                </div>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  aria-label="Ordenar por"
                  className="field h-9 !w-auto !text-[13px]"
                >
                  <option value="balance">Maior saldo</option>
                  <option value="end">Término mais próximo</option>
                  <option value="name">Nome</option>
                </select>
              </div>
            </div>

            {/* Lista */}
            {visibleGroups.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <Layers size={24} strokeWidth={1.5} className="text-fg-disabled" />
                <p className="text-[13px] text-fg-muted">
                  {groups.length === 0 ? 'Nenhum parcelamento cadastrado' : 'Nenhum parcelamento neste filtro'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {visibleGroups.map((group) => {
                  const isExpanded = expandedGroupId === group.id;
                  const pct = group.totalInstallments > 0 ? (group.paidCount / group.totalInstallments) * 100 : 0;
                  const meta = STATUS_META[group.status];
                  const pendingIds = group.installments.filter((i) => !i.isPaid).map((i) => i.id);
                  const monthPending = group.monthInstallment && !group.monthInstallment.isPaid ? group.monthInstallment : null;
                  const overdueIds = group.installments
                    .filter((i) => !i.isPaid && parseDateOnly(i.date) < today)
                    .map((i) => i.id);

                  return (
                    <li key={group.id} className={cn('transition-colors', isExpanded && 'bg-surface-2/50')}>
                      <button
                        onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                        aria-expanded={isExpanded}
                        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-4 text-left hover:bg-hover transition-colors md:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_auto_auto]"
                      >
                        {/* Ícone */}
                        <span className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-xl border',
                          group.status === 'done' ? 'border-primary-border bg-primary-soft text-accent' : 'border-border bg-surface-2 text-fg-muted',
                        )}>
                          {group.status === 'done' ? <CheckCircle2 size={18} strokeWidth={1.75} /> : <CreditCard size={18} strokeWidth={1.75} />}
                        </span>

                        {/* Nome + progresso */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="truncate text-sm font-semibold text-fg">{group.description}</p>
                            <Badge tone={meta.tone} className="shrink-0">{meta.label}</Badge>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 max-w-56 rounded-full bg-track overflow-hidden">
                              <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="shrink-0 text-[11px] tabular-nums text-fg-muted">
                              {group.paidCount}/{group.totalInstallments} pagas
                            </span>
                          </div>
                          <p className="mt-1 truncate text-[11px] text-fg-muted">{group.owner}</p>
                        </div>

                        {/* Detalhes (desktop) */}
                        <div className="hidden md:grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[11px] text-fg-muted">Parcela</p>
                            <p className="text-[13px] font-medium tabular-nums text-fg">{fmtBRL(group.monthlyValue)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-fg-muted">{group.countRemaining > 0 ? 'Próxima' : 'Término'}</p>
                            <p className={cn('text-[13px] font-medium tabular-nums', group.overdueCount > 0 ? 'text-danger' : 'text-fg')}>
                              {group.nextPending
                                ? fmtDay(parseDateOnly(group.nextPending.date))
                                : group.lastExpiration ? fmtShortMonthYear(group.lastExpiration) : '—'}
                            </p>
                          </div>
                        </div>

                        {/* Saldo */}
                        <div className="text-right">
                          <p className="text-[11px] text-fg-muted">Saldo devedor</p>
                          <p className={cn('text-base font-semibold tabular-nums tracking-tight', group.countRemaining === 0 ? 'text-fg-muted' : 'text-fg')}>
                            {fmtBRL(group.remainingValue)}
                          </p>
                          {group.lastExpiration && group.countRemaining > 0 && (
                            <p className="text-[11px] text-fg-muted">até {fmtShortMonthYear(group.lastExpiration)}</p>
                          )}
                        </div>

                        <ChevronDown
                          size={16}
                          className={cn('hidden md:block text-fg-muted transition-transform duration-200', isExpanded && 'rotate-180 text-fg')}
                        />
                      </button>

                      {/* ── Detalhe expandido ── */}
                      {isExpanded && (
                        <div className="space-y-4 px-4 pb-5 md:pl-[72px]">
                          {/* Linha do tempo das parcelas */}
                          <div>
                            <p className="mb-2 text-[11px] font-medium text-fg-muted">Linha do tempo</p>
                            <div className="flex flex-wrap gap-1.5">
                              {group.installments.map((inst, idx) => {
                                const d = parseDateOnly(inst.date);
                                const overdue = !inst.isPaid && d < today;
                                const selected = isSameMonth(d, currentDate);
                                return (
                                  <span
                                    key={inst.id}
                                    title={`${inst.installmentNumber || idx + 1}ª · ${fmtDay(d)} · ${fmtBRL(Number(inst.amount))}${inst.isPaid ? ' · paga' : overdue ? ' · vencida' : ''}`}
                                    className={cn(
                                      'flex h-9 min-w-11 flex-col items-center justify-center rounded-md border px-1.5 text-[10px] leading-tight tabular-nums',
                                      inst.isPaid
                                        ? 'border-primary-border bg-primary-soft text-accent'
                                        : overdue
                                          ? 'border-danger/30 bg-danger-soft text-danger'
                                          : 'border-border bg-card text-fg-muted',
                                      selected && 'ring-2 ring-primary ring-offset-1 ring-offset-card',
                                    )}
                                  >
                                    <span className="font-semibold">{inst.installmentNumber || idx + 1}</span>
                                    <span className="opacity-80">{fmtShortMonthYear(d)}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          {/* Ações rápidas */}
                          {pendingIds.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {overdueIds.length > 0 && (
                                <button
                                  onClick={() => markPaid(overdueIds, overdueIds.length > 1 ? `Marcar ${overdueIds.length} parcelas vencidas como pagas?` : undefined)}
                                  disabled={overdueIds.some((id) => paying.has(id))}
                                  className="btn btn-primary"
                                >
                                  <Check size={14} /> Pagar vencida{overdueIds.length > 1 ? 's' : ''} ({overdueIds.length})
                                </button>
                              )}
                              {monthPending && !overdueIds.includes(monthPending.id) && (
                                <button
                                  onClick={() => markPaid([monthPending.id])}
                                  disabled={paying.has(monthPending.id)}
                                  className={cn('btn', overdueIds.length > 0 ? 'btn-secondary' : 'btn-primary')}
                                >
                                  {paying.has(monthPending.id) ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                  Pagar parcela de {MONTHS_PT[currentDate.getMonth()].toLowerCase()}
                                </button>
                              )}
                              {pendingIds.length > 1 && (
                                <button
                                  onClick={() => markPaid(
                                    pendingIds,
                                    `Quitar "${group.description}"? As ${pendingIds.length} parcelas restantes (${fmtBRL(group.remainingValue)}) serão marcadas como pagas.`,
                                  )}
                                  disabled={pendingIds.some((id) => paying.has(id))}
                                  className="btn btn-secondary"
                                >
                                  <Sparkles size={14} /> Quitar restantes · {fmtBRL(group.remainingValue)}
                                </button>
                              )}
                            </div>
                          )}

                          {/* Tabela de parcelas */}
                          <div className="overflow-x-auto rounded-xl border border-border bg-card">
                            <table className="w-full min-w-[480px] text-[13px]">
                              <thead>
                                <tr className="border-b border-border bg-surface-2 text-left text-xs text-fg-muted">
                                  <th className="px-4 py-2.5 font-medium">Parcela</th>
                                  <th className="px-3 py-2.5 font-medium">Vencimento</th>
                                  <th className="px-3 py-2.5 font-medium text-right">Valor</th>
                                  <th className="px-3 py-2.5 font-medium">Status</th>
                                  <th className="px-4 py-2.5 font-medium text-right">Ação</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {group.installments.map((inst, idx) => {
                                  const d = parseDateOnly(inst.date);
                                  const overdue = !inst.isPaid && d < today;
                                  const selected = isSameMonth(d, currentDate);
                                  return (
                                    <tr key={inst.id} className={cn('transition-colors hover:bg-hover', selected && 'bg-primary-soft/40')}>
                                      <td className="px-4 py-2.5 font-medium tabular-nums text-fg">
                                        {String(inst.installmentNumber || idx + 1).padStart(2, '0')}/{group.totalInstallments}
                                      </td>
                                      <td className={cn('px-3 py-2.5 tabular-nums', overdue ? 'text-danger' : 'text-fg-2')}>{fmtDay(d)}</td>
                                      <td className={cn('px-3 py-2.5 text-right font-semibold tabular-nums', inst.isPaid ? 'text-fg-muted' : 'text-fg')}>
                                        {fmtBRL(Number(inst.amount))}
                                      </td>
                                      <td className="px-3 py-2.5">
                                        {inst.isPaid
                                          ? <Badge tone="success"><CheckCircle2 size={11} /> Paga</Badge>
                                          : overdue
                                            ? <Badge tone="danger"><AlertTriangle size={11} /> Vencida</Badge>
                                            : <Badge>Pendente</Badge>}
                                      </td>
                                      <td className="px-4 py-2.5 text-right">
                                        {!inst.isPaid && (
                                          <button
                                            onClick={() => markPaid([inst.id])}
                                            disabled={paying.has(inst.id)}
                                            className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium text-fg-2 hover:border-primary-border hover:bg-primary-soft hover:text-accent disabled:opacity-50 transition-colors"
                                          >
                                            {paying.has(inst.id) ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                            Marcar paga
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* ═══════════════ Coluna lateral ═══════════════ */}
          <div className="space-y-4 min-w-0">
            {/* Comprometimento futuro */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm font-semibold text-fg">Comprometimento mensal</p>
              <p className="mt-0.5 text-xs text-fg-muted">Clique em um mês para analisá-lo</p>
              <div className="mt-5 flex h-36 items-end gap-[3px]">
                {timeline.map((t) => {
                  const h = timelineMax > 0 ? (t.value / timelineMax) * 100 : 0;
                  const selected = isSameMonth(t.month, currentDate);
                  return (
                    <button
                      key={t.month.toISOString()}
                      onClick={() => setCurrentDate(t.month)}
                      title={`${fmtMonthYear(t.month)}: ${fmtBRL(t.value)}`}
                      className="group flex h-full flex-1 flex-col items-center justify-end gap-1 min-w-0"
                    >
                      {selected && t.value > 0 && (
                        <span className="text-[10px] font-semibold tabular-nums text-fg">{fmtCompact(t.value)}</span>
                      )}
                      <span
                        className={cn('w-full rounded-t-md transition-colors', !selected && 'bg-chart-bar group-hover:bg-chart-bar-hover')}
                        style={{
                          height: t.value > 0 ? `max(${h * 0.82}%, 3px)` : '2px',
                          ...(selected && {
                            background: 'linear-gradient(to bottom, var(--primary-text), color-mix(in srgb, var(--primary) 18%, transparent))',
                          }),
                        }}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-[3px]">
                {timeline.map((t) => (
                  <span key={t.month.toISOString()} className={cn(
                    'flex-1 min-w-0 text-center text-[10px]',
                    isSameMonth(t.month, currentDate) ? 'font-semibold text-fg' : 'text-fg-muted',
                  )}>
                    {MONTHS_SHORT[t.month.getMonth()].charAt(0)}
                  </span>
                ))}
              </div>
            </div>

            {/* Próximas quitações */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles size={16} strokeWidth={1.75} className="text-accent" />
                <p className="text-sm font-semibold text-fg">Próximas quitações</p>
              </div>
              {upcomingPayoffs.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-fg-muted">Nenhum parcelamento em aberto</p>
              ) : (
                <ol className="relative space-y-3 before:absolute before:left-[5px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-border">
                  {upcomingPayoffs.map((g) => (
                    <li key={g.id} className="relative flex items-start gap-3">
                      <span className="relative z-10 mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-card bg-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[13px] font-medium text-fg">{g.description}</p>
                          <p className="shrink-0 text-[11px] text-fg-muted">{fmtShortMonthYear(g.lastExpiration!)}</p>
                        </div>
                        <p className="text-[11px] text-fg-muted">
                          Libera <span className="font-medium text-accent">{fmtBRL(g.monthlyValue)}/mês</span> · faltam {g.countRemaining}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </AppLayout>
  );
}
