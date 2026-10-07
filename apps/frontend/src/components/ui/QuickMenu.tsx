'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

export type QuickMenuItem =
  | { type?: 'item'; label: string; icon: React.ElementType; href?: string; onClick?: () => void; hint?: string; tone?: string }
  | { type: 'separator'; label?: string };

/**
 * Dropdown of quick actions (icon + label list). Closes on outside click,
 * Escape and after choosing an item.
 */
export function QuickMenu({ label, icon: Icon, items, align = 'left', className }: {
  label: string;
  icon: React.ElementType;
  items: QuickMenuItem[];
  align?: 'left' | 'right';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const itemCls = 'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-fg-2 transition-colors hover:bg-hover hover:text-fg focus-visible:bg-hover';

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn('btn btn-secondary', open && 'border-border-hover bg-hover text-fg')}
      >
        <Icon size={15} strokeWidth={1.75} /> {label}
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div role="menu"
          className={cn('absolute top-full z-50 mt-1.5 max-h-[70vh] w-60 overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100',
            align === 'right' ? 'right-0' : 'left-0')}>
          {items.map((it, i) => {
            if (it.type === 'separator') {
              return it.label
                ? <p key={i} className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-fg-muted">{it.label}</p>
                : <div key={i} className="my-1 h-px bg-border" />;
            }
            const ItemIcon = it.icon;
            const body = (
              <>
                <ItemIcon size={15} strokeWidth={1.75} className={cn('shrink-0', it.tone ?? 'text-fg-muted')} />
                <span className="min-w-0 flex-1 truncate">{it.label}</span>
                {it.hint && <span className="shrink-0 text-[10px] text-fg-muted">{it.hint}</span>}
              </>
            );
            return it.href ? (
              <Link key={i} role="menuitem" href={it.href} onClick={() => setOpen(false)} className={itemCls}>{body}</Link>
            ) : (
              <button key={i} role="menuitem" type="button" onClick={() => { setOpen(false); it.onClick?.(); }} className={itemCls}>{body}</button>
            );
          })}
        </div>
      )}
    </div>
  );
}
