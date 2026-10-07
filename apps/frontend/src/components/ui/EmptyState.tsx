import { AlertCircle, RotateCcw, type LucideIcon } from '@/components/ui/icons';
import { Button } from './Button';

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
    <div className="py-16 flex flex-col items-center text-center px-6">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-2">
        <Icon size={20} strokeWidth={1.75} className="text-fg-muted" />
      </div>
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="mt-1 text-xs max-w-xs text-fg-muted">{description}</p>}
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
    <div className="py-20 flex flex-col items-center text-center px-6 gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-danger/30 bg-danger-soft">
        <AlertCircle className="text-danger" size={20} strokeWidth={1.75} />
      </div>
      <p className="text-sm font-semibold text-fg">{title}</p>
      <p className="text-xs max-w-xs text-fg-muted">{description}</p>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry} icon={<RotateCcw size={14} />}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
