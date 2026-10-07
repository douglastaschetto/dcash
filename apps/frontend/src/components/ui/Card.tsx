import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const PADDING_CLASSES = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

/** Standard card shell: token surface + 1px border, depth from contrast rather than shadow. */
export function Card({ padding = 'md', interactive, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card',
        interactive && 'transition-colors hover:bg-card-hover hover:border-border-hover',
        PADDING_CLASSES[padding],
        className,
      )}
      {...props}
    />
  );
}

/** Card header row: title (+ optional icon) on the left, actions on the right. */
export function CardHeader({
  title,
  icon: Icon,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  icon?: React.ElementType;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 mb-4', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} strokeWidth={1.75} className="text-fg-muted shrink-0" />}
          <h3 className="text-sm font-semibold text-fg truncate">{title}</h3>
        </div>
        {description && <p className="mt-0.5 text-xs text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
