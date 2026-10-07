'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Search } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

/* ── Helpers ─────────────────────────────────────────────────────── */
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const pad = (n: number) => String(n).padStart(2, '0');
export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtShort = (s: string) => { const d = fromISO(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`; };

export function monthRange(year: number, month: number) {
  return { from: toISODate(new Date(year, month, 1)), to: toISODate(new Date(year, month + 1, 0)) };
}

/** Closes a popover on outside click / Escape. */
function usePopover() {
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
  return { open, setOpen, ref };
}

const pill = (active: boolean) => cn(
  'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors',
  active
    ? 'border-primary-border bg-primary-soft text-accent'
    : 'border-border bg-card text-fg-2 hover:bg-hover hover:text-fg hover:border-border-hover',
);

/* ── Multi-select filter pill ────────────────────────────────────── */
export type FilterOption = { value: string; label: string; color?: string; hint?: string };

export function MultiFilter({
  label, icon: Icon, options, selected, onChange,
}: {
  label: string;
  icon?: React.ElementType;
  options: FilterOption[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const { open, setOpen, ref } = usePopover();
  const [query, setQuery] = useState('');
  const shown = useMemo(
    () => options.filter((o) => String(o.label ?? '').toLowerCase().includes(query.toLowerCase())),
    [options, query],
  );
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  const summary = selected.length === 0
    ? null
    : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label
      : `${selected.length} selecionados`;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className={pill(selected.length > 0)} aria-expanded={open}>
        {Icon && <Icon size={14} strokeWidth={1.75} />}
        <span className="flex min-w-0">
          {label}
          {summary && <span className="max-w-[9rem] truncate font-semibold">: {summary}</span>}
        </span>
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-border bg-card p-1.5 shadow-xl">
          {options.length > 6 && (
            <div className="relative mb-1.5">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Buscar ${label.toLowerCase()}...`}
                className="field !h-8 !pl-8 !text-[13px]"
              />
            </div>
          )}
          <div className="max-h-64 overflow-y-auto">
            {shown.length === 0 && <p className="px-2.5 py-3 text-center text-xs text-fg-muted">Nenhuma opção</p>}
            {shown.map((o) => {
              const checked = selected.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-fg hover:bg-hover"
                >
                  <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                    checked ? 'border-primary bg-primary text-on-primary' : 'border-border-hover')}>
                    {checked && <Check size={11} strokeWidth={3} />}
                  </span>
                  {o.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: o.color }} />}
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="text-[11px] tabular-nums text-fg-muted">{o.hint}</span>}
                </button>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div className="mt-1 border-t border-border pt-1">
              <button type="button" onClick={() => onChange([])}
                className="w-full rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-fg-muted hover:bg-hover hover:text-fg">
                Limpar seleção
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Amount range pill ───────────────────────────────────────────── */
export function AmountFilter({
  min, max, onChange,
}: { min: string; max: string; onChange: (min: string, max: string) => void }) {
  const { open, setOpen, ref } = usePopover();
  const active = !!(min || max);
  const summary = min && max ? `R$ ${min} – ${max}` : min ? `≥ R$ ${min}` : max ? `≤ R$ ${max}` : null;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className={pill(active)} aria-expanded={open}>
        <span>Valor{summary && <span className="font-semibold">: {summary}</span>}</span>
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-border bg-card p-3 shadow-xl">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-fg-2">
              Mínimo
              <input type="number" min={0} inputMode="decimal" value={min} onChange={(e) => onChange(e.target.value, max)}
                placeholder="0,00" className="field !h-9 mt-1" />
            </label>
            <label className="text-xs font-medium text-fg-2">
              Máximo
              <input type="number" min={0} inputMode="decimal" value={max} onChange={(e) => onChange(min, e.target.value)}
                placeholder="Sem limite" className="field !h-9 mt-1" />
            </label>
          </div>
          {active && (
            <button type="button" onClick={() => onChange('', '')}
              className="mt-2 text-xs font-medium text-fg-muted hover:text-fg">Limpar valor</button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Period picker (month navigation + presets + custom range) ───── */
export function PeriodFilter({
  from, to, onChange,
}: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const { open, setOpen, ref } = usePopover();
  const today = new Date();

  // A range is "a month" when it spans exactly the 1st → last day of one month
  const month = useMemo(() => {
    if (!from || !to) return null;
    const f = fromISO(from);
    const r = monthRange(f.getFullYear(), f.getMonth());
    return r.from === from && r.to === to ? { y: f.getFullYear(), m: f.getMonth() } : null;
  }, [from, to]);

  const label = month
    ? `${MONTHS[month.m][0].toUpperCase()}${MONTHS[month.m].slice(1)} de ${month.y}`
    : !from && !to ? 'Todo o período'
    : `${from ? fmtShort(from) : '…'} – ${to ? fmtShort(to) : '…'}`;

  const shift = (delta: number) => {
    if (!month) return;
    const d = new Date(month.y, month.m + delta, 1);
    const r = monthRange(d.getFullYear(), d.getMonth());
    onChange(r.from, r.to);
  };

  const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return toISODate(d); };
  const presets: { label: string; range: [string, string] }[] = [
    { label: 'Este mês', range: [monthRange(today.getFullYear(), today.getMonth()).from, monthRange(today.getFullYear(), today.getMonth()).to] },
    { label: 'Mês passado', range: [monthRange(today.getFullYear(), today.getMonth() - 1).from, monthRange(today.getFullYear(), today.getMonth() - 1).to] },
    { label: 'Próximo mês', range: [monthRange(today.getFullYear(), today.getMonth() + 1).from, monthRange(today.getFullYear(), today.getMonth() + 1).to] },
    { label: 'Últimos 7 dias', range: [daysAgo(6), toISODate(today)] },
    { label: 'Últimos 30 dias', range: [daysAgo(29), toISODate(today)] },
    { label: 'Este ano', range: [`${today.getFullYear()}-01-01`, `${today.getFullYear()}-12-31`] },
    { label: 'Todo o período', range: ['', ''] },
  ];

  const navBtn = 'flex h-8 w-8 items-center justify-center text-fg-muted hover:bg-hover hover:text-fg transition-colors disabled:opacity-30 disabled:pointer-events-none';

  return (
    <div ref={ref} className="relative">
      <div className="flex h-8 items-stretch overflow-hidden rounded-lg border border-border bg-card">
        <button type="button" onClick={() => shift(-1)} disabled={!month} aria-label="Mês anterior" className={navBtn}>
          <ChevronLeft size={15} />
        </button>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
          className="flex min-w-[11rem] items-center justify-center gap-2 border-x border-border px-3 text-[13px] font-medium text-fg hover:bg-hover">
          <CalendarIcon size={14} strokeWidth={1.75} className="text-fg-muted" />
          {/* default range is "today"-relative, so the prerendered label may differ */}
          <span suppressHydrationWarning>{label}</span>
        </button>
        <button type="button" onClick={() => shift(1)} disabled={!month} aria-label="Próximo mês" className={navBtn}>
          <ChevronRight size={15} />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 flex w-[21rem] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-xl">
          <div className="w-36 shrink-0 border-r border-border p-1.5">
            {presets.map((p) => {
              const active = p.range[0] === from && p.range[1] === to;
              return (
                <button key={p.label} type="button" onClick={() => { onChange(p.range[0], p.range[1]); setOpen(false); }}
                  className={cn('w-full rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors',
                    active ? 'bg-primary-soft text-accent font-medium' : 'text-fg-2 hover:bg-hover hover:text-fg')}>
                  {p.label}
                </button>
              );
            })}
          </div>
          <div className="flex-1 space-y-2.5 p-3">
            <p className="text-xs font-medium text-fg-2">Período personalizado</p>
            <label className="block text-[11px] text-fg-muted">
              De
              <input type="date" value={from} max={to || undefined} onChange={(e) => onChange(e.target.value, to)} className="field !h-9 mt-1" />
            </label>
            <label className="block text-[11px] text-fg-muted">
              Até
              <input type="date" value={to} min={from || undefined} onChange={(e) => onChange(from, e.target.value)} className="field !h-9 mt-1" />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Segmented control ───────────────────────────────────────────── */
export function Segmented<T extends string>({
  value, options, onChange,
}: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex h-8 rounded-lg border border-border bg-surface-2 p-0.5" role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cn('rounded-md px-2.5 text-xs font-medium whitespace-nowrap transition-colors border',
            value === o.value ? 'bg-card text-fg border-border shadow-xs' : 'text-fg-muted hover:text-fg border-transparent')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
