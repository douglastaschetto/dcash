'use client';

import { useEffect, useState } from 'react';
import { Check, CheckCircle2, Loader2, Minus, Plus, Search, Sparkles, X } from '@/components/ui/icons';
import api from '@/services/api';
import { cn } from '@/lib/utils';
import { apiError } from '../lib/dcaos';
import { CATEGORY_TINT, PANTRY_CATALOG, fmtShelf, type CatalogItem } from '../lib/pantry-catalog';
import { fmtQtyShort, unitStep } from '../lib/units';

type Pick = { qty: number; min: number; shelfDays: number };
const CATS = ['Todos', ...Array.from(new Set(PANTRY_CATALOG.map((c) => c.category)))];
const round = (n: number) => Math.round(n * 100) / 100;

function Stepper({ value, unit, onChange, min = 0 }: { value: number; unit: CatalogItem['unit']; onChange: (v: number) => void; min?: number }) {
  const step = unitStep(unit);
  return (
    <div className="flex items-center rounded-md border border-border bg-card">
      <button type="button" onClick={(e) => { e.stopPropagation(); onChange(Math.max(min, round(value - step))); }} aria-label="Menos"
        className="flex h-6 w-6 items-center justify-center text-fg-muted hover:text-fg"><Minus size={11} /></button>
      <span className="min-w-[3.25rem] flex-1 text-center text-[11px] font-semibold tabular-nums text-fg">{fmtQtyShort(value, unit)}</span>
      <button type="button" onClick={(e) => { e.stopPropagation(); onChange(round(value + step)); }} aria-label="Mais"
        className="flex h-6 w-6 items-center justify-center text-fg-muted hover:text-fg"><Plus size={11} /></button>
    </div>
  );
}

/**
 * "Vitrine" to stock the pantry in one go: pick products from an illustrated
 * catalog that already carries a usual amount, the low-stock warning level and
 * an average shelf life — all editable before adding.
 */
export function PantryShowcase({ existing, onClose, onDone }: {
  existing: Set<string>;
  onClose: () => void;
  onDone: (added: number) => void;
}) {
  const [cat, setCat] = useState('Todos');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Map<string, Pick>>(new Map());
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const q = query.trim().toLowerCase();
  const visible = PANTRY_CATALOG.filter((c) => (cat === 'Todos' || c.category === cat) && (!q || c.name.toLowerCase().includes(q)));
  const has = (c: CatalogItem) => existing.has(c.name.toLowerCase());

  const toggle = (c: CatalogItem) => {
    if (has(c)) return;
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(c.name)) next.delete(c.name); else next.set(c.name, { qty: c.qty, min: c.min, shelfDays: c.shelfDays });
      return next;
    });
  };
  const edit = (name: string, patch: Partial<Pick>) =>
    setPicked((prev) => { const next = new Map(prev); const cur = next.get(name); if (cur) next.set(name, { ...cur, ...patch }); return next; });

  const selectable = visible.filter((c) => !has(c));
  const allVisiblePicked = selectable.length > 0 && selectable.every((c) => picked.has(c.name));
  const toggleVisible = () => setPicked((prev) => {
    const next = new Map(prev);
    if (allVisiblePicked) selectable.forEach((c) => next.delete(c.name));
    else selectable.forEach((c) => { if (!next.has(c.name)) next.set(c.name, { qty: c.qty, min: c.min, shelfDays: c.shelfDays }); });
    return next;
  });

  const save = async () => {
    const list = PANTRY_CATALOG.filter((c) => picked.has(c.name));
    if (!list.length) return;
    setSaving({ done: 0, total: list.length });
    let done = 0;
    try {
      for (const c of list) {
        const p = picked.get(c.name)!;
        await api.post('/dcaos/market', {
          name: c.name, category: c.category, unit: c.unit, onList: false,
          quantity: p.qty, minQuantity: p.min, shelfLifeDays: Math.max(1, Math.round(p.shelfDays)),
        });
        done += 1;
        setSaving({ done, total: list.length });
      }
      onDone(done);
    } catch (err) {
      alert(apiError(err, `Parou no item ${done + 1}. ${done} já foram adicionados.`));
      onDone(done);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center md:items-center md:p-4">
      <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <div role="dialog" aria-modal="true" aria-label="Vitrine da despensa"
        className="relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl md:max-w-6xl md:rounded-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-accent"><Sparkles size={12} /> Vitrine da despensa</p>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-fg">Escolha o que costuma ter em casa</h2>
            <p className="text-xs text-fg-muted">Cada produto já vem com quantidade, aviso de estoque baixo e validade média. Ajuste se quiser.</p>
          </div>
          <button onClick={onClose} disabled={!!saving} aria-label="Fechar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-hover hover:text-fg"><X size={16} /></button>
        </div>

        {/* Filters */}
        <div className="flex shrink-0 flex-col gap-2 border-b border-border px-5 py-3 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto scrollbar-none">
            {CATS.map((c) => {
              const count = c === 'Todos' ? picked.size : PANTRY_CATALOG.filter((x) => x.category === c && picked.has(x.name)).length;
              return (
                <button key={c} onClick={() => setCat(c)}
                  className={cn('flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
                    cat === c ? 'border-primary-border bg-primary-soft text-accent' : 'border-border text-fg-muted hover:text-fg')}>
                  {c}
                  {count > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-on-primary">{count}</span>}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <div className="relative md:w-56">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar produto..."
                className="h-8 w-full rounded-lg border border-border bg-card pl-8 pr-2 text-xs text-fg outline-none placeholder:text-fg-muted focus:border-primary" />
            </div>
            {selectable.length > 0 && (
              <button onClick={toggleVisible} className="btn btn-secondary h-8 shrink-0 text-xs">
                {allVisiblePicked ? 'Limpar' : 'Marcar todos'}
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {visible.length === 0 ? (
            <p className="py-12 text-center text-sm text-fg-muted">Nenhum produto com esse nome. Cadastre-o pelo campo da despensa.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visible.map((c) => {
                const p = picked.get(c.name);
                const already = has(c);
                return (
                  <div key={c.name} onClick={() => toggle(c)} role="checkbox" aria-checked={!!p} aria-disabled={already} tabIndex={already ? -1 : 0}
                    onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(c); } }}
                    className={cn('group relative flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-all',
                      already ? 'cursor-default opacity-55' : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md',
                      p ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-border-hover')}>
                    <div className={cn('relative flex aspect-[4/3] items-center justify-center', CATEGORY_TINT[c.category] ?? 'bg-surface-2')}>
                      <span className={cn('select-none text-5xl drop-shadow-sm transition-transform duration-200', !already && 'group-hover:scale-110', p && 'scale-110')} aria-hidden>
                        {c.emoji}
                      </span>
                      {p && <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-on-primary shadow"><Check size={14} strokeWidth={3} /></span>}
                      {already && <span className="absolute left-2 top-2 rounded-md bg-card/90 px-1.5 py-0.5 text-[10px] font-semibold text-fg-2">Já na despensa</span>}
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5 p-3">
                      <div>
                        <p className="truncate text-[13px] font-semibold text-fg">{c.name}</p>
                        <p className="text-[10px] text-fg-muted">{c.category}</p>
                      </div>
                      {p ? (
                        <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-fg-muted">Em casa</span>
                            <Stepper value={p.qty} unit={c.unit} onChange={(v) => edit(c.name, { qty: v })} />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-fg-muted">Avisar com</span>
                            <Stepper value={p.min} unit={c.unit} onChange={(v) => edit(c.name, { min: v })} />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-fg-muted">Validade</span>
                            <div className="flex items-center gap-1">
                              <input type="number" min={1} value={p.shelfDays} onChange={(e) => edit(c.name, { shelfDays: Math.max(1, Number(e.target.value) || 1) })}
                                className="h-6 w-14 rounded-md border border-border bg-card px-1.5 text-right text-[11px] font-semibold tabular-nums text-fg outline-none focus:border-primary" />
                              <span className="text-[10px] text-fg-muted">dias</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-auto flex flex-wrap gap-1 text-[10px]">
                          <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-fg-2">{fmtQtyShort(c.qty, c.unit)}</span>
                          <span className="rounded-md bg-warning-soft px-1.5 py-0.5 text-warning">avisa c/ {fmtQtyShort(c.min, c.unit)}</span>
                          <span className="rounded-md bg-info-soft px-1.5 py-0.5 text-info">~{fmtShelf(c.shelfDays)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-card px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-fg-muted">
            {saving
              ? <>Adicionando <span className="font-semibold text-fg">{saving.done}</span> de {saving.total}...</>
              : picked.size
                ? <><CheckCircle2 size={13} className="mr-1 inline text-accent" /><span className="font-semibold text-fg">{picked.size}</span> produto{picked.size > 1 ? 's' : ''} selecionado{picked.size > 1 ? 's' : ''}</>
                : 'Toque nos produtos para selecionar.'}
          </p>
          {saving && (
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-track sm:mx-4">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(saving.done / saving.total) * 100}%` }} />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={onClose} disabled={!!saving} className="btn btn-secondary">Cancelar</button>
            <button onClick={save} disabled={!picked.size || !!saving} className="btn btn-primary disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Adicionar à despensa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
