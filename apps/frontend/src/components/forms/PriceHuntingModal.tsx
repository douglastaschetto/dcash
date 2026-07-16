'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import {
  X, Search, Plus, Trash2, ExternalLink, Loader2,
  ShoppingBag, Tag, Truck, CheckCircle2,
  Star, ArrowUpRight, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Price = {
  id: string;
  store: string;
  cashPrice: number;
  installmentPrice: number;
  installments: number;
  shipping: number;
  link: string | null;
  observations: string | null;
  decision: string;
};

type SearchResult = {
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
  item: { id: string; product: string; prices?: Price[] };
  onClose: () => void;
};

const TABS = ['Preços Salvos', 'Buscar Online', 'Adicionar Manual'] as const;
type Tab = (typeof TABS)[number];

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function PriceHuntingModal({ item, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('Preços Salvos');
  const [prices, setPrices] = useState<Price[]>(item.prices ?? []);

  // — Search tab state
  const [query, setQuery] = useState(item.product);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [noKey, setNoKey] = useState(false);
  const [searching, setSearching] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  // — Manual tab state
  const [form, setForm] = useState({
    store: '', cashPrice: '', installmentPrice: '', installments: '1',
    shipping: '0', link: '', observations: '',
  });
  const [saving, setSaving] = useState(false);

  const bestPrice = prices.length
    ? Math.min(...prices.map((p) => p.cashPrice + p.shipping))
    : null;

  const search = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setSearching(true);
    setNoKey(false);
    try {
      const { data } = await api.get(`/wishlists/search-prices?q=${encodeURIComponent(q)}`);
      if (data?.noKey) {
        setNoKey(true);
        setResults([]);
      } else {
        setResults(data?.results ?? []);
      }
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Auto-search when switching to online tab
  useEffect(() => {
    if (tab === 'Buscar Online' && results.length === 0) search(query);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const deletePrice = async (id: string) => {
    try {
      await api.delete(`/wishlists/prices/${id}`);
      setPrices((p) => p.filter((x) => x.id !== id));
    } catch { /* ignore */ }
  };

  const importResult = async (r: SearchResult) => {
    setImportingId(r.id);
    try {
      const obs = [r.condition, r.delivery].filter(Boolean).join(' · ');
      const { data } = await api.post(`/wishlists/${item.id}/prices`, {
        store: r.store,
        cashPrice: r.price,
        shipping: r.freeShipping ? 0 : 0,
        link: r.link,
        observations: obs || null,
      });
      setPrices((p) => [...p, data]);
      setTab('Preços Salvos');
    } catch { /* ignore */ } finally {
      setImportingId(null);
    }
  };

  const saveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post(`/wishlists/${item.id}/prices`, {
        store: form.store,
        cashPrice: parseFloat(form.cashPrice.replace(',', '.')),
        installmentPrice: parseFloat(form.installmentPrice.replace(',', '.') || '0'),
        installments: parseInt(form.installments),
        shipping: parseFloat(form.shipping.replace(',', '.') || '0'),
        link: form.link || null,
        observations: form.observations || null,
      });
      setPrices((p) => [...p, data]);
      setForm({ store: '', cashPrice: '', installmentPrice: '', installments: '1', shipping: '0', link: '', observations: '' });
      setTab('Preços Salvos');
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full md:max-w-4xl md:rounded-[2rem] bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 pt-6 pb-0 flex items-start justify-between gap-4 shrink-0">
          <div>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] italic flex items-center gap-1.5">
              <Tag size={11} /> Caça Preços
            </p>
            <h2 className="text-lg font-black uppercase italic tracking-tighter text-zinc-900 dark:text-white mt-0.5 leading-none">
              {item.product}
            </h2>
            {bestPrice !== null && (
              <p className="text-xs text-zinc-400 mt-1">
                Melhor preço salvo:{' '}
                <span className="text-emerald-500 font-black">{fmt(bestPrice)}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex gap-1.5 shrink-0 border-b border-zinc-100 dark:border-zinc-900">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-3.5 py-2 rounded-t-xl text-[10px] font-black uppercase tracking-widest transition-all border-b-2',
                tab === t
                  ? 'bg-emerald-500 text-white border-transparent'
                  : 'text-zinc-400 border-transparent hover:text-zinc-700 dark:hover:text-zinc-200',
              )}
            >
              {t}
              {t === 'Preços Salvos' && prices.length > 0 && (
                <span className="ml-1.5 bg-white/20 dark:bg-zinc-800 text-[9px] px-1.5 py-0.5 rounded-full">
                  {prices.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5">

          {/* ─── Tab: Preços Salvos ─────────────────────────────── */}
          {tab === 'Preços Salvos' && (
            <div className="space-y-3">
              {prices.length === 0 ? (
                <div className="py-10 flex flex-col items-center text-zinc-300 dark:text-zinc-800">
                  <ShoppingBag size={48} strokeWidth={1} />
                  <p className="mt-3 text-[11px] font-black uppercase tracking-[0.3em] italic">
                    Nenhum preço salvo ainda
                  </p>
                  <button
                    onClick={() => setTab('Buscar Online')}
                    className="mt-4 px-6 py-2.5 bg-emerald-500 text-white rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 transition"
                  >
                    Buscar online
                  </button>
                </div>
              ) : (
                <>
                  {/* Summary strip */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: 'Total de cotações', value: prices.length.toString() },
                      { label: 'Menor preço + frete', value: bestPrice !== null ? fmt(bestPrice) : '—' },
                      {
                        label: 'Maior preço + frete',
                        value: prices.length
                          ? fmt(Math.max(...prices.map((p) => p.cashPrice + p.shipping)))
                          : '—',
                      },
                    ].map((s) => (
                      <div key={s.label} className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-3">
                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{s.label}</p>
                        <p className="text-base font-black text-zinc-900 dark:text-white mt-0.5">{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {prices
                    .slice()
                    .sort((a, b) => a.cashPrice + a.shipping - (b.cashPrice + b.shipping))
                    .map((p, idx) => {
                      const total = p.cashPrice + p.shipping;
                      const isBest = total === bestPrice;
                      return (
                        <div
                          key={p.id}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-xl border transition-all',
                            isBest
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                              : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800',
                          )}
                        >
                          <div className="w-6 h-6 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-500 shrink-0">
                            {idx + 1}
                          </div>
                          {isBest && (
                            <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                              <Star size={9} fill="currentColor" /> Melhor
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-zinc-900 dark:text-white uppercase tracking-tight text-xs">{p.store}</p>
                            {p.observations && (
                              <p className="text-[9px] text-zinc-400 mt-0.5 truncate">{p.observations}</p>
                            )}
                            {p.installments > 1 && (
                              <p className="text-[9px] text-zinc-400">
                                {p.installments}× {fmt(p.installmentPrice || p.cashPrice / p.installments)}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-black text-sm text-zinc-900 dark:text-white">{fmt(p.cashPrice)}</p>
                            {p.shipping === 0 ? (
                              <p className="text-[9px] text-emerald-500 font-bold flex items-center gap-1 justify-end">
                                <Truck size={9} /> Grátis
                              </p>
                            ) : (
                              <p className="text-[9px] text-zinc-400">+ {fmt(p.shipping)} frete</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {p.link && (
                              <a
                                href={p.link}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:text-emerald-500 transition text-zinc-400"
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                            <button
                              onClick={() => deletePrice(p.id)}
                              className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:text-red-500 transition text-zinc-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </>
              )}
            </div>
          )}

          {/* ─── Tab: Buscar Online ─────────────────────────────── */}
          {tab === 'Buscar Online' && (
            <div>
              {/* Search bar */}
              <div className="flex gap-2 mb-4">
                <input
                  className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium focus:border-emerald-500 outline-none transition"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && search(query)}
                  placeholder="Buscar produto..."
                />
                <button
                  onClick={() => search(query)}
                  disabled={searching}
                  className="px-5 py-3 bg-emerald-500 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-emerald-600 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  Buscar
                </button>
              </div>

              {/* No API key warning */}
              {noKey && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-400">
                    Chave SerpAPI não configurada
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                    Adicione <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">SERPAPI_KEY=sua_chave</code> no <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">.env</code> do backend.
                    Crie uma conta gratuita em <strong>serpapi.com</strong> (100 buscas/mês grátis).
                  </p>
                </div>
              )}

              {searching ? (
                <div className="py-10 flex flex-col items-center gap-3 text-zinc-400">
                  <Loader2 size={32} className="animate-spin text-emerald-500" />
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] italic">
                    Buscando no Google Shopping...
                  </p>
                </div>
              ) : results.length === 0 && !noKey ? (
                <div className="py-10 flex flex-col items-center text-zinc-300 dark:text-zinc-800">
                  <Search size={48} strokeWidth={1} />
                  <p className="mt-3 text-[11px] font-black uppercase tracking-[0.3em] italic text-zinc-400">
                    Nenhum resultado
                  </p>
                </div>
              ) : results.length > 0 ? (
                <>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Zap size={12} className="text-emerald-500" />
                    {results.length} resultados · Google Shopping · clique + para salvar
                  </p>
                  <div className="space-y-2">
                    {results.map((r) => {
                      const discount =
                        r.originalPrice && r.originalPrice > r.price
                          ? Math.round(((r.originalPrice - r.price) / r.originalPrice) * 100)
                          : null;
                      return (
                        <div
                          key={r.id}
                          className="flex gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-400 transition-all"
                        >
                          {/* Thumbnail */}
                          {r.thumbnail ? (
                            <img
                              src={r.thumbnail}
                              alt={r.title}
                              className="w-12 h-12 object-contain rounded-lg bg-white shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-zinc-200 dark:bg-zinc-800 shrink-0 flex items-center justify-center">
                              <ShoppingBag size={16} className="text-zinc-400" />
                            </div>
                          )}

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-snug line-clamp-2">
                              {r.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="text-[9px] font-black text-zinc-500 bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">
                                {r.store}
                              </span>
                              {r.condition === 'Usado' && (
                                <span className="text-[9px] font-black text-amber-600 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded-full">
                                  Usado
                                </span>
                              )}
                              {r.rating && (
                                <span className="text-[9px] text-zinc-400 flex items-center gap-1">
                                  ★ {r.rating.toFixed(1)}
                                  {r.reviews ? ` (${r.reviews.toLocaleString('pt-BR')})` : ''}
                                </span>
                              )}
                            </div>
                            {r.delivery && (
                              <p className={cn(
                                'text-[9px] font-bold mt-1 flex items-center gap-1',
                                r.freeShipping ? 'text-emerald-500' : 'text-zinc-400',
                              )}>
                                <Truck size={9} />
                                {r.delivery}
                              </p>
                            )}
                          </div>

                          {/* Price + actions */}
                          <div className="flex flex-col items-end justify-between shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-black text-zinc-900 dark:text-white leading-none">
                                {r.priceText || fmt(r.price)}
                              </p>
                              {discount && (
                                <div className="flex items-center gap-1 justify-end mt-0.5">
                                  {r.originalPrice && (
                                    <span className="text-[9px] text-zinc-400 line-through">
                                      {fmt(r.originalPrice)}
                                    </span>
                                  )}
                                  <span className="text-[9px] font-black text-red-500 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded-full">
                                    -{discount}%
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <a
                                href={r.link}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 text-zinc-400 hover:text-emerald-500 transition"
                              >
                                <ArrowUpRight size={13} />
                              </a>
                              <button
                                onClick={() => importResult(r)}
                                disabled={importingId === r.id}
                                className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition disabled:opacity-50"
                                title="Salvar cotação"
                              >
                                {importingId === r.id ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Plus size={13} strokeWidth={3} />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* ─── Tab: Adicionar Manual ──────────────────────────── */}
          {tab === 'Adicionar Manual' && (
            <form onSubmit={saveManual} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                    Nome da Loja *
                  </label>
                  <input
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium focus:border-emerald-500 outline-none transition"
                    value={form.store}
                    onChange={(e) => setForm({ ...form, store: e.target.value })}
                    placeholder="Ex: Magazine Luiza, Americanas..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                    Preço à Vista *
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium focus:border-emerald-500 outline-none transition"
                    value={form.cashPrice}
                    onChange={(e) => setForm({ ...form, cashPrice: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                    Frete (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium focus:border-emerald-500 outline-none transition"
                    value={form.shipping}
                    onChange={(e) => setForm({ ...form, shipping: e.target.value })}
                    placeholder="0 = grátis"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                    Valor da Parcela (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium focus:border-emerald-500 outline-none transition"
                    value={form.installmentPrice}
                    onChange={(e) => setForm({ ...form, installmentPrice: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                    Nº de Parcelas
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium focus:border-emerald-500 outline-none transition"
                    value={form.installments}
                    onChange={(e) => setForm({ ...form, installments: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                    Link da Oferta
                  </label>
                  <input
                    type="url"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium focus:border-emerald-500 outline-none transition"
                    value={form.link}
                    onChange={(e) => setForm({ ...form, link: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                    Observações
                  </label>
                  <textarea
                    rows={2}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium focus:border-emerald-500 outline-none transition resize-none"
                    value={form.observations}
                    onChange={(e) => setForm({ ...form, observations: e.target.value })}
                    placeholder="Condição, validade da oferta..."
                  />
                </div>
              </div>

              {/* Preview */}
              {form.cashPrice && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total estimado</p>
                    <p className="text-lg font-black text-emerald-600">
                      {fmt(parseFloat(form.cashPrice || '0') + parseFloat(form.shipping || '0'))}
                    </p>
                  </div>
                  <CheckCircle2 size={24} className="text-emerald-400" />
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={3} />}
                Salvar Cotação
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
