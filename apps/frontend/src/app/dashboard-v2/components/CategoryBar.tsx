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
    <div className="flex items-center gap-2.5">
      <span className={cn(
        'w-5 text-[10px] font-black text-center shrink-0',
        rank === 1 ? 'text-amber-500' : rank === 2 ? 'text-zinc-500' : rank === 3 ? 'text-orange-400' : 'text-zinc-400',
      )}>
        {rank}º
      </span>
      <div className="w-28 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 truncate">{name}</div>
      <div className="flex-1 relative h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-visible flex">
        {segments.map((seg) => {
          const segPct = total > 0 ? (seg.amount / total) * 100 : 0;
          if (segPct <= 0) return null;
          return (
            <div key={seg.id}
              className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-700"
              style={{ width: `${Math.max(segPct, 1)}%`, backgroundColor: seg.color }}
              title={`${seg.name}: R$ ${fmtBRL(seg.amount)}`} />
          );
        })}
        {plannedPct !== null && (
          <div className="absolute top-[-3px] h-[calc(100%+6px)] w-0.5 rounded-full bg-zinc-400 dark:bg-zinc-300 opacity-70"
            style={{ left: `${plannedPct}%` }}
            title={`Planejado: R$ ${fmtBRL(planned!)}`} />
        )}
      </div>
      <span className="w-9 text-[10px] font-black text-zinc-500 dark:text-zinc-400 text-right shrink-0">{pctDisplay}%</span>
      <div className="w-28 flex flex-col items-end shrink-0">
        <span className={cn('text-[11px] font-black leading-tight', overBudget ? 'text-red-600' : 'text-zinc-800 dark:text-zinc-200')}>
          R$ {fmtBRL(amount)}
        </span>
        {planned != null && (
          overBudget
            ? <span className="text-[8px] font-black text-red-500 leading-tight">⚠ +R$ {fmtBRL(amount - planned)}</span>
            : <span className="text-[8px] font-black text-zinc-400 leading-tight">/ R$ {fmtBRL(planned)}</span>
        )}
      </div>
    </div>
  );
}
