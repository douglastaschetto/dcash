import { cn } from '@/lib/utils';

const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Stacked-by-family-member expense bar (pure CSS, no chart library). */
export function CategoryBar({
  rank, name, amount, total, planned, overBudget, segments,
}: {
  rank: number; name: string; amount: number; total: number;
  planned?: number | null; overBudget?: boolean;
  segments: { id: string; name: string; amount: number; color: string }[];
}) {
  const pctDisplay = total > 0 ? ((amount / total) * 100).toFixed(0) : '0';
  const plannedPct = planned != null && total > 0 ? Math.min(100, (planned / total) * 100) : null;

  return (
    <div className="grid grid-cols-[1.25rem_minmax(0,7rem)_1fr_auto] sm:grid-cols-[1.25rem_minmax(0,9rem)_1fr_2.5rem_7rem] items-center gap-3">
      <span className="text-xs tabular-nums text-fg-muted text-right">{rank}</span>
      <div className="text-[13px] font-medium text-fg-2 truncate">{name}</div>
      <div className="relative h-2 rounded-full bg-track flex gap-[2px]">
        {segments.map((seg) => {
          const segPct = total > 0 ? (seg.amount / total) * 100 : 0;
          if (segPct <= 0) return null;
          return (
            <div key={seg.id}
              className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-700"
              style={{ width: `${Math.max(segPct, 1)}%`, backgroundColor: overBudget && segments.length === 1 ? 'var(--danger)' : seg.color }}
              title={`${seg.name}: R$ ${fmtBRL(seg.amount)}`} />
          );
        })}
        {plannedPct !== null && (
          <div className="absolute -top-1 h-4 w-0.5 rounded-full bg-fg-muted"
            style={{ left: `${plannedPct}%` }}
            title={`Planejado: R$ ${fmtBRL(planned!)}`} />
        )}
      </div>
      <span className="hidden sm:block text-xs tabular-nums text-fg-muted text-right">{pctDisplay}%</span>
      <div className="flex flex-col items-end">
        <span className={cn('text-[13px] font-semibold tabular-nums leading-tight whitespace-nowrap', overBudget ? 'text-danger' : 'text-fg')}>
          R$ {fmtBRL(amount)}
        </span>
        {planned != null && (
          overBudget
            ? <span className="text-[11px] tabular-nums text-danger leading-tight">+R$ {fmtBRL(amount - planned)}</span>
            : <span className="text-[11px] tabular-nums text-fg-muted leading-tight">de R$ {fmtBRL(planned)}</span>
        )}
      </div>
    </div>
  );
}
