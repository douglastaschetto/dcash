import { cn } from '@/lib/utils';

const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function DRERow({ indent, indent2, label, value, bold, color, positive, negative, muted, separator, sub }: {
  indent?: boolean; indent2?: boolean; label: string; value?: number | null; bold?: boolean;
  color?: string; positive?: boolean; negative?: boolean; muted?: boolean; separator?: boolean;
  sub?: React.ReactNode;
}) {
  if (separator) return <div className="border-t border-border my-1.5" />;
  const textColor = positive ? 'text-accent'
    : negative ? 'text-danger'
    : muted ? 'text-fg-muted'
    : 'text-fg';
  return (
    <div className={cn(indent2 ? 'pl-8' : indent ? 'pl-4' : '')}>
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2 min-w-0">
          {color && <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />}
          <span className={cn('truncate', bold ? 'text-[13px] font-semibold text-fg' : 'text-[13px]', muted ? 'text-fg-muted text-xs' : !bold && 'text-fg-2')}>
            {label}
          </span>
        </div>
        {value != null && (
          <span className={cn('shrink-0 ml-4 tabular-nums', bold ? 'text-[13px] font-semibold' : 'text-[13px]', muted ? 'text-xs text-fg-muted' : textColor)}>
            {positive && value > 0 ? '+' : negative && value > 0 ? '−' : ''} R$ {fmtBRL(value)}
          </span>
        )}
      </div>
      {sub && <div className="pb-1">{sub}</div>}
    </div>
  );
}
