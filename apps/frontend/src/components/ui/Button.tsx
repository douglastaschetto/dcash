import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  secondary: 'bg-emerald-950 text-white hover:bg-emerald-800 shadow-sm',
  outline: 'border hover:bg-[var(--surface-secondary)]',
  ghost: 'hover:bg-[var(--surface-secondary)]',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-sm gap-2 rounded-2xl',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

/**
 * Shared button primitive. Existing pages hand-roll this per-page with
 * slightly different radii/shadows each time (see audit: rounded-[2.5rem]
 * vs rounded-[2rem] vs rounded-[32px] for the same visual intent) — new
 * work should use this instead of a fresh className.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  className,
  children,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-bold uppercase tracking-wide transition disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      style={variant === 'outline' ? { borderColor: 'var(--border)', color: 'var(--foreground)', ...style } : style}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 16} /> : icon}
      {children}
    </button>
  );
}
