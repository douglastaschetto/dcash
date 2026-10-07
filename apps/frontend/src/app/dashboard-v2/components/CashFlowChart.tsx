'use client';

import { useMemo, useState } from 'react';
import { cn, parseDateOnly } from '@/lib/utils';

const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtCompact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : n.toFixed(0);

type Series = 'EXPENSE' | 'INCOME';
type Tx = { type: string; amount: number | string; date: string; piggyBankId?: string | null };
type Grain = 'day' | 'week';

/**
 * Month cash-flow bars (single series → no legend; the tab names it).
 * Pure CSS so it follows the theme tokens with no chart library.
 */
export function CashFlowChart({
  transactions, year, month, headerRight,
}: {
  transactions: Tx[];
  year: number;
  month: number;
  headerRight?: React.ReactNode;
}) {
  const [series, setSeries] = useState<Series>('EXPENSE');
  const [grain, setGrain] = useState<Grain>('day');
  const [hover, setHover] = useState<number | null>(null);

  const { buckets, total } = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const n = grain === 'day' ? daysInMonth : Math.ceil(daysInMonth / 7);
    const values = Array.from({ length: n }, (_, i) => ({
      label: grain === 'day' ? String(i + 1) : `Sem ${i + 1}`,
      range: grain === 'day'
        ? `${String(i + 1).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`
        : `${String(i * 7 + 1).padStart(2, '0')}–${String(Math.min(daysInMonth, i * 7 + 7)).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`,
      value: 0,
    }));
    let total = 0;
    transactions.forEach((t) => {
      if (t.type !== series) return;
      if (series === 'EXPENSE' && t.piggyBankId) return; // savings aren't spending
      const d = parseDateOnly(t.date);
      const idx = grain === 'day' ? d.getDate() - 1 : Math.floor((d.getDate() - 1) / 7);
      if (values[idx]) { values[idx].value += Number(t.amount); total += Number(t.amount); }
    });
    return { buckets: values, total };
  }, [transactions, year, month, series, grain]);

  const max = Math.max(...buckets.map((b) => b.value), 0);
  // Round the scale up to a "nice" value so gridlines land on readable numbers
  const niceMax = (() => {
    if (max <= 0) return 100;
    const pow = Math.pow(10, Math.floor(Math.log10(max)));
    const step = [1, 2, 2.5, 5, 10].find((s) => s * pow * 4 >= max) ?? 10;
    return step * pow * 4;
  })();
  const ticks = [4, 3, 2, 1, 0].map((i) => (niceMax / 4) * i);
  const peakIdx = max > 0 ? buckets.findIndex((b) => b.value === max) : -1;
  const focusIdx = hover ?? peakIdx;

  const tab = (active: boolean) => cn(
    'h-7 px-2.5 rounded-md text-xs font-medium transition-colors',
    active ? 'bg-card text-fg border border-border shadow-xs' : 'text-fg-muted hover:text-fg border border-transparent',
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-fg-2">Fluxo de caixa</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-fg">R$ {fmtBRL(total)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-surface-2 p-0.5" role="tablist" aria-label="Agrupamento">
            <button role="tab" aria-selected={grain === 'day'} className={tab(grain === 'day')} onClick={() => setGrain('day')}>Diário</button>
            <button role="tab" aria-selected={grain === 'week'} className={tab(grain === 'week')} onClick={() => setGrain('week')}>Semanal</button>
          </div>
          {headerRight}
        </div>
      </div>

      <div className="mt-4 flex rounded-lg border border-border bg-surface-2 p-0.5 w-fit" role="tablist" aria-label="Série">
        <button role="tab" aria-selected={series === 'EXPENSE'} className={tab(series === 'EXPENSE')} onClick={() => setSeries('EXPENSE')}>Despesas</button>
        <button role="tab" aria-selected={series === 'INCOME'} className={tab(series === 'INCOME')} onClick={() => setSeries('INCOME')}>Receitas</button>
      </div>

      <div className="mt-5 flex gap-3">
        {/* Y axis */}
        <div className="flex h-48 flex-col justify-between pb-5 text-right text-[11px] tabular-nums text-fg-muted">
          {ticks.map((t) => <span key={t} className="leading-none">{fmtCompact(t)}</span>)}
        </div>

        {/* Plot */}
        <div className="relative h-48 flex-1 min-w-0">
          <div className="absolute inset-x-0 top-0 bottom-5 flex flex-col justify-between pointer-events-none">
            {ticks.map((t) => <div key={t} className="border-t border-dashed" style={{ borderColor: 'var(--chart-grid)' }} />)}
          </div>

          <div className="absolute inset-x-0 top-0 bottom-5 flex items-end gap-[3px]" onMouseLeave={() => setHover(null)}>
            {buckets.map((b, i) => {
              const h = (b.value / niceMax) * 100;
              const isFocus = i === focusIdx && b.value > 0;
              return (
                <div
                  key={i}
                  className="group relative flex h-full flex-1 items-end justify-center min-w-0"
                  onMouseEnter={() => setHover(i)}
                  aria-label={`${b.range}: R$ ${fmtBRL(b.value)}`}
                >
                  <div
                    className={cn(
                      'relative w-full rounded-t-md transition-colors',
                      grain === 'week' ? 'max-w-16' : 'max-w-7',
                      isFocus ? '' : 'bg-chart-bar group-hover:bg-chart-bar-hover',
                    )}
                    style={{
                      height: b.value > 0 ? `max(${h}%, 3px)` : '0',
                      ...(isFocus && {
                        background: 'linear-gradient(to bottom, var(--primary-text), color-mix(in srgb, var(--primary) 18%, transparent))',
                      }),
                    }}
                  >
                    {isFocus && <span className="absolute left-1/2 top-1.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-on-inverse/90" />}
                  </div>
                  {isFocus && (
                    <div
                      className={cn(
                        'pointer-events-none absolute z-10 -translate-y-2 whitespace-nowrap rounded-md bg-inverse px-2 py-1 text-on-inverse shadow-md',
                        // keep the tooltip inside the plot at the edges
                        i < buckets.length * 0.15 ? 'left-0 text-left' : i > buckets.length * 0.85 ? 'right-0 text-right' : 'text-center',
                      )}
                      style={{ bottom: `${h}%` }}
                    >
                      <p className="text-[10px] opacity-70">{b.range}</p>
                      <p className="text-xs font-semibold tabular-nums">R$ {fmtBRL(b.value)}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* X axis */}
          <div className="absolute inset-x-0 bottom-0 flex gap-[3px] text-[11px] text-fg-muted">
            {buckets.map((b, i) => (
              <span key={i} className="flex-1 min-w-0 text-center tabular-nums">
                {grain === 'week' || i === 0 || (i + 1) % 5 === 0 ? b.label : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
