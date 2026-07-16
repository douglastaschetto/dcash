'use client';

import React, { useMemo, useState } from 'react';
import {
  CreditCard, ChevronLeft, ChevronRight, TrendingDown,
  CheckCircle, ChevronDown, Loader2, CheckCircle2,
  CalendarDays, Layers, TrendingUp, AlertTriangle,
} from 'lucide-react';
import { useInstallments } from '@/hooks/useInstallments';
import { AppLayout } from '@/components/app-layout';
import { cn } from '@/lib/utils';

/* ── Inline date helpers (no date-fns) ─────────────────────────────── */
const MONTHS_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];
const fmtMonthYear = (d: Date) =>
  `${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`;
const fmtDay = (d: Date) =>
  `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
const addMonths = (d: Date, n: number) => {
  const r = new Date(d); r.setMonth(r.getMonth() + n); return r;
};
const isSameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
/* ──────────────────────────────────────────────────────────────────── */

export default function InstallmentsPage() {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const { data: rawTransactions, isLoading } = useInstallments();

  /* ── Agrupamento por installmentGroup ────────────────────────── */
  const groupedInstallments = useMemo(() => {
    if (!rawTransactions) return [];
    const groups: Record<string, any> = {};

    rawTransactions.forEach((t) => {
      const cleanDescription = t.description
        .replace(/\s?\(\d+\/\d+\)/g, '')
        .replace(/\s?\d+\/\d+/g, '')
        .trim();

      const groupId = t.installmentGroup || cleanDescription;

      if (!groups[groupId]) {
        groups[groupId] = {
          id: groupId,
          description: cleanDescription,
          owner: t.user?.name || '—',
          installments: [],
        };
      }
      groups[groupId].installments.push(t);
    });

    return Object.values(groups).map((group: any) => {
      const sorted = [...group.installments].sort(
        (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      const remaining = sorted.filter((i: any) => !i.isPaid);
      const remainingValue = remaining.reduce((acc: number, i: any) => acc + Number(i.amount), 0);
      const totalInstallments = sorted[0]?.totalInstallments || sorted.length;
      const lastExpiration = sorted.length > 0 ? new Date(sorted[sorted.length - 1].date) : null;
      const firstDate = sorted.length > 0 ? new Date(sorted[0].date) : null;

      return {
        ...group,
        installments: sorted,
        remainingValue,
        totalInstallments,
        countRemaining: remaining.length,
        lastExpiration,
        firstDate,
      };
    }).sort((a, b) => b.remainingValue - a.remainingValue);
  }, [rawTransactions]);

  /* ── Insights / Dashboard ────────────────────────────────────── */
  const insights = useMemo(() => {
    if (!rawTransactions || rawTransactions.length === 0) return null;

    const monthData = (date: Date) => {
      const rows = rawTransactions.filter(t => isSameMonth(new Date(t.date), date));
      return {
        total: rows.reduce((s, t) => s + Number(t.amount), 0),
        count: rows.length,
      };
    };

    const endingGroups = (date: Date) => {
      const groups = groupedInstallments.filter(
        (g: any) => g.lastExpiration && isSameMonth(g.lastExpiration, date),
      );
      return {
        count: groups.length,
        value: groups.reduce((s: number, g: any) => {
          const last = g.installments[g.installments.length - 1];
          return s + (last ? Number(last.amount) : 0);
        }, 0),
      };
    };

    const newGroups = (date: Date) => {
      return groupedInstallments.filter(
        (g: any) => g.firstDate && isSameMonth(g.firstDate, date),
      ).length;
    };

    const current = monthData(currentDate);
    const next    = monthData(addMonths(currentDate, 1));
    const endingCurrent = endingGroups(currentDate);
    const endingNext    = endingGroups(addMonths(currentDate, 1));

    const totalOpen = groupedInstallments.filter((g: any) => g.countRemaining > 0).length;
    const totalValue = groupedInstallments.reduce((s: number, g: any) => s + g.remainingValue, 0);

    return {
      current, next,
      endingCurrent, endingNext,
      totalOpen,
      totalValue,
      newThisMonth: newGroups(currentDate),
      isRelief: current.total > next.total,
      diff: Math.abs(current.total - next.total),
    };
  }, [groupedInstallments, rawTransactions, currentDate]);

  const pageTitle = (
    <span className="text-4xl font-black italic tracking-tighter uppercase leading-none">
      Controle de <span className="text-emerald-500">Parcelamentos</span>
    </span>
  );
  const pageSubtitle = `${groupedInstallments.length} grupos · ${rawTransactions?.length ?? 0} parcelas totais`;

  if (isLoading) return (
    <AppLayout title={pageTitle} subtitle={pageSubtitle}>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="text-emerald-500 animate-spin" size={40} />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title={pageTitle} subtitle={pageSubtitle} noPadding>
      <div className="h-full flex flex-col overflow-hidden">

        {/* Frozen zone: month selector + KPI dashboard (does not scroll) */}
        <div className="shrink-0 px-6 lg:px-8 pt-6 pb-4 space-y-3">

        {/* ── Seletor de mês ─────────────────────────────────────── */}
        <div className="flex justify-end">
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl p-1">
            <button
              onClick={() => setCurrentDate(prev => addMonths(prev, -1))}
              className="p-2 hover:bg-emerald-500 hover:text-white rounded-lg transition-all text-zinc-600 dark:text-zinc-300"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="px-4 flex flex-col items-center min-w-[130px]">
              <span className="text-[8px] font-black uppercase text-emerald-500 tracking-widest">Período de Análise</span>
              <span className="text-[11px] font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-200 capitalize">
                {fmtMonthYear(currentDate)}
              </span>
            </div>
            <button
              onClick={() => setCurrentDate(prev => addMonths(prev, 1))}
              className="p-2 hover:bg-emerald-500 hover:text-white rounded-lg transition-all text-zinc-600 dark:text-zinc-300"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* ── Dashboard / Raio-X ─────────────────────────────────── */}
        {insights && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">

            {/* Total comprometido */}
            <div className="col-span-2 bg-zinc-900 dark:bg-zinc-800 text-white rounded-xl p-4 flex flex-col gap-2">
              <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Saldo devedor total</p>
              <p className="text-xl font-black italic tracking-tighter">
                R$ {insights.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <div className="flex gap-4 mt-auto">
                <div>
                  <p className="text-[8px] text-zinc-500 uppercase tracking-widest">Grupos em aberto</p>
                  <p className="text-sm font-black text-emerald-400">{insights.totalOpen}</p>
                </div>
                <div>
                  <p className="text-[8px] text-zinc-500 uppercase tracking-widest">Parcelas no mês</p>
                  <p className="text-sm font-black text-zinc-200">
                    R$ {insights.current.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Próximo mês */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 flex flex-col gap-1">
              <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Próximo mês</p>
              <p className="text-base font-black italic tracking-tighter text-zinc-900 dark:text-zinc-100">
                R$ {insights.next.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              {insights.isRelief ? (
                <div className="flex items-center gap-1 text-emerald-600 text-[9px] font-black">
                  <TrendingDown size={11} />
                  -{((insights.diff / (insights.current.total || 1)) * 100).toFixed(0)}% vs atual
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-500 text-[9px] font-black">
                  <TrendingUp size={11} />
                  +{((insights.diff / (insights.current.total || 1)) * 100).toFixed(0)}% vs atual
                </div>
              )}
              <p className="text-[8px] text-zinc-400 mt-auto">{insights.next.count} parcelas</p>
            </div>

            {/* Novos este mês */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4 flex flex-col gap-1">
              <p className="text-[8px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Novos este mês</p>
              <p className="text-xl font-black tracking-tighter text-blue-700 dark:text-blue-300">
                {insights.newThisMonth}
              </p>
              <p className="text-[8px] text-blue-500 mt-auto">parcelamentos iniciados</p>
            </div>

            {/* Encerrando este mês */}
            <div className={cn(
              'rounded-xl p-4 flex flex-col gap-1 border',
              insights.endingCurrent.count > 0
                ? 'bg-emerald-500 text-white border-emerald-400'
                : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700',
            )}>
              <div className="flex items-center gap-1.5">
                <CheckCircle size={12} className={insights.endingCurrent.count > 0 ? 'text-white' : 'text-zinc-400'} />
                <p className="text-[8px] font-black uppercase tracking-widest opacity-80">Quitando este mês</p>
              </div>
              <p className="text-xl font-black tracking-tighter">
                {insights.endingCurrent.count}
              </p>
              {insights.endingCurrent.count > 0 && (
                <p className="text-[9px] opacity-80 font-bold">
                  Libera R$ {insights.endingCurrent.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                </p>
              )}
            </div>

            {/* Encerrando próximo mês */}
            <div className={cn(
              'rounded-xl p-4 flex flex-col gap-1 border',
              insights.endingNext.count > 0
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700',
            )}>
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={12} className={insights.endingNext.count > 0 ? 'text-amber-600' : 'text-zinc-400'} />
                <p className="text-[8px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 opacity-80">
                  Quitando próx. mês
                </p>
              </div>
              <p className="text-xl font-black tracking-tighter text-amber-700 dark:text-amber-300">
                {insights.endingNext.count}
              </p>
              {insights.endingNext.count > 0 && (
                <p className="text-[9px] text-amber-600 dark:text-amber-400 font-bold">
                  Libera R$ {insights.endingNext.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                </p>
              )}
            </div>

            {/* Parcelas pagas / pendentes do mês */}
            <div className="col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
              <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-2">Raio-X do mês — {fmtMonthYear(currentDate)}</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[8px] text-zinc-400 uppercase tracking-widest">Comprometido</p>
                  <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                    R$ {insights.current.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] text-zinc-400 uppercase tracking-widest">Parcelas</p>
                  <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{insights.current.count}</p>
                </div>
                <div>
                  <p className="text-[8px] text-zinc-400 uppercase tracking-widest">Grupos ativos</p>
                  <p className="text-sm font-black text-emerald-600">{insights.totalOpen}</p>
                </div>
              </div>
            </div>

          </section>
        )}
        </div>

        {/* Scrollable zone: lista de grupos */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-6">
        <div className="space-y-3">
          <div className="flex items-center gap-4 px-1">
            <div className="h-px bg-zinc-200 dark:bg-zinc-700 flex-1" />
            <span className="text-[9px] font-black uppercase tracking-[0.5em] text-zinc-500">
              Parcelamentos Ativos
            </span>
            <div className="h-px bg-zinc-200 dark:bg-zinc-700 flex-1" />
          </div>

          {groupedInstallments.length === 0 && (
            <div className="flex flex-col items-center py-20 text-zinc-400">
              <Layers size={48} strokeWidth={1} className="mb-4 opacity-30" />
              <p className="text-xs font-black uppercase tracking-widest">Nenhum parcelamento ativo</p>
            </div>
          )}

          {groupedInstallments.map((group) => {
            const isExpanded = expandedGroupId === group.id;

            return (
              <div
                key={group.id}
                className={cn(
                  'border rounded-[1.5rem] transition-all duration-300 overflow-hidden',
                  isExpanded
                    ? 'bg-white dark:bg-zinc-900 border-emerald-400 shadow-xl shadow-emerald-500/10'
                    : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400',
                )}
              >
                <button
                  onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                  className="w-full p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'p-3 rounded-xl transition-all shrink-0',
                      isExpanded
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500',
                    )}>
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-lg italic uppercase tracking-tight leading-none text-zinc-900 dark:text-zinc-100">
                        {group.description}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-black bg-emerald-500/10 px-2 py-0.5 rounded text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                          {group.owner}
                        </span>
                        {group.countRemaining === 0 && (
                          <span className="text-[9px] font-black bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-700 uppercase tracking-widest">
                            Quitado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 ml-auto">
                    {/* Parcelas */}
                    <div className="hidden md:flex items-center gap-2 text-left">
                      <Layers size={14} className="text-emerald-500 opacity-60" />
                      <div>
                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Parcelas</p>
                        <p className="text-sm font-black text-zinc-800 dark:text-zinc-200">
                          {group.countRemaining}/{group.totalInstallments}
                        </p>
                      </div>
                    </div>

                    {/* Término */}
                    {group.lastExpiration && (
                      <div className="hidden md:flex items-center gap-2">
                        <CalendarDays size={14} className="text-emerald-500 opacity-60" />
                        <div>
                          <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Término</p>
                          <p className="text-sm font-black text-zinc-800 dark:text-zinc-200 capitalize">
                            {fmtMonthYear(group.lastExpiration)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Saldo devedor */}
                    <div className="text-right">
                      <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Saldo devedor</p>
                      <p className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                        R$ {group.remainingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <ChevronDown
                      size={16}
                      className={cn(
                        'text-zinc-400 transition-transform duration-300 shrink-0',
                        isExpanded && 'rotate-180 text-emerald-500',
                      )}
                    />
                  </div>
                </button>

                {/* Tabela expandida */}
                {isExpanded && (
                  <div className="px-6 pb-6">
                    <div className="rounded-[1.5rem] border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[9px] font-black tracking-widest uppercase text-left">
                          <tr>
                            <th className="px-5 py-3">Seq.</th>
                            <th className="px-5 py-3">Vencimento</th>
                            <th className="px-5 py-3">Valor</th>
                            <th className="px-5 py-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {group.installments.map((inst: any, idx: number) => (
                            <tr
                              key={inst.id}
                              className={cn(
                                'transition-colors',
                                inst.isPaid
                                  ? 'bg-emerald-50/50 dark:bg-emerald-950/10'
                                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
                              )}
                            >
                              <td className="px-5 py-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                {String(inst.installmentNumber || idx + 1).padStart(2, '0')}/{group.totalInstallments}
                              </td>
                              <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                                {fmtDay(new Date(inst.date))}
                              </td>
                              <td className="px-5 py-3 font-black text-zinc-900 dark:text-zinc-100">
                                R$ {Number(inst.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex justify-center">
                                  {inst.isPaid ? (
                                    <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full text-[9px] font-black uppercase">
                                      <CheckCircle2 size={11} /> Pago
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1.5 text-zinc-500 border border-zinc-200 dark:border-zinc-700 px-3 py-1 rounded-full text-[9px] font-black uppercase">
                                      Pendente
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </AppLayout>
  );
}
