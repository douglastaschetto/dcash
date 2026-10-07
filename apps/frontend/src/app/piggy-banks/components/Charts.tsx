'use client';

import { useState } from 'react';
import { BarChart3, PieChart } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import type { Bank } from '../lib/insights';

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const fmtBRL = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtCompact = (n: number) =>
  Math.abs(n) >= 1000 ? `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : n.toFixed(0);

/** Monthly net contributions — same bar language as the dashboard cash-flow chart. */
export function ContributionsChart({ series }: { series: { month: Date; value: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...series.map((s) => s.value), 0);
  const total = series.reduce((s, m) => s + m.value, 0);
  const focus = hover ?? series.length - 1;
  const avg = total / series.length;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[13px] font-medium text-fg-2"><BarChart3 size={14} strokeWidth={1.75} /> Aportes por mês</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-fg">{fmtBRL(total)}</p>
          <p className="text-[11px] text-fg-muted">últimos 12 meses · média {fmtBRL(avg)}/mês</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-fg-muted">{MONTHS_SHORT[series[focus].month.getMonth()]}/{String(series[focus].month.getFullYear()).slice(2)}</p>
          <p className={cn('text-sm font-semibold tabular-nums', series[focus].value < 0 ? 'text-danger' : 'text-fg')}>{fmtBRL(series[focus].value)}</p>
        </div>
      </div>

      <div className="mt-5 flex h-40 items-end gap-[4px]" onMouseLeave={() => setHover(null)}>
        {series.map((s, i) => {
          const h = max > 0 ? (Math.max(0, s.value) / max) * 100 : 0;
          const isFocus = i === focus;
          return (
            <div key={i} className="group flex h-full flex-1 flex-col items-center justify-end gap-1 min-w-0" onMouseEnter={() => setHover(i)}>
              {isFocus && s.value > 0 && <span className="text-[10px] font-semibold tabular-nums text-fg">{fmtCompact(s.value)}</span>}
              <div
                className={cn('w-full max-w-10 rounded-t-md transition-colors', !isFocus && 'bg-chart-bar group-hover:bg-chart-bar-hover')}
                style={{
                  height: s.value > 0 ? `max(${h * 0.85}%, 3px)` : '2px',
                  ...(isFocus && { background: 'linear-gradient(to bottom, var(--primary-text), color-mix(in srgb, var(--primary) 18%, transparent))' }),
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-[4px]">
        {series.map((s, i) => (
          <span key={i} className={cn('flex-1 min-w-0 text-center text-[10px]', i === focus ? 'font-semibold text-fg' : 'text-fg-muted')}>
            {MONTHS_SHORT[s.month.getMonth()].charAt(0)}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Share of the total saved per piggy bank (uses each bank's own color). */
export function DistributionChart({ banks }: { banks: Bank[] }) {
  const total = banks.reduce((s, b) => s + Math.max(0, b.balance), 0);
  const sorted = [...banks].sort((a, b) => b.balance - a.balance);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="flex items-center gap-2 text-[13px] font-medium text-fg-2"><PieChart size={14} strokeWidth={1.75} /> Distribuição</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-fg">{fmtBRL(total)}</p>
      <p className="text-[11px] text-fg-muted">guardados em {banks.length} cofrinho{banks.length === 1 ? '' : 's'}</p>

      <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-track">
        {total > 0 && sorted.map((b) => (
          <div
            key={b.id}
            title={`${b.name}: ${fmtBRL(b.balance)}`}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(Math.max(0, b.balance) / total) * 100}%`, backgroundColor: b.color || 'var(--primary)' }}
          />
        ))}
      </div>

      <ul className="mt-4 space-y-2.5">
        {sorted.slice(0, 6).map((b) => {
          const pct = total > 0 ? (Math.max(0, b.balance) / total) * 100 : 0;
          return (
            <li key={b.id} className="flex items-center gap-2.5 text-xs">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: b.color || 'var(--primary)' }} />
              <span className="min-w-0 flex-1 truncate text-fg-2">{b.name}</span>
              <span className="tabular-nums text-fg-muted">{pct.toFixed(0)}%</span>
              <span className="w-28 text-right font-medium tabular-nums text-fg">{fmtBRL(b.balance)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
