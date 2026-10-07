'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/app-layout';
import api from '@/services/api';
import {
  ShoppingBag, Plus, Trash2, ImageIcon, Link2, RefreshCw, Pencil, Search, CheckCircle2, Clock, ArrowUpRight,
  Loader2, Lightbulb, PiggyBank, Tag, Hourglass, Truck, TrendingDown, Sparkles, Undo2, Flame,
} from '@/components/ui/icons';
import { PriceHuntingModal, searchOffers, storeFromLink, type SearchResult } from '@/components/forms/PriceHuntingModal';
import { Modal } from '@/app/dashboard-v2/components/Modal';
import { CurrencyInput } from '@/lib/currency-input';
import { cn } from '@/lib/utils';

type Price = {
  id: string;
  store: string;
  cashPrice: number | string;
  installmentPrice: number | string | null;
  installments: number;
  shipping: number | string;
};

type WishItem = {
  id: string;
  product: string;
  imageUrl: string | null;
  categoryId: string | null;
  priority: string;
  link: string | null;
  bought: boolean;
  prices: Price[];
  created_at?: string;
};

type Tab = 'pending' | 'bought' | 'all';
type Sort = 'priority' | 'price-asc' | 'price-desc' | 'recent';

const PRIORITIES = ['1 - Essencial', '2 - Médio', '3 - Baixo'];
const PRIORITY_STYLE: Record<string, { label: string; cls: string; dot: string }> = {
  '1': { label: 'Essencial', cls: 'bg-danger-soft text-danger border-danger/30', dot: 'bg-danger' },
  '2': { label: 'Médio', cls: 'bg-warning-soft text-warning border-warning/30', dot: 'bg-warning' },
  '3': { label: 'Baixo', cls: 'bg-surface-2 text-fg-2 border-border', dot: 'bg-fg-muted' },
};
const REFLECTION_DAYS = 30;

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const prioKey = (p: string) => (p?.[0] && PRIORITY_STYLE[p[0]] ? p[0] : '2');
const total = (p: Price) => Number(p.cashPrice || 0) + Number(p.shipping || 0);
const best = (i: WishItem) => (i.prices?.length ? i.prices.reduce((a, b) => (total(b) < total(a) ? b : a)) : null);
const worst = (i: WishItem) => (i.prices?.length ? Math.max(...i.prices.map(total)) : null);
const daysOnList = (i: WishItem) => {
  if (!i.created_at) return null;
  const d = Math.floor((Date.now() - new Date(i.created_at).getTime()) / 86_400_000);
  return Number.isFinite(d) ? Math.max(d, 0) : null;
};

type WebImage = { id: string; thumbnail: string; original: string; title: string; source: string };

/* Image searches use the small SerpAPI quota: keep results per term for the session. */
const imageCache = new Map<string, WebImage[]>();

const canLoad = (src: string, timeout = 4000) => new Promise<boolean>((resolve) => {
  const img = new Image();
  const t = setTimeout(() => resolve(false), timeout);
  img.onload = () => { clearTimeout(t); resolve(img.naturalWidth > 0); };
  img.onerror = () => { clearTimeout(t); resolve(false); };
  img.referrerPolicy = 'no-referrer';
  img.src = src;
});

const EMPTY_FORM = { product: '', priority: '2 - Médio', link: '', imageUrl: '', bought: false };

export default function WishlistPage() {
  const [items, setItems] = useState<WishItem[]>([]);
  const [piggyTotal, setPiggyTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<WishItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>('pending');
  const [query, setQuery] = useState('');
  const [prioFilter, setPrioFilter] = useState<string>('all');
  const [sort, setSort] = useState<Sort>('priority');

  const [form, setForm] = useState(EMPTY_FORM);

  /* Price hunt linked to the wish form */
  const [offers, setOffers] = useState<SearchResult[] | null>(null);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersNoKey, setOffersNoKey] = useState(false);
  const [picked, setPicked] = useState<SearchResult | null>(null);
  const [seenPrice, setSeenPrice] = useState(0);
  const [huntAfter, setHuntAfter] = useState(true);
  const [huntTab, setHuntTab] = useState<'saved' | 'search' | 'manual' | undefined>(undefined);

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      const [w, pb] = await Promise.allSettled([api.get('/wishlists'), api.get('/piggy-banks')]);
      if (w.status === 'fulfilled') setItems(w.value.data ?? []);
      if (pb.status === 'fulfilled') {
        setPiggyTotal((pb.value.data ?? []).reduce((s: number, b: { balance?: number | string }) => s + Number(b.balance || 0), 0));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  /* ── Imagem de referência (busca na web) ─────────────────── */
  const [imgOpen, setImgOpen] = useState(false);
  const [imgQuery, setImgQuery] = useState('');
  const [images, setImages] = useState<WebImage[] | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgNoKey, setImgNoKey] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [pasteUrl, setPasteUrl] = useState(false);

  const searchImages = async (q: string) => {
    if (!q.trim()) return;
    setImgOpen(true);
    setImgQuery(q);
    const key = q.trim().toLowerCase();
    const hit = imageCache.get(key);
    if (hit) { setImages(hit); setImgNoKey(false); return; }
    setImgLoading(true);
    try {
      const { data } = await api.get(`/wishlists/search-images?q=${encodeURIComponent(q.trim())}`);
      setImgNoKey(!!data?.noKey);
      const list: WebImage[] = data?.images ?? [];
      if (!data?.noKey) imageCache.set(key, list);
      setImages(list);
    } catch {
      setImages([]);
    } finally {
      setImgLoading(false);
    }
  };

  /** Prefer the full-size picture; fall back to the thumbnail when the site blocks hotlinking. */
  const applyImage = async (img: WebImage) => {
    setApplying(img.id);
    const ok = await canLoad(img.original);
    setForm((f) => ({ ...f, imageUrl: ok ? img.original : img.thumbnail }));
    setApplying(null);
    setImgOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, link: form.link || null, imageUrl: form.imageUrl || null };
      if (editingId) {
        await api.put(`/wishlists/${editingId}`, payload);
        resetForm();
        fetch_();
        return;
      }
      const { data: created } = await api.post('/wishlists', payload);
      const prices: unknown[] = [];
      // Offer picked from the search -> first quote
      if (picked) {
        const { data } = await api.post(`/wishlists/${created.id}/prices`, {
          store: picked.store, cashPrice: picked.price, shipping: 0,
          link: picked.link || undefined, observations: picked.title.slice(0, 250) || undefined,
        });
        prices.push(data);
      } else if (seenPrice > 0) {
        // Price typed by hand -> quote from the reference link's store
        const { data } = await api.post(`/wishlists/${created.id}/prices`, {
          store: storeFromLink(form.link) || 'Loja', cashPrice: seenPrice, shipping: 0, link: form.link || undefined,
        });
        prices.push(data);
      }
      const openAfter = huntAfter && !form.bought;
      resetForm();
      fetch_();
      if (openAfter) {
        setHuntTab(prices.length ? 'search' : undefined);
        setSelectedItem({ ...created, prices } as WishItem);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg ?? 'Erro ao salvar produto.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este item da lista?')) return;
    try {
      await api.delete(`/wishlists/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch { /* ignore */ }
  };

  const toggleBought = async (item: WishItem) => {
    setToggling(item.id);
    try {
      await api.put(`/wishlists/${item.id}`, { bought: !item.bought });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, bought: !i.bought } : i)));
    } catch { /* ignore */ } finally {
      setToggling(null);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setForm(EMPTY_FORM);
    setOffers(null);
    setOffersNoKey(false);
    setImgOpen(false);
    setImages(null);
    setPasteUrl(false);
    setPicked(null);
    setSeenPrice(0);
    setHuntAfter(true);
  };

  const findOffers = async () => {
    if (!form.product.trim()) return;
    setOffersLoading(true);
    try {
      const out = await searchOffers(form.product);
      setOffersNoKey(out.noKey);
      setOffers(out.results.filter((r) => r.price > 0).sort((a, b) => a.price - b.price).slice(0, 6));
    } catch {
      setOffers([]);
    } finally {
      setOffersLoading(false);
    }
  };

  const pickOffer = (r: SearchResult) => {
    if (picked?.id === r.id) { setPicked(null); return; }
    setPicked(r);
    setForm((f) => ({ ...f, imageUrl: f.imageUrl || r.thumbnail || '', link: f.link || r.link }));
  };

  const markBoughtFromQuote = async (item: WishItem) => {
    try { await api.put(`/wishlists/${item.id}`, { bought: true }); } catch { /* ignore */ }
    setSelectedItem(null);
    fetch_();
  };

  const openHunt = (item: WishItem) => { setHuntTab(undefined); setSelectedItem(item); };

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); };
  const startEdit = (item: WishItem) => {
    setEditingId(item.id);
    setForm({ product: item.product, priority: item.priority, link: item.link ?? '', imageUrl: item.imageUrl ?? '', bought: item.bought });
    setShowForm(true);
  };

  /* ── Derived data ───────────────────────────────────────────── */
  const pending = items.filter((i) => !i.bought);
  const acquired = items.filter((i) => i.bought);
  const quoted = pending.filter((i) => i.prices?.length);
  const unquoted = pending.filter((i) => !i.prices?.length);
  const listTotal = quoted.reduce((s, i) => s + total(best(i)!), 0);
  const essentials = quoted.filter((i) => prioKey(i.priority) === '1');
  const essentialsTotal = essentials.reduce((s, i) => s + total(best(i)!), 0);
  const essentialsCount = pending.filter((i) => prioKey(i.priority) === '1').length;
  const savings = quoted.reduce((s, i) => s + ((worst(i) ?? 0) - total(best(i)!)), 0);
  const acquiredTotal = acquired.filter((i) => i.prices?.length).reduce((s, i) => s + total(best(i)!), 0);
  const donePct = items.length ? (acquired.length / items.length) * 100 : 0;
  const piggyCover = listTotal > 0 ? Math.min((piggyTotal / listTotal) * 100, 100) : 0;
  const reflected = pending.filter((i) => (daysOnList(i) ?? 0) >= REFLECTION_DAYS);
  const cooling = pending.filter((i) => { const d = daysOnList(i); return d !== null && d < REFLECTION_DAYS; });
  const freeShipping = quoted.filter((i) => Number(best(i)!.shipping || 0) === 0).length;
  const priciest = quoted.length ? quoted.reduce((a, b) => (total(best(b)!) > total(best(a)!) ? b : a)) : null;
  const affordable = [...quoted].sort((a, b) => total(best(a)!) - total(best(b)!)).filter((i) => total(best(i)!) <= piggyTotal);
  const nextBuy = [...quoted].sort((a, b) => prioKey(a.priority).localeCompare(prioKey(b.priority)) || total(best(a)!) - total(best(b)!))[0] ?? null;

  const counts: Record<Tab, number> = { pending: pending.length, bought: acquired.length, all: items.length };
  const base = tab === 'pending' ? pending : tab === 'bought' ? acquired : items;
  const q = query.trim().toLowerCase();
  const visible = base
    .filter((i) => !q || i.product.toLowerCase().includes(q))
    .filter((i) => prioFilter === 'all' || prioKey(i.priority) === prioFilter)
    .sort((a, b) => {
      const pa = best(a) ? total(best(a)!) : null;
      const pb = best(b) ? total(best(b)!) : null;
      if (sort === 'priority') return prioKey(a.priority).localeCompare(prioKey(b.priority)) || (pa ?? Infinity) - (pb ?? Infinity);
      if (sort === 'price-asc') return (pa ?? Infinity) - (pb ?? Infinity);
      if (sort === 'price-desc') return (pb ?? -Infinity) - (pa ?? -Infinity);
      return (b.created_at ?? '').localeCompare(a.created_at ?? '');
    });

  const insights: { icon: React.ElementType; tone: string; title: string; text: string; action?: { label: string; onClick: () => void } }[] = [];
  if (nextBuy) insights.push({
    icon: Sparkles, tone: 'text-accent bg-primary-soft', title: 'Próxima compra sugerida',
    text: `${nextBuy.product} — ${PRIORITY_STYLE[prioKey(nextBuy.priority)].label.toLowerCase()}, melhor oferta ${fmt(total(best(nextBuy)!))} na ${best(nextBuy)!.store}.`,
  });
  if (unquoted.length) insights.push({
    icon: Search, tone: 'text-info bg-info-soft', title: `${unquoted.length} desejo${unquoted.length > 1 ? 's' : ''} sem cotação`,
    text: 'Sem preço não dá pra planejar. Caça uns preços antes de decidir.',
    action: { label: `Cotar ${unquoted[0].product}`, onClick: () => openHunt(unquoted[0]) },
  });
  if (savings > 0) insights.push({
    icon: TrendingDown, tone: 'text-accent bg-primary-soft', title: `${fmt(savings)} de economia`,
    text: 'É a diferença entre a oferta mais cara e a mais barata que você cotou. Pesquisar compensa.',
  });
  if (reflected.length) insights.push({
    icon: Hourglass, tone: 'text-warning bg-warning-soft', title: `Regra dos ${REFLECTION_DAYS} dias`,
    text: `${reflected.length} desejo${reflected.length > 1 ? 's já passaram' : ' já passou'} do período de reflexão. Se ainda faz sentido, é um desejo de verdade; se não, tira da lista.`,
  });
  if (cooling.length) insights.push({
    icon: Clock, tone: 'text-fg-2 bg-surface-2', title: `${cooling.length} ainda esfriando`,
    text: `Adicionados há menos de ${REFLECTION_DAYS} dias. Segura o impulso mais um pouco.`,
  });
  if (listTotal > 0 && piggyTotal > 0) insights.push({
    icon: PiggyBank, tone: 'text-accent bg-primary-soft', title: `Cofrinhos cobrem ${piggyCover.toFixed(0)}% da lista`,
    text: affordable.length
      ? `Com ${fmt(piggyTotal)} guardados, dá pra comprar à vista: ${affordable.slice(0, 2).map((i) => i.product).join(', ')}${affordable.length > 2 ? '…' : ''}.`
      : `Você tem ${fmt(piggyTotal)} guardados — ainda não cobre nenhum item inteiro.`,
  });
  if (priciest && quoted.length > 1) insights.push({
    icon: Flame, tone: 'text-danger bg-danger-soft', title: 'O mais pesado da lista',
    text: `${priciest.product} representa ${((total(best(priciest)!) / listTotal) * 100).toFixed(0)}% do total cotado.`,
  });
  if (freeShipping > 0) insights.push({
    icon: Truck, tone: 'text-info bg-info-soft', title: `${freeShipping} com frete grátis`,
    text: 'Na melhor oferta cotada, o frete não pesa.',
  });

  const headerButton = (
    <button data-tour="wishlists-add-btn" onClick={openCreate} className="btn btn-primary">
      <Plus size={15} /> Novo desejo
    </button>
  );

  return (
    <AppLayout title="Lista de Desejos" subtitle="Seus objetivos de compra" actions={headerButton} noPadding>
      <div className="h-full overflow-y-auto">
        <div className="w-full space-y-4 p-4 md:p-6">

          {/* ── KPIs ───────────────────────────────────────────── */}
          <section data-tour="wishlists-summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="hero-card relative overflow-hidden rounded-2xl p-5">
              <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full border border-white/10" />
              <p className="flex items-center gap-2 text-[13px] font-medium text-white/70"><ShoppingBag size={15} strokeWidth={1.75} /> Total da lista</p>
              <p className="mt-4 text-[26px] font-semibold leading-none tracking-tight tabular-nums">{fmt(listTotal)}</p>
              <p className="mt-3 text-[11px] text-white/60">
                {pending.length} pendente{pending.length === 1 ? '' : 's'} · {quoted.length} com cotação
              </p>
            </div>

            <Kpi icon={Flame} label="Essenciais" value={fmt(essentialsTotal)}
              foot={`${essentialsCount} ite${essentialsCount === 1 ? 'm' : 'ns'} de prioridade alta`} />

            <Kpi icon={PiggyBank} label="Guardado em cofrinhos" value={fmt(piggyTotal)}>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-track">
                <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${piggyCover}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-fg-muted">{listTotal > 0 ? `${piggyCover.toFixed(0)}% da lista coberta` : 'Cote preços para comparar'}</p>
            </Kpi>

            <Kpi icon={CheckCircle2} label="Conquistados" value={`${acquired.length} de ${items.length}`}>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-track">
                <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${donePct}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-fg-muted">{acquiredTotal > 0 ? `${fmt(acquiredTotal)} realizados` : `${donePct.toFixed(0)}% da lista realizada`}</p>
            </Kpi>
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
            {/* ── Main column ─────────────────────────────────── */}
            <div className="min-w-0 space-y-4">
              {/* Tabs */}
              <div className="border-b border-border">
                <div className="-mb-px flex overflow-x-auto scrollbar-none" role="tablist">
                  {([['pending', 'Pendentes', Clock], ['bought', 'Adquiridos', CheckCircle2], ['all', 'Todos', ShoppingBag]] as const).map(([key, label, Icon]) => {
                    const active = tab === key;
                    return (
                      <button key={key} role="tab" aria-selected={active} onClick={() => setTab(key)}
                        className={cn('group flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors',
                          active ? 'border-primary text-fg' : 'border-transparent text-fg-muted hover:border-border-hover hover:text-fg')}>
                        <Icon size={15} strokeWidth={1.75} className={active ? 'text-accent' : 'text-fg-muted group-hover:text-fg-2'} />
                        {label}
                        <span className={cn('min-w-5 rounded-full px-1.5 py-px text-center text-[10px] font-semibold tabular-nums',
                          active ? 'bg-primary-soft text-accent' : 'bg-surface-2 text-fg-muted')}>{counts[key]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar desejo..."
                    className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-[13px] text-fg outline-none transition placeholder:text-fg-muted focus:border-primary" />
                </div>
                <div className="flex gap-2">
                  <div className="flex rounded-lg border border-border bg-surface-2 p-0.5">
                    {[['all', 'Todas'], ['1', 'Essencial'], ['2', 'Médio'], ['3', 'Baixo']].map(([k, l]) => (
                      <button key={k} onClick={() => setPrioFilter(k)}
                        className={cn('flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
                          prioFilter === k ? 'border-border bg-card text-fg shadow-xs' : 'border-transparent text-fg-muted hover:text-fg')}>
                        {k !== 'all' && <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_STYLE[k].dot)} />}{l}
                      </button>
                    ))}
                  </div>
                  <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}
                    className="h-9 cursor-pointer rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-fg-2 outline-none focus:border-primary">
                    <option value="priority">Prioridade</option>
                    <option value="price-asc">Menor preço</option>
                    <option value="price-desc">Maior preço</option>
                    <option value="recent">Mais recentes</option>
                  </select>
                </div>
              </div>

              {loading && items.length === 0 && (
                <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-accent" /></div>
              )}

              {!loading && items.length === 0 && (
                <div className="rounded-2xl border border-border bg-card p-12 text-center">
                  <ShoppingBag size={32} strokeWidth={1.5} className="mx-auto mb-3 text-fg-disabled" />
                  <p className="text-base font-semibold text-fg">Sua lista de desejos está vazia</p>
                  <p className="mt-1 text-sm text-fg-muted">Anote o que quer comprar, cote preços e compre na hora certa.</p>
                  <button onClick={openCreate} className="btn btn-primary mt-5"><Plus size={16} /> Adicionar primeiro desejo</button>
                </div>
              )}

              {items.length > 0 && visible.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                  <p className="text-[13px] font-medium text-fg">Nada por aqui com esses filtros</p>
                  <p className="mt-1 text-xs text-fg-muted">Tente outra aba, prioridade ou busca.</p>
                </div>
              )}

              {visible.length > 0 && (
                <section data-tour="wishlists-pending-section"
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {visible.map((item) => (
                    <WishCard key={item.id} item={item} onEdit={startEdit} onDelete={handleDelete}
                      onHunt={openHunt} onToggle={toggleBought} toggling={toggling === item.id} piggyTotal={piggyTotal} />
                  ))}
                </section>
              )}
            </div>

            {/* ── Insights rail ──────────────────────────────── */}
            <aside className="min-w-0 space-y-4">
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Lightbulb size={16} strokeWidth={1.75} className="text-accent" />
                  <h2 className="text-sm font-semibold text-fg">Insights</h2>
                </div>
                {insights.length === 0 ? (
                  <p className="text-[13px] text-fg-muted">Adicione desejos e cote preços para ver análises da sua lista.</p>
                ) : (
                  <ul className="space-y-3">
                    {insights.map((ins) => (
                      <li key={ins.title} className="flex gap-3">
                        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', ins.tone)}>
                          <ins.icon size={15} strokeWidth={1.75} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-fg">{ins.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{ins.text}</p>
                          {ins.action && (
                            <button onClick={ins.action.onClick} className="mt-1 text-xs font-semibold text-accent hover:underline">{ins.action.label} →</button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Priority breakdown */}
              {pending.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="mb-4 text-sm font-semibold text-fg">Por prioridade</h2>
                  <div className="space-y-3">
                    {['1', '2', '3'].map((k) => {
                      const list = pending.filter((i) => prioKey(i.priority) === k);
                      const value = list.filter((i) => i.prices?.length).reduce((s, i) => s + total(best(i)!), 0);
                      const pct = listTotal > 0 ? (value / listTotal) * 100 : 0;
                      return (
                        <button key={k} onClick={() => { setTab('pending'); setPrioFilter(prioFilter === k ? 'all' : k); }} className="block w-full text-left">
                          <div className="flex items-center justify-between text-[13px]">
                            <span className="flex items-center gap-2 text-fg-2">
                              <span className={cn('h-2 w-2 rounded-full', PRIORITY_STYLE[k].dot)} />
                              {PRIORITY_STYLE[k].label}
                              <span className="text-[11px] text-fg-muted">{list.length}</span>
                            </span>
                            <span className="font-semibold tabular-nums text-fg">{fmt(value)}</span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-track">
                            <div className={cn('h-full rounded-full transition-all duration-700', PRIORITY_STYLE[k].dot)} style={{ width: `${pct}%` }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

      {/* ── Form modal ───────────────────────────────────────── */}
      {showForm && (
        <Modal title={editingId ? 'Editar desejo' : 'Novo desejo'} onClose={resetForm}>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex gap-4">
              <div className="w-28 shrink-0">
                <button type="button" onClick={() => searchImages(form.product)} disabled={!form.product.trim()}
                  title={form.product.trim() ? 'Buscar imagem na web' : 'Digite o produto para buscar uma imagem'}
                  className="group relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-surface-2 transition-all hover:border-primary disabled:cursor-not-allowed disabled:hover:border-border">
                  {form.imageUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.imageUrl} referrerPolicy="no-referrer" className="h-full w-full bg-white object-contain" alt="Imagem do desejo" />
                      <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-overlay py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                        <RefreshCw size={10} /> Trocar
                      </span>
                    </>
                  ) : (
                    <span className="flex flex-col items-center px-2 text-center text-fg-disabled transition-colors group-enabled:group-hover:text-accent">
                      <ImageIcon size={22} strokeWidth={1.25} />
                      <span className="mt-1 text-[10px] font-semibold leading-tight">{form.product.trim() ? 'Buscar imagem' : 'Digite o produto'}</span>
                    </span>
                  )}
                </button>
                {form.imageUrl && (
                  <button type="button" onClick={() => setForm({ ...form, imageUrl: '' })}
                    className="mt-1 w-full text-center text-[10px] text-fg-muted hover:text-danger">Remover imagem</button>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <Field label="Produto *">
                  <div className="flex gap-1.5">
                    <input required autoFocus className={inputCls} value={form.product}
                      onChange={(e) => setForm({ ...form, product: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !editingId) { e.preventDefault(); findOffers(); } }}
                      placeholder="Ex: Sony A7IV" />
                    {!editingId && (
                      <button type="button" onClick={findOffers} disabled={!form.product.trim() || offersLoading}
                        title="Buscar ofertas online" className="btn btn-secondary h-9 shrink-0 px-2.5 disabled:opacity-50">
                        {offersLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                      </button>
                    )}
                  </div>
                </Field>
                <Field label="Prioridade">
                  <div className="grid grid-cols-3 gap-1.5">
                    {PRIORITIES.map((p) => {
                      const st = PRIORITY_STYLE[p[0]];
                      const active = form.priority === p;
                      return (
                        <button type="button" key={p} onClick={() => setForm({ ...form, priority: p })}
                          className={cn('flex h-9 items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition-colors',
                            active ? st.cls : 'border-border text-fg-muted hover:text-fg')}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>
            </div>
            {/* Ofertas encontradas para o produto */}
            {!editingId && (offers !== null || offersNoKey) && (
              <div className="rounded-xl border border-border bg-surface-2/50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-fg-2"><Tag size={12} className="text-accent" /> Ofertas encontradas</p>
                  <button type="button" onClick={() => { setOffers(null); setOffersNoKey(false); setPicked(null); }}
                    className="text-[11px] text-fg-muted hover:text-fg">Fechar</button>
                </div>
                {offersNoKey ? (
                  <p className="text-xs text-fg-muted">Busca online indisponível. Informe abaixo o preço que você viu.</p>
                ) : offers && offers.length === 0 ? (
                  <p className="text-xs text-fg-muted">Nenhuma oferta encontrada. Tente marca + modelo.</p>
                ) : (
                  <div className="max-h-56 space-y-1.5 overflow-y-auto">
                    {offers?.map((r) => {
                      const on = picked?.id === r.id;
                      return (
                        <button type="button" key={r.id} onClick={() => pickOffer(r)}
                          className={cn('flex w-full items-center gap-2.5 rounded-lg border p-2 text-left transition-colors',
                            on ? 'border-primary-border bg-primary-soft' : 'border-border bg-card hover:border-border-hover')}>
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
                            {r.thumbnail
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={r.thumbnail} alt="" className="h-full w-full object-contain" />
                              : <ShoppingBag size={14} className="text-fg-muted" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium text-fg">{r.title}</span>
                            <span className="flex items-center gap-1.5 text-[10px] text-fg-muted">
                              {r.store}{r.freeShipping && <span className="flex items-center gap-0.5 text-accent"><Truck size={9} /> grátis</span>}
                              {r.condition === 'Usado' && <span className="text-warning">usado</span>}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-semibold tabular-nums text-fg">{fmt(r.price)}</span>
                          {on && <CheckCircle2 size={14} className="shrink-0 text-accent" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                {picked && <p className="mt-2 text-[11px] text-accent">A oferta escolhida vira a primeira cotação; foto e link já foram preenchidos.</p>}
              </div>
            )}

            {/* Imagens da web */}
            {imgOpen && (
              <div className="rounded-xl border border-border bg-surface-2/50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-fg-2"><ImageIcon size={12} className="text-accent" /> Escolha uma imagem</p>
                  <button type="button" onClick={() => setImgOpen(false)} className="text-[11px] text-fg-muted hover:text-fg">Fechar</button>
                </div>
                <div className="mb-2 flex gap-1.5">
                  <input className={cn(inputCls, 'h-8 text-xs')} value={imgQuery} onChange={(e) => setImgQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchImages(imgQuery); } }}
                    placeholder="Refine a busca: marca, modelo, cor..." />
                  <button type="button" onClick={() => searchImages(imgQuery)} disabled={imgLoading}
                    className="btn btn-secondary h-8 shrink-0 px-2.5 disabled:opacity-50">
                    {imgLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                  </button>
                </div>
                {imgNoKey ? (
                  <p className="text-xs text-fg-muted">Busca de imagens indisponível (SERPAPI_KEY não configurada). Cole o link de uma imagem abaixo.</p>
                ) : imgLoading ? (
                  <div className="grid grid-cols-4 gap-1.5">
                    {Array.from({ length: 8 }).map((_, k) => <div key={k} className="aspect-square animate-pulse rounded-lg bg-track" />)}
                  </div>
                ) : images && images.length === 0 ? (
                  <p className="text-xs text-fg-muted">Nenhuma imagem encontrada. Tente outro termo.</p>
                ) : (
                  <div className="grid max-h-60 grid-cols-4 gap-1.5 overflow-y-auto">
                    {images?.map((img) => {
                      const on = form.imageUrl === img.original || form.imageUrl === img.thumbnail;
                      return (
                        <button type="button" key={img.id} onClick={() => applyImage(img)} title={img.source || img.title}
                          className={cn('relative aspect-square overflow-hidden rounded-lg border-2 bg-white transition-all',
                            on ? 'border-primary' : 'border-transparent hover:border-border-hover')}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.thumbnail} alt={img.title} loading="lazy" className="h-full w-full object-contain" />
                          {applying === img.id && (
                            <span className="absolute inset-0 flex items-center justify-center bg-overlay"><Loader2 size={16} className="animate-spin text-white" /></span>
                          )}
                          {on && applying !== img.id && (
                            <span className="absolute right-1 top-1 rounded-full bg-primary p-0.5 text-on-primary"><CheckCircle2 size={11} /></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {pasteUrl || imgNoKey ? (
              <Field label="Link da imagem">
                <input type="url" className={inputCls} value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://.../imagem.jpg" />
              </Field>
            ) : (
              <button type="button" onClick={() => setPasteUrl(true)} className="flex items-center gap-1.5 text-[11px] text-fg-muted hover:text-fg">
                <Link2 size={12} /> Já tem o link da imagem? Colar manualmente
              </button>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
              <Field label="Link de referência">
                <input type="url" className={inputCls} value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." />
              </Field>
              {!editingId && !picked && (
                <Field label="Preço que você viu">
                  <CurrencyInput className={inputCls} value={seenPrice} inputMode="decimal" onChange={(v: number) => setSeenPrice(v)} />
                </Field>
              )}
            </div>
            {!editingId && !form.bought && (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-fg-2">
                <input type="checkbox" checked={huntAfter} onChange={(e) => setHuntAfter(e.target.checked)} className="accent-[var(--primary)]" />
                Abrir o caça preços depois de salvar para comparar lojas
              </label>
            )}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button type="button" onClick={() => setForm({ ...form, bought: !form.bought })}
                className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all',
                  form.bought ? 'border-primary-border bg-primary-soft text-accent' : 'border-border text-fg-muted hover:text-fg')}>
                {form.bought ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                {form.bought ? 'Já adquirido' : 'Em planejamento'}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={resetForm} className="btn btn-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-50">
                  {saving && <Loader2 size={14} className="animate-spin" />}{editingId ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {selectedItem && (
        <PriceHuntingModal
          item={selectedItem as unknown as React.ComponentProps<typeof PriceHuntingModal>["item"]}
          initialTab={huntTab}
          onBought={() => markBoughtFromQuote(selectedItem)}
          onClose={() => { setSelectedItem(null); fetch_(); }}
        />
      )}
    </AppLayout>
  );
}

const inputCls = 'h-9 w-full rounded-lg border border-border bg-card px-3 text-[13px] text-fg outline-none transition placeholder:text-fg-muted focus:border-primary';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold text-fg-muted">{label}</span>
      {children}
    </label>
  );
}

function Kpi({ icon: Icon, label, value, foot, children }: {
  icon: React.ElementType; label: string; value: string; foot?: string; children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-fg-2">{label}</p>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-fg-muted">
          <Icon size={15} strokeWidth={1.75} />
        </span>
      </div>
      <p className="mt-3 text-[26px] font-semibold leading-none tracking-tight tabular-nums text-fg">{value}</p>
      {foot && <p className="mt-3 text-[11px] text-fg-muted">{foot}</p>}
      {children}
    </div>
  );
}

function WishCard({ item, onEdit, onDelete, onHunt, onToggle, toggling, piggyTotal }: {
  item: WishItem;
  onEdit: (i: WishItem) => void;
  onDelete: (id: string) => void;
  onHunt: (i: WishItem) => void;
  onToggle: (i: WishItem) => void;
  toggling: boolean;
  piggyTotal: number;
}) {
  const b = best(item);
  const bestTotal = b ? total(b) : null;
  const maxTotal = worst(item);
  const st = PRIORITY_STYLE[prioKey(item.priority)];
  const days = daysOnList(item);
  const canAfford = bestTotal !== null && piggyTotal >= bestTotal && !item.bought;
  const installments = b && b.installments > 1 ? b.installments : null;

  return (
    <div className={cn('group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-border-hover', item.bought && 'opacity-70')}>
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.product} referrerPolicy="no-referrer"
            className={cn('h-full w-full object-cover transition-transform duration-700 group-hover:scale-105', item.bought && 'grayscale')} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-fg-disabled"><ShoppingBag size={40} strokeWidth={1} /></div>
        )}
        <span className={cn('absolute left-3 top-3 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium backdrop-blur', st.cls)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}
        </span>
        {item.bought && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-on-primary">
            <CheckCircle2 size={12} /> Adquirido
          </span>
        )}
        <div className="absolute bottom-2 right-2 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
          <button onClick={() => onEdit(item)} aria-label="Editar"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card/90 text-fg-muted backdrop-blur hover:text-accent">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(item.id)} aria-label="Remover"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card/90 text-fg-muted backdrop-blur hover:text-danger">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className={cn('text-sm font-semibold leading-tight tracking-tight text-fg', item.bought && 'line-through')}>{item.product}</h3>
          {item.link && (
            <a href={item.link} target="_blank" rel="noreferrer" aria-label="Abrir link"
              className="shrink-0 rounded-md border border-border p-1 text-fg-muted transition-colors hover:text-accent">
              <ArrowUpRight size={13} />
            </a>
          )}
        </div>

        {bestTotal !== null ? (
          <div>
            <p className="text-[11px] text-fg-muted">Melhor oferta · {b!.store}</p>
            <p className="text-lg font-semibold tabular-nums text-fg">{fmt(bestTotal)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-fg-muted">
              {installments && <span>ou {installments}× {fmt(Number(b!.installmentPrice) || bestTotal / installments)}</span>}
              {maxTotal !== null && maxTotal > bestTotal && (
                <span className="text-accent">economia de {fmt(maxTotal - bestTotal)}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border px-3 py-2 text-[11px] text-fg-muted">
            Sem cotação ainda — use o caça preços.
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {days !== null && !item.bought && (
            <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
              days >= REFLECTION_DAYS ? 'bg-warning-soft text-warning' : 'bg-surface-2 text-fg-muted')}>
              <Hourglass size={10} /> {days === 0 ? 'hoje' : `${days} dia${days === 1 ? '' : 's'}`} na lista
            </span>
          )}
          {canAfford && (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">
              <PiggyBank size={10} /> cabe nos cofrinhos
            </span>
          )}
          {b && Number(b.shipping || 0) === 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-info-soft px-1.5 py-0.5 text-[10px] font-medium text-info">
              <Truck size={10} /> frete grátis
            </span>
          )}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
          <button onClick={() => onHunt(item)} className="btn btn-secondary justify-center">
            <Tag size={14} /> Preços
            <span className="rounded-full bg-surface-2 px-1.5 text-[10px] font-semibold tabular-nums text-fg-muted">{item.prices?.length ?? 0}</span>
          </button>
          <button onClick={() => onToggle(item)} disabled={toggling}
            className={cn('btn justify-center disabled:opacity-50', item.bought ? 'btn-secondary' : 'btn-primary')}>
            {toggling ? <Loader2 size={14} className="animate-spin" /> : item.bought ? <Undo2 size={14} /> : <CheckCircle2 size={14} />}
            {item.bought ? 'Desfazer' : 'Comprei'}
          </button>
        </div>
      </div>
    </div>
  );
}
