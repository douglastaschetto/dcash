import { useId } from 'react';
import { cn } from '@/lib/utils';

const muted = 'color-mix(in srgb, var(--foreground) 55%, transparent)';

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  icon?: React.ElementType;
  right?: React.ReactNode;
}

/**
 * Labelled text input with a properly associated <label for> — the audit
 * flagged zero `htmlFor` usage across the app, meaning labels were purely
 * visual and unusable with a screen reader or by clicking the label text.
 */
export function Input({
  label,
  hint,
  error,
  icon: Icon,
  right,
  id,
  className,
  ...props
}: FieldProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
            style={{ color: muted }}
          />
        )}
        <input
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            'w-full h-10 rounded-xl text-sm outline-none transition placeholder:opacity-50 border',
            Icon ? 'pl-10' : 'pl-3.5',
            right ? 'pr-10' : 'pr-3.5',
            error ? 'border-red-400' : '',
            className,
          )}
          style={{ background: 'var(--surface-secondary)', borderColor: error ? undefined : 'var(--border)', color: 'var(--foreground)' }}
          {...props}
        />
        {right && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-red-500">{error}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs" style={{ color: muted }}>{hint}</p>
      ) : null}
    </div>
  );
}
