'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import {
  X, Search, Plus, Trash2, ExternalLink, Loader2, ShoppingBag, Tag, Truck, CheckCircle2,
  Star, Zap, Check, ArrowDownRight, PenLine, ListChecks, ShoppingCart,
} from '@/components/ui/icons';
import { CurrencyInput } from '@/lib/currency-input';
import { cn } from '@/lib/utils';

type Price = {
  id: string;
  store: string;
  cashPrice: number | string;
  installmentPrice: number | string | null;
  installments: number;
  shipping: number | string;
  link: string | null;
  observations: string | null;
  decision?: string | null;
};

export type SearchResult = {
  id: string;
  title: string;
  price: number;
  priceText: string;
  originalPrice: number | null;
  thumbnail: string | null;
  link: string;
  store: string;
  freeShipping: boolean;
  delivery: string | null;
  rating: number | null;
  reviews: number | null;
  condition: string;
};

type Props = {
  item: { id: string; product: string; imageUrl?: string | null; prices?: Price[] };
  initialTab?: Tab;
  onClose: () => void;
  /** "Comprei aqui" on a quote — the page marks the wish as bought. */
  onBought?: (price: Price) => void;
};

type Tab = 'saved' | 'search' | 'manual';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (v: unknown) => Number(v || 0);
const totalOf = (p: Price) => num(p.cashPrice) + num(p.shipping);

/** Store name from an offer link (www.magazineluiza.com.br → Magazineluiza). */
export const storeFromLink = (link: string) => {
  try {
    const host = new URL(link).hostname.replace(/^www\./, '').split('.')[0];
    return host ? host[0].toUpperCase() + host.slice(1) : '';
  } catch { return ''; }
};

/* SerpAPI quota is small: keep results per query for the session. */
const searchCache = new Map<string, { results: SearchResult[]; noKey: boolean }>();

export async function searchOffers(q: string) {
  const key = q.trim().toLowerCase();
  const hit = searchCache.get(key);
  if (hit) return hit;
  const { data } = await api.get(`/wishlists/search-prices?q=${encodeURIComponent(q.trim())}`);
  const out = { results: (data?.results ?? []) as SearchResult[], noKey: !!data?.noKey };
  if (!out.noKey) searchCache.set(key, out);
  return out;
}

const COMMON_STORES = ['Amazon', 'Mercado Livre', 'Magazine Luiza', 'Americanas', 'Casas Bahia', 'Kabum', 'Shopee', 'AliExpress', 'Fast Shop', 'Carrefour'];
const EMPTY_FORM = { store: '', cashPrice: 0, shipping: 0, installments: 1, installmentPrice: 0, link: '', observations: '' };

export function PriceHuntingModal({ item, initialTab, onClose, onBought }: Props) {
  const [prices, setPrices] = useState<Price[]>(item.prices ?? []);
  const [tab, setTab] = useState<Tab>(initialTab ?? ((item.prices?.length ?? 0) > 0 ? 'saved' : 'search'));
  const [imageSet, setImageSet] = useState(!!item.imageUrl);

  // Search
  const [query, setQuery] = useState(item.product);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const [searching, setSearching] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [onlyNew, setOnlyNew] = useState(false);
  const [onlyFree, setOnlyFree] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'price'>('relevance');

  // Manual
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...prices].sort((a, b) => totalOf(a) - totalOf(b));
  const bestPrice = sorted.length ? totalOf(sorted[0]) : null;
  const worstPrice = sorted.length ? totalOf(sorted[sorted.length - 1]) : null;
  const savings = bestPrice !== null && worstPrice !== null ? worstPrice - bestPrice : 0;

  const search = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const out = await searchOffers(q);
      setNoKey(out.noKey);
      setResults(out.results);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
      setSearched(true);
    }
  }, []);

  // First visit to the search tab runs the search once
  const goTab = (t: Tab) => {
    setTab(t);
    if (t === 'search' && !searched && !searching) search(query);
  };
  useEffect(() => {
    if (tab === 'search') queueMicrotask(() => search(query));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /** First quote with a picture fills the wish image when it has none. */
  const maybeSetImage = async (url: string | null) => {
    if (imageSet || !url) return;
    setImageSet(true);
    try { await api.put(`/wishlists/${item.id}`, { imageUrl: url }); } catch { /* optional */ }
  };

  const addPrice = async (payload: Record<string, unknown>) => {
    const { data } = await api.post(`/wishlists/${item.id}/prices`, payload);
    setPrices((p) => [...p, data]);
    return data as Price;
  };

  const deletePrice = async (id: string) => {
    try {
      await api.delete(`/wishlists/prices/${id}`);
      setPrices((p) => p.filter((x) => x.id !== id));
    } catch { /* ignore */ }
  };

  const importResult = async (r: SearchResult) => {
    setImportingId(r.id);
    try {
      const obs = [r.title, r.condition === 'Usado' ? 'Usado' : null, r.delivery].filter(Boolean).join(' · ');
      await addPrice({ store: r.store, cashPrice: r.price, shipping: 0, link: r.link || undefined, observations: obs.slice(0, 250) || undefined });
      setSavedIds((s) => new Set(s).add(r.id));
      await maybeSetImage(r.thumbnail);
    } catch { /* ignore */ } finally {
      setImportingId(null);
    }
  };

  const saveManual = async (another: boolean) => {
    setError(null);
    if (!form.store.trim()) { setError('Informe a loja.'); return; }
    if (form.cashPrice <= 0) { setError('Informe o preço à vista.'); return; }
    setSaving(true);
    try {
      await addPrice({
        store: form.store.trim(),
        cashPrice: form.cashPrice,
        shipping: form.shipping,
        installments: Math.max(1, form.installments || 1),
        installmentPrice: form.installments > 1 ? form.installmentPrice : 0,
        link: form.link || undefined,
        observations: form.observations || undefined,
      });
      setForm(EMPTY_FORM);
      if (!another) goTab('saved');
    } catch {
      setError('Não foi possível salvar a cotação.');
    } finally {
      setSaving(false);
    }
  };

  const visibleResults = results
    .filter((r) => !onlyNew || r.condition !== 'Usado')
    .filter((r) => !onlyFree || r.freeShipping)
    .sort((a, b) => (sortBy === 'price' ? a.price - b.price : 0));
  const cheapestResult = results.length ? Math.min(...results.map((r) => r.price).filter((p) => p > 0)) : null;

  const knownStores = Array.from(new Set([...prices.map((p) => p.store), ...COMMON_STORES]));
  const instTotal = form.installments > 1 ? form.installmentPrice * form.installments : 0;
  const interest = instTotal > 0 && form.cashPrice > 0 ? ((instTotal - form.cashPrice) / form.cashPrice) * 100 : null;

  const TABS: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'saved', label: 'Cotações', icon: ListChecks, count: prices.length },
    { key: 'search', label: 'Buscar online', icon: Search },
    { key: 'manual', label: 'Adicionar manual', icon: PenLine },
  ];

  const inputCls = 'h-9 w-full rounded-lg border border-border bg-card px-3 text-[13px] text-fg outline-none transition placeholder:text-fg-muted focus:border-primary';

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center md:items-center md:p-4">
      <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl md:max-w-4xl md:rounded-2xl">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex shrink-0 items-start gap-4 px-5 pt-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-2">
            {item.imageUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={item.imageUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
              : <ShoppingBag size={20} strokeWidth={1.5} className="text-fg-muted" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-accent"><Tag size={11} /> Caça preços</p>
            <h2 className="mt-0.5 truncate text-lg font-semibold leading-tight tracking-tight text-fg">{item.product}</h2>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-fg-muted">
              {bestPrice !== null ? (
                <>
                  <span>Melhor: <span className="font-semibold text-accent">{fmt(bestPrice)}</span> · {sorted[0].store}</span>
                  {savings > 0 && <span>Economia pesquisando: <span className="font-semibold text-fg">{fmt(savings)}</span></span>}
                </>
              ) : <span>Nenhuma cotação ainda: busque online ou adicione manualmente.</span>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-hover hover:text-fg">
            <X size={16} />
          </button>
        </div>

        {/* ── Tabs ───────────────────────────────────────────── */}
        <div className="mt-3 shrink-0 border-b border-border px-3">
          <div className="-mb-px flex overflow-x-auto scrollbar-none" role="tablist">
            {TABS.map(({ key, label, icon: Icon, count }) => {
              const active = tab === key;
              return (
                <button key={key} role="tab" aria-selected={active} onClick={() => goTab(key)}
                  className={cn('group flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors',
                    active ? 'border-primary text-fg' : 'border-transparent text-fg-muted hover:border-border-hover hover:text-fg')}>
                  <Icon size={15} strokeWidth={1.75} className={active ? 'text-accent' : 'text-fg-muted group-hover:text-fg-2'} />
                  {label}
                  {count !== undefined && (
                    <span className={cn('min-w-5 rounded-full px-1.5 py-px text-center text-[10px] font-semibold tabular-nums',
                      active ? 'bg-primary-soft text-accent' : 'bg-surface-2 text-fg-muted')}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* Cotações */}
          {tab === 'saved' && (
            prices.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <ShoppingBag size={36} strokeWidth={1.25} className="text-fg-disabled" />
                <p className="mt-3 text-sm font-semibold text-fg">Nenhuma cotação salva</p>
                <p className="mt-1 text-xs text-fg-muted">Compare lojas antes de comprar: salve as ofertas que encontrar.</p>
                <div className="mt-5 flex gap-2">
                  <button onClick={() => goTab('search')} className="btn btn-primary"><Search size={14} /> Buscar online</button>
                  <button onClick={() => goTab('manual')} className="btn btn-secondary"><PenLine size={14} /> Adicionar manual</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {sorted.map((p, idx) => {
                  const t = totalOf(p);
                  const isBest = idx === 0;
                  const diff = bestPrice !== null ? t - bestPrice : 0;
                  const bar = worstPrice ? (t / worstPrice) * 100 : 100;
                  const inst = p.installments > 1 ? p.installments : null;
                  const instValue = inst ? (num(p.installmentPrice) || num(p.cashPrice) / inst) : 0;
                  const instInterest = inst && num(p.installmentPrice) > 0 ? ((instValue * inst - num(p.cashPrice)) / num(p.cashPrice)) * 100 : null;
                  return (
                    <div key={p.id} className={cn('rounded-xl border p-3 transition-colors',
                      isBest ? 'border-primary-border bg-primary-soft' : 'border-border bg-surface-2/50')}>
                      <div className="flex items-start gap-3">
                        <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold',
                          isBest ? 'bg-primary text-on-primary' : 'bg-track text-fg-muted')}>
                          {isBest ? <Star size={11} fill="currentColor" /> : idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2">
                            <p className="text-[13px] font-semibold text-fg">{p.store}</p>
                            {isBest && <span className="text-[11px] font-semibold text-accent">Melhor oferta</span>}
                            {!isBest && diff > 0 && (
                              <span className="text-[11px] text-danger">+{fmt(diff)} ({((diff / bestPrice!) * 100).toFixed(0)}%)</span>
                            )}
                          </div>
                          {p.observations && <p className="mt-0.5 truncate text-[11px] text-fg-muted">{p.observations}</p>}
                          <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-fg-muted">
                            {num(p.shipping) === 0
                              ? <span className="flex items-center gap-1 font-medium text-accent"><Truck size={10} /> Frete grátis</span>
                              : <span>+ {fmt(num(p.shipping))} de frete</span>}
                            {inst && (
                              <span>
                                {inst}× {fmt(instValue)}
                                {instInterest !== null && instInterest > 0.5 && <span className="text-warning"> · {instInterest.toFixed(1)}% de juros</span>}
                                {instInterest !== null && instInterest <= 0.5 && <span className="text-accent"> · sem juros</span>}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-track">
                            <div className={cn('h-full rounded-full', isBest ? 'bg-primary' : 'bg-fg-muted/40')} style={{ width: `${bar}%` }} />
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums text-fg">{fmt(t)}</p>
                          {num(p.shipping) > 0 && <p className="text-[10px] text-fg-muted">{fmt(num(p.cashPrice))} + frete</p>}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-end gap-1.5">
                        {p.link && (
                          <a href={p.link} target="_blank" rel="noreferrer" className="btn btn-secondary h-7 px-2 text-xs">
                            <ExternalLink size={12} /> Ver oferta
                          </a>
                        )}
                        {onBought && (
                          <button onClick={() => onBought(p)} className="btn btn-secondary h-7 px-2 text-xs">
                            <ShoppingCart size={12} /> Comprei aqui
                          </button>
                        )}
                        <button onClick={() => deletePrice(p.id)} aria-label="Remover cotação"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-hover hover:text-danger">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-center gap-2 pt-2">
                  <button onClick={() => goTab('search')} className="btn btn-secondary"><Search size={14} /> Buscar mais ofertas</button>
                  <button onClick={() => goTab('manual')} className="btn btn-secondary"><Plus size={14} /> Adicionar manual</button>
                </div>
              </div>
            )
          )}

          {/* Buscar online */}
          {tab === 'search' && (
            <div className="space-y-3">
              <form onSubmit={(e) => { e.preventDefault(); search(query); }} className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                  <input className={cn(inputCls, 'pl-9')} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar produto..." />
                </div>
                <button type="submit" disabled={searching} className="btn btn-primary disabled:opacity-50">
                  {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Buscar
                </button>
              </form>

              {results.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { on: onlyNew, set: setOnlyNew, label: 'Só novos' },
                    { on: onlyFree, set: setOnlyFree, label: 'Frete grátis' },
                  ].map((f) => (
                    <button key={f.label} onClick={() => f.set(!f.on)}
                      className={cn('flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors',
                        f.on ? 'border-primary-border bg-primary-soft text-accent' : 'border-border text-fg-muted hover:text-fg')}>
                      {f.on && <Check size={12} />}{f.label}
                    </button>
                  ))}
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'relevance' | 'price')}
                    className="h-7 cursor-pointer rounded-full border border-border bg-card px-2.5 text-xs font-medium text-fg-2 outline-none">
                    <option value="relevance">Relevância</option>
                    <option value="price">Menor preço</option>
                  </select>
                  <span className="ml-auto flex items-center gap-1 text-[11px] text-fg-muted">
                    <Zap size={11} className="text-accent" /> {visibleResults.length} de {results.length} · Google Shopping
                  </span>
                </div>
              )}

              {noKey && (
                <div className="rounded-xl border border-warning/30 bg-warning-soft p-3">
                  <p className="text-sm font-semibold text-warning">Busca online indisponível</p>
                  <p className="mt-1 text-xs text-warning">
                    A chave <code>SERPAPI_KEY</code> não está configurada no backend. Você ainda pode adicionar cotações manualmente.
                  </p>
                  <button onClick={() => goTab('manual')} className="mt-2 text-xs font-semibold text-warning underline">Adicionar manual →</button>
                </div>
              )}

              {searching ? (
                <div className="flex flex-col items-center gap-3 py-12 text-fg-muted">
                  <Loader2 size={28} className="animate-spin text-accent" />
                  <p className="text-xs font-medium">Buscando no Google Shopping...</p>
                </div>
              ) : searched && results.length === 0 && !noKey ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <Search size={32} strokeWidth={1.25} className="text-fg-disabled" />
                  <p className="mt-3 text-sm font-semibold text-fg">Nenhum resultado</p>
                  <p className="mt-1 text-xs text-fg-muted">Tente um nome mais curto (ex.: marca + modelo).</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {visibleResults.map((r) => {
                    const discount = r.originalPrice && r.originalPrice > r.price ? Math.round(((r.originalPrice - r.price) / r.originalPrice) * 100) : null;
                    const saved = savedIds.has(r.id);
                    const vsBest = bestPrice !== null ? r.price - bestPrice : null;
                    const isCheapest = cheapestResult !== null && r.price === cheapestResult;
                    return (
                      <div key={r.id} className={cn('flex gap-3 rounded-xl border p-3 transition-colors',
                        saved ? 'border-primary-border bg-primary-soft' : 'border-border bg-surface-2/50 hover:border-border-hover')}>
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                          {r.thumbnail
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={r.thumbnail} alt="" className="h-full w-full object-contain" />
                            : <ShoppingBag size={16} className="text-fg-muted" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-xs font-semibold leading-snug text-fg">{r.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-md bg-track px-1.5 py-0.5 text-[10px] font-semibold text-fg-2">{r.store}</span>
                            {isCheapest && <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">mais barato</span>}
                            {r.condition === 'Usado' && <span className="rounded-md bg-warning-soft px-1.5 py-0.5 text-[10px] font-semibold text-warning">Usado</span>}
                            {r.rating && <span className="text-[10px] text-fg-muted">★ {r.rating.toFixed(1)}{r.reviews ? ` (${r.reviews.toLocaleString('pt-BR')})` : ''}</span>}
                          </div>
                          {r.delivery && (
                            <p className={cn('mt-1 flex items-center gap-1 text-[10px] font-medium', r.freeShipping ? 'text-accent' : 'text-fg-muted')}>
                              <Truck size={10} /> {r.delivery}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end justify-between gap-1">
                          <div className="text-right">
                            <p className="text-sm font-semibold leading-none tabular-nums text-fg">{r.priceText || fmt(r.price)}</p>
                            {discount && (
                              <p className="mt-0.5 text-[10px]">
                                <span className="text-fg-muted line-through">{fmt(r.originalPrice!)}</span>
                                <span className="ml-1 font-semibold text-danger">-{discount}%</span>
                              </p>
                            )}
                            {vsBest !== null && vsBest < 0 && !saved && (
                              <p className="mt-0.5 flex items-center justify-end gap-0.5 text-[10px] font-semibold text-accent">
                                <ArrowDownRight size={10} /> {fmt(-vsBest)} abaixo
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {r.link && (
                              <a href={r.link} target="_blank" rel="noreferrer" aria-label="Abrir oferta"
                                className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-hover hover:text-accent">
                                <ExternalLink size={13} />
                              </a>
                            )}
                            <button onClick={() => !saved && importResult(r)} disabled={importingId === r.id || saved}
                              className={cn('flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold transition-colors',
                                saved ? 'text-accent' : 'bg-primary text-on-primary hover:bg-primary-hover disabled:opacity-50')}>
                              {importingId === r.id ? <Loader2 size={12} className="animate-spin" /> : saved ? <CheckCircle2 size={13} /> : <Plus size={12} strokeWidth={3} />}
                              {saved ? 'Salvo' : 'Salvar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {savedIds.size > 0 && (
                <div className="sticky bottom-0 flex items-center justify-between rounded-xl border border-primary-border bg-card px-3 py-2 shadow-lg">
                  <p className="text-xs text-fg-2"><span className="font-semibold text-accent">{savedIds.size}</span> oferta{savedIds.size > 1 ? 's' : ''} salva{savedIds.size > 1 ? 's' : ''} nesta busca</p>
                  <button onClick={() => goTab('saved')} className="btn btn-primary h-7 px-2.5 text-xs">Comparar cotações</button>
                </div>
              )}
            </div>
          )}

          {/* Adicionar manual */}
          {tab === 'manual' && (
            <form onSubmit={(e) => { e.preventDefault(); saveManual(false); }} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block space-y-1.5 md:col-span-2">
                  <span className="text-[11px] font-semibold text-fg-muted">Link da oferta</span>
                  <input type="url" className={inputCls} value={form.link} placeholder="Cole o link — a loja é preenchida sozinha"
                    onChange={(e) => {
                      const link = e.target.value;
                      setForm((f) => ({ ...f, link, store: f.store || storeFromLink(link) }));
                    }} />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold text-fg-muted">Loja *</span>
                  <input list="ph-stores" className={inputCls} value={form.store} placeholder="Ex: Magazine Luiza"
                    onChange={(e) => setForm({ ...form, store: e.target.value })} />
                  <datalist id="ph-stores">{knownStores.map((s) => <option key={s} value={s} />)}</datalist>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold text-fg-muted">Preço à vista (R$) *</span>
                  <CurrencyInput className={inputCls} value={form.cashPrice} inputMode="decimal"
                    onChange={(v: number) => setForm((f) => ({ ...f, cashPrice: v }))} />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold text-fg-muted">Frete (R$)</span>
                  <div className="flex gap-2">
                    <CurrencyInput className={inputCls} value={form.shipping} inputMode="decimal"
                      onChange={(v: number) => setForm((f) => ({ ...f, shipping: v }))} />
                    <button type="button" onClick={() => setForm((f) => ({ ...f, shipping: 0 }))}
                      className={cn('shrink-0 rounded-lg border px-2.5 text-xs font-medium transition-colors',
                        form.shipping === 0 ? 'border-primary-border bg-primary-soft text-accent' : 'border-border text-fg-muted hover:text-fg')}>
                      Grátis
                    </button>
                  </div>
                </label>
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-fg-muted">Parcelamento</span>
                  <div className="flex gap-2">
                    <select className={cn(inputCls, 'w-24 cursor-pointer')} value={form.installments}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        setForm((f) => ({ ...f, installments: n, installmentPrice: n > 1 && f.cashPrice > 0 ? Math.round((f.cashPrice / n) * 100) / 100 : 0 }));
                      }}>
                      {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 1 ? 'À vista' : `${n}×`}</option>)}
                    </select>
                    {form.installments > 1 && (
                      <CurrencyInput className={inputCls} value={form.installmentPrice} inputMode="decimal" placeholder="Valor da parcela"
                        onChange={(v: number) => setForm((f) => ({ ...f, installmentPrice: v }))} />
                    )}
                  </div>
                </div>
                <label className="block space-y-1.5 md:col-span-2">
                  <span className="text-[11px] font-semibold text-fg-muted">Observações</span>
                  <input className={inputCls} value={form.observations} placeholder="Cor, condição, cupom, validade da oferta..."
                    onChange={(e) => setForm({ ...form, observations: e.target.value })} />
                </label>
              </div>

              {form.cashPrice > 0 && (
                <div className="grid grid-cols-1 gap-2 rounded-xl border border-primary-border bg-primary-soft p-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-semibold text-fg-muted">Total à vista</p>
                    <p className="text-lg font-semibold tabular-nums text-accent">{fmt(form.cashPrice + form.shipping)}</p>
                  </div>
                  {instTotal > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-fg-muted">Total parcelado</p>
                      <p className="text-lg font-semibold tabular-nums text-fg">{fmt(instTotal + form.shipping)}</p>
                      {interest !== null && (
                        <p className={cn('text-[11px] font-medium', interest > 0.5 ? 'text-warning' : 'text-accent')}>
                          {interest > 0.5 ? `${interest.toFixed(1)}% a mais que à vista` : 'Sem juros'}
                        </p>
                      )}
                    </div>
                  )}
                  {bestPrice !== null && (
                    <div>
                      <p className="text-[11px] font-semibold text-fg-muted">Vs. melhor cotação</p>
                      {form.cashPrice + form.shipping < bestPrice
                        ? <p className="text-sm font-semibold text-accent">{fmt(bestPrice - form.cashPrice - form.shipping)} mais barato 🎉</p>
                        : <p className="text-sm font-semibold text-fg-2">{fmt(form.cashPrice + form.shipping - bestPrice)} mais caro</p>}
                    </div>
                  )}
                </div>
              )}

              {error && <p className="text-xs font-medium text-danger">{error}</p>}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" disabled={saving} onClick={() => saveManual(true)} className="btn btn-secondary disabled:opacity-50">
                  Salvar e adicionar outra
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Salvar cotação
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
