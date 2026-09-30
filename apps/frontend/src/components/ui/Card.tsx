import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING_CLASSES = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

/** Standard card shell: rounded-[2rem] + var(--surface)/var(--border) — the
 * radius previously varied per page (2.5rem / 2rem / 32px) for no reason. */
export function Card({ padding = 'md', className, style, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-[2rem] border shadow-sm', PADDING_CLASSES[padding], className)}
      style={{ background: 'var(--surface)', borderColor: 'var(--border)', ...style }}
      {...props}
    />
  );
}
