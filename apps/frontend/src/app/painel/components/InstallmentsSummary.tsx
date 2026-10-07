'use client';

import Link from 'next/link';
import { AlertTriangle, Layers, Sparkles, TrendingDown, TrendingUp } from '@/components/ui/icons';
import { cn, parseDateOnly } from '@/lib/utils';
import type { InstallmentTransaction } from '@/hooks/useInstallments';

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const brl = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

type Group = { id: string; description: string; remaining: number; remainingValue: number; lastAmount: number; last: Date | null };

/**
 * Compact version of the /installments KPIs for the painel: debt balance,
 * this month / next month installments, payoffs and the next three payoffs.
 */
export function InstallmentsSummary({ rows }: { rows: InstallmentTransaction[] }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const map = new Map<string, InstallmentTransaction[]>();
  rows.forEach((t) => {
    const clean = t.description.replace(/\s?\(\d+\/\d+\)/g, '').replace(/\s?\d+\/\d+/g, '').trim();
    const id = t.installmentGroup || clean;
    map.set(id, [...(map.get(id) ?? []), { ...t, description: clean }]);
  });
  const groups: Group[] = Array.from(map.entries()).map(([id, list]) => {
    const sorted = [...list].sort((a, b) => parseDateOnly(a.date).getTime() - parseDateOnly(b.date).getTime());
    const open = sorted.filter((i) => !i.isPaid);
    return {
      id, description: sorted[0]?.description ?? '—', remaining: open.length,
      remainingValue: open.reduce((s, i) => s + Number(i.amount), 0),
      lastAmount: Number(sorted[sorted.length - 1]?.amount ?? 0),
      last: sorted.length ? parseDateOnly(sorted[sorted.length - 1].date) : null,
    };
  });

  const month = (d: Date) => {
    const r = rows.filter((t) => sameMonth(parseDateOnly(t.date), d));
    const paid = r.filter((t) => t.isPaid);
    return { total: r.reduce((s, t) => s + Number(t.amount), 0), count: r.length, paid: paid.length };
  };
  const cur = month(thisMonth);
  const nxt = month(nextMonth);
  const diff = cur.total > 0 ? ((nxt.total - cur.total) / cur.total) * 100 : null;
  const open = groups.filter((g) => g.remaining > 0);
  const debt = groups.reduce((s, g) => s + g.remainingValue, 0);
  const paidValue = rows.filter((t) => t.isPaid).reduce((s, t) => s + Number(t.amount), 0);
  const paidPct = debt + paidValue > 0 ? Math.round((paidValue / (debt + paidValue)) * 100) : 0;
  const monthPct = cur.count ? Math.round((cur.paid / cur.count) * 100) : 0;
  const ending = (d: Date) => groups.filter((g) => g.last && sameMonth(g.last, d));
  const endCur = ending(thisMonth);
  const endNext = ending(nextMonth);
  const overdue = rows.filter((t) => !t.isPaid && parseDateOnly(t.date) < today);
  const overdueValue = overdue.reduce((s, t) => s + Number(t.amount), 0);
  const payoffs = open.filter((g) => g.last).sort((a, b) => a.last!.getTime() - b.last!.getTime()).slice(0, 3);

  const kpi = 'rounded-xl border border-border bg-surface-2/60 p-3';
  const label = 'text-[10px] font-medium uppercase tracking-wide text-fg-muted';
  const value = 'mt-1 text-base font-semibold leading-none tabular-nums text-fg';

  return (
    <div className="rounded-2xl border border-border bg-card p-5" data-tour="painel-installments">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={16} strokeWidth={1.75} className="text-fg-muted" />
          <p className="text-[15px] font-semibold text-fg">Raio-X parcelamentos</p>
        </div>
        <Link href="/installments" className="text-[13px] font-medium text-accent hover:underline">Ver</Link>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-fg-muted">Nenhum parcelamento. Seu eu do futuro agradece.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className={kpi}>
              <p className={label}>Saldo devedor</p>
              <p className={value}>{brl(debt)}</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-track"><div className="h-full rounded-full bg-primary" style={{ width: `${paidPct}%` }} /></div>
              <p className="mt-1 text-[10px] text-fg-muted">{open.length} em aberto · {paidPct}% pago</p>
            </div>
            <div className={kpi}>
              <p className={label}>Parcelas de {MONTHS[thisMonth.getMonth()]}</p>
              <p className={value}>{brl(cur.total)}</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-track"><div className="h-full rounded-full bg-primary" style={{ width: `${monthPct}%` }} /></div>
              <p className="mt-1 text-[10px] text-fg-muted">{cur.paid} de {cur.count} paga{cur.count === 1 ? '' : 's'}</p>
            </div>
            <div className={kpi}>
              <p className={label}>Próximo mês</p>
              <p className={value}>{brl(nxt.total)}</p>
              <p className="mt-2 flex items-center gap-1 text-[10px] text-fg-muted">
                {diff === null || Math.round(diff) === 0 ? <span>= 0%</span>
                  : diff < 0 ? <span className="flex items-center gap-0.5 font-semibold text-accent"><TrendingDown size={10} /> {Math.abs(diff).toFixed(0)}%</span>
                  : <span className="flex items-center gap-0.5 font-semibold text-danger"><TrendingUp size={10} /> {diff.toFixed(0)}%</span>}
                · {nxt.count} parcela{nxt.count === 1 ? '' : 's'}
              </p>
            </div>
            <div className={kpi}>
              <p className={cn(label, 'flex items-center gap-1')}><Sparkles size={10} className="text-accent" /> Quitações</p>
              <p className={value}>{endCur.length} <span className="text-[10px] font-normal text-fg-muted">neste mês</span> · {endNext.length} <span className="text-[10px] font-normal text-fg-muted">no próximo</span></p>
              {overdue.length > 0 ? (
                <p className="mt-2 flex items-center gap-1 text-[10px] font-medium text-danger"><AlertTriangle size={10} /> {overdue.length} vencida{overdue.length === 1 ? '' : 's'} · {brl(overdueValue)}</p>
              ) : endCur.length + endNext.length > 0 ? (
                <p className="mt-2 text-[10px] font-medium text-accent">Libera {brl([...endCur, ...endNext].reduce((s, g) => s + g.lastAmount, 0))}/mês</p>
              ) : <p className="mt-2 text-[10px] text-fg-muted">Nenhuma vencida</p>}
            </div>
          </div>

          {payoffs.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-fg-2"><Sparkles size={12} className="text-accent" /> Próximas quitações</p>
              <ol className="space-y-1">
                {payoffs.map((g) => (
                  <li key={g.id} className="flex items-center gap-2 text-[11px]">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium text-fg">{g.description}</span>
                      <span className="text-fg-muted"> · libera <span className="font-semibold text-accent">{brl(g.lastAmount)}/mês</span> · faltam {g.remaining}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-fg-muted">{MONTHS_SHORT[g.last!.getMonth()]}/{String(g.last!.getFullYear()).slice(2)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </div>
  );
}
