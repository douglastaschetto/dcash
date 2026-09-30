import { cn } from '@/lib/utils';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300',
  success: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
  warning: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  danger: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  info: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
