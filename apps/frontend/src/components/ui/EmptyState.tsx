import { AlertCircle, RotateCcw, type LucideIcon } from 'lucide-react';
import { Button } from './Button';

const muted = 'color-mix(in srgb, var(--foreground) 50%, transparent)';

/** "Nothing here yet" — as opposed to ErrorState, which is "something failed". */
export function EmptyState({
  icon: Icon = AlertCircle,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="py-24 flex flex-col items-center text-center px-6">
      <Icon size={48} strokeWidth={1} className="mb-4 opacity-30" style={{ color: 'var(--foreground)' }} />
      <p className="text-xs font-black uppercase tracking-widest" style={{ color: muted }}>{title}</p>
      {description && <p className="mt-1.5 text-xs max-w-xs" style={{ color: muted }}>{description}</p>}
    </div>
  );
}

/**
 * "Something failed" state with a retry action. Several pages previously
 * swallowed fetch failures into a silent empty array (see audit on
 * dashboard-v2's 9 silent `.catch()` blocks) — this makes failure visible
 * and actionable instead of looking identical to "no data".
 */
export function ErrorState({
  title = 'Não foi possível carregar os dados.',
  description = 'Verifique sua conexão e tente novamente.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="py-24 flex flex-col items-center text-center px-6 gap-3">
      <AlertCircle className="text-red-500" size={36} />
      <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{title}</p>
      <p className="text-xs max-w-xs" style={{ color: muted }}>{description}</p>
      {onRetry && (
        <Button size="sm" onClick={onRetry} icon={<RotateCcw size={14} />}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
