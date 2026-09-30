import { cn } from '@/lib/utils';

const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function DRERow({ indent, indent2, label, value, bold, color, positive, negative, muted, separator, sub }: {
  indent?: boolean; indent2?: boolean; label: string; value?: number | null; bold?: boolean;
  color?: string; positive?: boolean; negative?: boolean; muted?: boolean; separator?: boolean;
  sub?: React.ReactNode;
}) {
  if (separator) return <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />;
  const textColor = positive ? 'text-emerald-600 dark:text-emerald-400'
    : negative ? 'text-red-600 dark:text-red-400'
    : muted ? 'text-zinc-400'
    : 'text-zinc-800 dark:text-zinc-200';
  return (
    <div className={cn(indent2 ? 'pl-8' : indent ? 'pl-4' : '')}>
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2 min-w-0">
          {color && <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />}
          <span className={cn('text-[11px] truncate', bold ? 'font-black' : 'font-medium', muted ? 'text-zinc-400' : 'text-zinc-700 dark:text-zinc-300')}>
            {label}
          </span>
        </div>
        {value != null && (
          <span className={cn('text-[11px] shrink-0 ml-4', bold ? 'font-black' : 'font-medium', textColor)}>
            {positive && value > 0 ? '+' : negative && value > 0 ? '-' : ''} R$ {fmtBRL(value)}
          </span>
        )}
      </div>
      {sub && <div className="pb-1 -mt-0.5">{sub}</div>}
    </div>
  );
}
