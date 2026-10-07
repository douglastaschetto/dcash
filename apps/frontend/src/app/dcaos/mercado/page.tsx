'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { AppLayout } from '@/components/app-layout';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { cn } from '@/lib/utils';
import { Modal } from '@/app/dashboard-v2/components/Modal';
import {
  AlertTriangle, CalendarClock, Check, CheckCircle2, Circle, Edit3, Loader2, Minus, Package, Plus, Search, ShoppingCart, Sparkles, Trash2,
} from '@/components/ui/icons';
import { DcaosGate } from '../components/DcaosGate';
import { PantryShowcase } from '../components/PantryShowcase';
import { fmtShelf } from '../lib/pantry-catalog';
import { apiError, firstName, timeAgo, type PantryItem } from '../lib/dcaos';
import { UNITS, fmtQty, fmtQtyShort, guessItem, normalizeUnit, parseQuickAdd, unitStep, type Unit } from '../lib/units';

const CATEGORIES = ['Hortifruti', 'Açougue', 'Laticínios', 'Padaria', 'Mercearia', 'Bebidas', 'Limpeza', 'Higiene', 'Pets', 'Outros'];
const catRank = (c: string) => { const i = CATEGORIES.indexOf(c); return i < 0 ? CATEGORIES.length : i; };
type Tab = 'list' | 'pantry';


/* Tab icon motion (scoped to this page). Respects prefers-reduced-motion via `motion-safe:`. */
const TAB_KEYFRAMES = `
@keyframes dcaos-cart-drive { 0%,100% { transform: translateX(0) rotate(0) } 25% { transform: translateX(-2px) rotate(-6deg) } 50% { transform: translateX(2px) rotate(0) } 75% { transform: translateX(-1px) rotate(4deg) } }
@keyframes dcaos-box-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
@keyframes dcaos-pop { 0% { transform: scale(.6); opacity: 0 } 60% { transform: scale(1.15); opacity: 1 } 100% { transform: scale(1) } }
`;

function MarketTabs({ tab, onChange, listCount, inCart, pantryCount, lowCount }: {
  tab: Tab; onChange: (t: Tab) => void; listCount: number; inCart: number; pantryCount: number; lowCount: number;
}) {
  const tabs = [
    {
      key: 'list' as Tab,
      label: 'Lista de compras',
      hint: listCount === 0 ? 'Nada pra comprar' : `${listCount} pra comprar${inCart ? ` · ${inCart} no carrinho` : ''}`,
      count: listCount,
      icon: ShoppingCart,
      motion: 'motion-safe:animate-[dcaos-cart-drive_1.6s_ease-in-out_infinite]',
      on: { box: 'border-primary bg-primary-soft', icon: 'bg-primary text-on-primary', label: 'text-accent', badge: 'bg-primary text-on-primary', bar: 'bg-primary' },
    },
    {
      key: 'pantry' as Tab,
      label: 'Despensa',
      hint: `${pantryCount} em casa${lowCount ? ` · ${lowCount} acabando` : ''}`,
      count: pantryCount,
      icon: Package,
      motion: 'motion-safe:animate-[dcaos-box-float_2.2s_ease-in-out_infinite]',
      on: { box: 'border-info bg-info-soft', icon: 'bg-info text-white', label: 'text-info', badge: 'bg-info text-white', bar: 'bg-info' },
    },
  ];

  return (
    <div data-tour="dcaos-market-tabs" className="grid w-full grid-cols-2 gap-2 sm:w-auto" role="tablist" aria-label="Navegação do mercado">
      <style>{TAB_KEYFRAMES}</style>
      {tabs.map((t) => {
        const active = tab === t.key;
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            data-tour={t.key === 'pantry' ? 'dcaos-market-pantry-tab' : undefined}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cn(
              'group relative flex min-w-0 items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-all duration-200 sm:min-w-[230px]',
              active ? cn(t.on.box, 'shadow-sm') : 'border-border bg-card hover:-translate-y-0.5 hover:border-border-hover hover:bg-card-hover',
            )}
          >
            <span
              key={active ? 'on' : 'off'}
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                active ? cn(t.on.icon, 'motion-safe:animate-[dcaos-pop_.35s_ease-out]') : 'bg-surface-2 text-fg-muted group-hover:text-fg',
              )}
            >
              <Icon size={19} strokeWidth={2} className={active ? t.motion : 'transition-transform group-hover:scale-110'} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block truncate text-sm font-semibold', active ? t.on.label : 'text-fg-2 group-hover:text-fg')}>{t.label}</span>
              <span className="block truncate text-[11px] text-fg-muted">{t.hint}</span>
            </span>
            <span className={cn('flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums',
              active ? t.on.badge : 'bg-surface-2 text-fg-muted')}>
              {t.count}
            </span>
            <span className={cn('absolute inset-x-3 bottom-0 h-[3px] rounded-t-full transition-all duration-300', active ? t.on.bar : 'scale-x-0 bg-transparent')} />
          </button>
        );
      })}
    </div>
  );
}

function MarketContent() {
  const params = useSearchParams();
  const { data: items = [], mutate, isLoading } = useSWR<PantryItem[]>('/dcaos/market');
  const [tab, setTab] = useState<Tab>('list');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [amount, setAmount] = useState('1');
  const [unit, setUnit] = useState<Unit>('un');
  const [unitTouched, setUnitTouched] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const [showcase, setShowcase] = useState(false);
  const [now] = useState(() => Date.now());
  const [flash, setFlash] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (params.get('novo') === '1') inputRef.current?.focus(); }, [params]);

  const list = items.filter((i) => i.onList);
  const checked = list.filter((i) => i.checked);
  const low = items.filter((i) => !i.onList && i.minQuantity !== null && i.quantity <= i.minQuantity);
  const pantry = items.filter((i) => !search.trim() || i.name.toLowerCase().includes(search.trim().toLowerCase()));

  const groupMap = new Map<string, PantryItem[]>();
  list.forEach((i) => {
    const k = i.category || 'Outros';
    groupMap.set(k, [...(groupMap.get(k) ?? []), i]);
  });
  const grouped = Array.from(groupMap.entries()).sort(([a], [b]) => catRank(a) - catRank(b));
  // Single running list: category order first, then alphabetical
  const rows = [...list].sort((a, b) => catRank(a.category || 'Outros') - catRank(b.category || 'Outros') || a.name.localeCompare(b.name, 'pt-BR'));

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    try { await fn(); await mutate(); } catch (err) { alert(apiError(err, 'Não foi possível atualizar o item.')); } finally { setBusy(null); }
  };

  // Typing "2 kg açúcar" / "3 leite" fills quantity, unit and category on the fly
  const parsed = parseQuickAdd(name);
  const onNameChange = (text: string) => {
    setName(text);
    const p = parseQuickAdd(text);
    const guess = guessItem(p.name);
    if (p.quantity !== null) setAmount(String(p.quantity).replace('.', ','));
    if (p.unit) { setUnit(p.unit); setUnitTouched(true); } else if (!unitTouched) setUnit(guess?.unit ?? 'un');
    if (!categoryTouched) setCategory(guess?.category ?? '');
  };
  const qtyValue = Math.max(0, Number(amount.replace(',', '.')) || 0);

  const add = async () => {
    if (!parsed.name.trim() || qtyValue <= 0) return;
    setAdding(true);
    try {
      await api.post('/dcaos/market', {
        name: parsed.name.trim(),
        category: category || undefined,
        unit,
        onList: tab === 'list',
        listQuantity: tab === 'list' ? qtyValue : undefined,
        quantity: tab === 'pantry' ? qtyValue : undefined,
      });
      setName(''); setAmount('1'); setUnit('un'); setUnitTouched(false); setCategory(''); setCategoryTouched(false);
      await mutate();
      inputRef.current?.focus();
    } catch (err) {
      alert(apiError(err, 'Não foi possível adicionar.'));
    } finally {
      setAdding(false);
    }
  };

  const checkout = async () => {
    if (checked.length === 0) return;
    setCheckingOut(true);
    try { await api.post('/dcaos/market/checkout', {}); await mutate(); } catch (err) { alert(apiError(err, 'Não foi possível finalizar.')); } finally { setCheckingOut(false); }
  };

  const saveEdit = async () => {
    if (!editing) return;
    await act(editing.id, () => api.patch(`/dcaos/market/${editing.id}`, {
      name: editing.name, category: editing.category, unit: normalizeUnit(editing.unit),
      quantity: Number(editing.quantity) || 0,
      minQuantity: editing.minQuantity === null || String(editing.minQuantity) === '' ? null : Number(editing.minQuantity),
      listQuantity: Number(editing.listQuantity) || unitStep(editing.unit),
      shelfLifeDays: editing.shelfLifeDays ? Math.max(1, Math.round(Number(editing.shelfLifeDays))) : null,
    }));
    setEditing(null);
  };

  return (
    <div className="w-full p-4 md:p-6 space-y-4">
      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: 'Na lista de compras', value: list.length, icon: ShoppingCart, tone: 'text-fg' },
          { label: 'No carrinho', value: checked.length, icon: CheckCircle2, tone: 'text-accent' },
          { label: 'Acabando na despensa', value: low.length, icon: AlertTriangle, tone: low.length ? 'text-warning' : 'text-fg' },
          { label: 'Itens na despensa', value: items.length, icon: Package, tone: 'text-fg' },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-medium text-fg-2">{k.label}</p>
              <k.icon size={15} strokeWidth={1.75} className="text-fg-muted" />
            </div>
            <p className={cn('mt-2 text-2xl font-semibold tabular-nums', k.tone)}>{k.value}</p>
          </div>
        ))}
      </section>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <MarketTabs
          tab={tab}
          onChange={setTab}
          listCount={list.length}
          inCart={checked.length}
          pantryCount={items.length}
          lowCount={low.length}
        />
        <div data-tour="dcaos-market-add" className="flex flex-1 flex-col gap-1.5 lg:max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <input ref={inputRef} value={name} onChange={(e) => onNameChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder={tab === 'list' ? 'O que está faltando? Ex: 2 kg açúcar, 3 leite' : 'Cadastrar na despensa... Ex: 5 kg arroz'}
              className="field h-9 min-w-0 flex-1 !text-[13px]" />
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} onKeyDown={(e) => e.key === 'Enter' && add()}
              inputMode="decimal" aria-label="Quantidade" className="field h-9 !w-16 text-center !text-[13px] tabular-nums" />
            <select value={unit} onChange={(e) => { setUnit(e.target.value as Unit); setUnitTouched(true); }} aria-label="Unidade" className="field h-9 !w-auto !text-[13px]">
              {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
            <select value={category} onChange={(e) => { setCategory(e.target.value); setCategoryTouched(true); }} aria-label="Categoria" className="field h-9 !w-auto !text-[13px]">
              <option value="">Categoria</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={add} disabled={adding || !parsed.name.trim() || qtyValue <= 0} className="btn btn-primary">
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Adicionar
            </button>
          </div>
          {parsed.name.trim() ? (
            <p className="text-[11px] text-fg-muted">
              Vai {tab === 'list' ? 'pra lista' : 'pra despensa'}: <span className="font-medium text-fg-2">{fmtQty(qtyValue, unit)} de {parsed.name.trim().toLowerCase()}</span>
              {category && <> · {category}</>}
            </p>
          ) : (
            <p className="text-[11px] text-fg-muted">Dica: digite a quantidade junto — &quot;2 kg açúcar&quot;, &quot;3 leite&quot;, &quot;1 dz ovos&quot;. A unidade é sugerida pelo nome.</p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-accent" /></div>
      ) : tab === 'list' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-4">
            {list.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card py-14 text-center">
                <ShoppingCart size={28} strokeWidth={1.5} className="mx-auto text-fg-disabled" />
                <p className="mt-2 text-sm font-medium text-fg">Lista vazia.</p>
                <p className="text-xs text-fg-muted">Milagre ou alguém esqueceu de anotar? Marque &quot;Acabou!&quot; na despensa.</p>
              </div>
            ) : (
              <section className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="hidden items-center gap-3 border-b border-border px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-fg-muted md:flex">
                  <span className="w-[19px]" />
                  <span className="min-w-0 flex-1">Item</span>
                  <span className="w-32">Categoria</span>
                  <span className="w-32">Quem anotou</span>
                  <span className="w-[120px] text-center">Quantidade</span>
                  <span className="w-7" />
                </div>
                <ul className="divide-y divide-border">
                  {rows.map((i, idx) => {
                    const cat = i.category || 'Outros';
                    const firstOfCat = idx === 0 || (rows[idx - 1].category || 'Outros') !== cat;
                    const who = i.addedByName ? firstName(i.addedByName) : null;
                    return (
                      <li key={i.id} id={firstOfCat ? `cat-${cat}` : undefined} className="group flex scroll-mt-4 items-center gap-3 px-4 py-2.5">
                        <button onClick={() => act(i.id, () => api.patch(`/dcaos/market/${i.id}`, { checked: !i.checked }))}
                          disabled={busy === i.id} aria-label={i.checked ? 'Desmarcar' : 'Peguei'} className="shrink-0">
                          {busy === i.id ? <Loader2 size={19} className="animate-spin text-fg-muted" />
                            : i.checked ? <CheckCircle2 size={19} className="text-accent" /> : <Circle size={19} className="text-fg-muted hover:text-accent" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={cn('truncate text-[13px] font-medium', i.checked ? 'text-fg-muted line-through' : 'text-fg')}>
                            {i.name} <span className="font-normal text-fg-muted">· {fmtQty(i.listQuantity, i.unit)}</span>
                          </p>
                          {/* Mobile: category + who under the name */}
                          <p className="truncate text-[11px] text-fg-muted md:hidden">
                            {cat}{who ? ` · por ${who}` : ''}{i.timesRanOut > 1 ? ` · acabou ${i.timesRanOut}x` : ''}
                          </p>
                          {i.timesRanOut > 1 && <p className="hidden text-[11px] text-warning md:block">acabou {i.timesRanOut}x</p>}
                        </div>
                        <span className="hidden w-32 md:block">
                          <span className="inline-flex max-w-full items-center rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-fg-2">
                            <span className="truncate">{cat}</span>
                          </span>
                        </span>
                        <span className="hidden w-32 truncate text-xs text-fg-muted md:block">{who ? `por ${who}` : '—'}</span>
                        <div className="flex w-[120px] shrink-0 items-center justify-between rounded-md border border-border">
                          <button onClick={() => act(i.id, () => api.patch(`/dcaos/market/${i.id}`, { listQuantity: Math.max(unitStep(i.unit), Math.round((i.listQuantity - unitStep(i.unit)) * 100) / 100) }))}
                            aria-label="Menos" className="flex h-7 w-7 items-center justify-center text-fg-muted hover:text-fg"><Minus size={12} /></button>
                          <span className="min-w-0 flex-1 px-1 text-center text-xs font-semibold tabular-nums text-fg">{fmtQtyShort(i.listQuantity, i.unit)}</span>
                          <button onClick={() => act(i.id, () => api.patch(`/dcaos/market/${i.id}`, { listQuantity: Math.round((i.listQuantity + unitStep(i.unit)) * 100) / 100 }))}
                            aria-label="Mais" className="flex h-7 w-7 items-center justify-center text-fg-muted hover:text-fg"><Plus size={12} /></button>
                        </div>
                        <button onClick={() => act(i.id, () => api.patch(`/dcaos/market/${i.id}`, { onList: false }))}
                          aria-label="Tirar da lista" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-muted opacity-100 hover:bg-danger-soft hover:text-danger md:opacity-0 md:group-hover:opacity-100">
                          <Trash2 size={13} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>

          <aside className="min-w-0 space-y-4">
            <section className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm font-semibold text-fg">Modo mercado</p>
              <p className="mt-1 text-xs text-fg-muted">Marque o que já foi pro carrinho. Ao finalizar, os itens voltam para a despensa e a família é avisada.</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-track">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${list.length ? (checked.length / list.length) * 100 : 0}%` }} />
              </div>
              <p className="mt-1.5 text-[11px] tabular-nums text-fg-muted">{checked.length} de {list.length} no carrinho</p>
              <button onClick={checkout} disabled={checkingOut || checked.length === 0} className="btn btn-primary mt-4 w-full">
                {checkingOut ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Finalizar compra ({checked.length})
              </button>
            </section>

            {grouped.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-fg">Resumo por categoria</p>
                  <span className="text-[11px] text-fg-muted">{grouped.length} categoria{grouped.length === 1 ? '' : 's'}</span>
                </div>
                <ul className="space-y-3">
                  {grouped.map(([cat, rows]) => {
                    const inCart = rows.filter((r) => r.checked).length;
                    const done = inCart === rows.length;
                    // Totals per unit: "3 kg · 2 L · 4 un"
                    const totals = new Map<string, number>();
                    rows.forEach((r) => {
                      const u = normalizeUnit(r.unit);
                      totals.set(u, Math.round(((totals.get(u) ?? 0) + r.listQuantity) * 100) / 100);
                    });
                    return (
                      <li key={cat}>
                        <button
                          onClick={() => document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                          className="w-full text-left"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn('flex items-center gap-1.5 text-[13px] font-medium', done ? 'text-accent' : 'text-fg')}>
                              {done && <CheckCircle2 size={13} />} {cat}
                            </span>
                            <span className="text-[11px] tabular-nums text-fg-muted">
                              {inCart}/{rows.length} {rows.length === 1 ? 'item' : 'itens'}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-track">
                            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(inCart / rows.length) * 100}%` }} />
                          </div>
                          <p className="mt-1 truncate text-[11px] tabular-nums text-fg-muted">
                            {Array.from(totals.entries()).map(([u, n]) => fmtQtyShort(n, u)).join(' · ')}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {low.length > 0 && (
              <section className="rounded-2xl border border-warning/30 bg-warning-soft p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-warning"><AlertTriangle size={13} /> Acabando na despensa</p>
                <ul className="mt-2 space-y-1.5">
                  {low.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-fg-2">{i.name} · {fmtQty(i.quantity, i.unit)}</span>
                      <button onClick={() => act(i.id, () => api.patch(`/dcaos/market/${i.id}`, { onList: true }))} className="font-medium text-accent hover:underline">+ lista</button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-72">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar na despensa..." className="field h-9 !pl-8 !text-[13px]" />
            </div>
            <button data-tour="dcaos-market-showcase" onClick={() => setShowcase(true)} className="btn btn-secondary"><Sparkles size={14} className="text-accent" /> Vitrine de produtos</button>
          </div>
          {flash && (
            <div className="flex items-center gap-2 rounded-xl border border-primary-border bg-primary-soft px-3 py-2 text-xs font-medium text-accent">
              <CheckCircle2 size={14} /> {flash}
              <button onClick={() => setFlash(null)} className="ml-auto text-fg-muted hover:text-fg">ok</button>
            </div>
          )}
          {items.length === 0 ? (
            <div className="hero-card relative overflow-hidden rounded-2xl p-8 text-center">
              <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
              <p className="relative select-none text-4xl tracking-widest" aria-hidden>🍚🥛🍌🧻🧼</p>
              <p className="relative mt-3 text-lg font-semibold">Monte sua despensa em 1 minuto</p>
              <p className="relative mx-auto mt-1 max-w-md text-sm text-white/70">Escolha na vitrine o que você costuma ter em casa. Quantidade, aviso de estoque baixo e validade já vêm sugeridos.</p>
              <button onClick={() => setShowcase(true)} className="btn btn-primary relative mt-5"><Sparkles size={14} /> Abrir vitrine</button>
            </div>
          ) : pantry.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card py-14 text-center text-[13px] text-fg-muted">Nada encontrado com esse nome.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 min-[1900px]:grid-cols-5">
              {pantry.map((i) => {
                const isLow = i.minQuantity !== null && i.quantity <= i.minQuantity;
                const out = i.quantity <= 0;
                const daysLeft = i.shelfLifeDays && i.lastBoughtAt && !out
                  ? Math.ceil((new Date(i.lastBoughtAt).getTime() + i.shelfLifeDays * 86_400_000 - now) / 86_400_000)
                  : null;
                return (
                  <article key={i.id} className={cn('group flex flex-col gap-3 rounded-2xl border bg-card p-4',
                    out ? 'border-danger/30' : isLow ? 'border-warning/30' : 'border-border')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-fg">{i.name}</p>
                        <p className="text-[11px] text-fg-muted">{i.category || 'Sem categoria'}{i.lastBoughtAt ? ` · comprado há ${timeAgo(i.lastBoughtAt)}` : ''}</p>
                      </div>
                      <div className="flex opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                        <button onClick={() => setEditing({ ...i })} aria-label="Editar" className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-accent"><Edit3 size={13} /></button>
                        <button onClick={() => { if (confirm(`Remover "${i.name}" da despensa?`)) act(i.id, () => api.delete(`/dcaos/market/${i.id}`)); }}
                          aria-label="Remover" className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-danger-soft hover:text-danger"><Trash2 size={13} /></button>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className={cn('text-2xl font-semibold tabular-nums', out ? 'text-danger' : isLow ? 'text-warning' : 'text-fg')}>
                        {fmtQty(i.quantity, i.unit).split(' ')[0]}<span className="ml-1 text-xs font-normal text-fg-muted">{fmtQty(i.quantity, i.unit).split(' ').slice(1).join(' ')}</span>
                      </p>
                      <div className="flex flex-col items-end gap-1">
                        {i.onList && <span className="rounded-md border border-primary-border bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">Na lista</span>}
                        {i.timesRanOut > 1 && <span className="text-[10px] text-fg-muted">acabou {i.timesRanOut}x</span>}
                        {daysLeft !== null ? (
                          <span className={cn('flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                            daysLeft < 0 ? 'bg-danger-soft text-danger' : daysLeft <= 3 ? 'bg-warning-soft text-warning' : 'bg-surface-2 text-fg-muted')}>
                            <CalendarClock size={10} />
                            {daysLeft < 0 ? `venceu há ${-daysLeft}d` : daysLeft === 0 ? 'vence hoje' : `vence em ~${daysLeft}d`}
                          </span>
                        ) : i.shelfLifeDays ? (
                          <span className="text-[10px] text-fg-muted">validade ~{fmtShelf(i.shelfLifeDays)}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-auto flex gap-2">
                      <button onClick={() => act(i.id, () => api.post(`/dcaos/market/${i.id}/consume`, { amount: unitStep(i.unit) }))} disabled={busy === i.id || out}
                        className="btn btn-secondary h-8 flex-1 text-xs"><Minus size={12} /> Usei {fmtQtyShort(unitStep(i.unit), i.unit)}</button>
                      <button onClick={() => act(i.id, () => api.post(`/dcaos/market/${i.id}/ran-out`))} disabled={busy === i.id || (out && i.onList)}
                        className="btn h-8 flex-1 border border-danger/30 bg-danger-soft text-xs text-danger hover:bg-danger hover:text-white">
                        {busy === i.id ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />} Acabou!
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showcase && (
        <PantryShowcase
          existing={new Set(items.map((i) => i.name.toLowerCase()))}
          onClose={() => setShowcase(false)}
          onDone={async (n) => {
            setShowcase(false);
            await mutate();
            if (n) setFlash(`${n} produto${n > 1 ? 's' : ''} adicionado${n > 1 ? 's' : ''} à despensa.`);
          }}
        />
      )}

      {editing && (
        <Modal title="Editar item" onClose={() => setEditing(null)}>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg-2">Nome</label>
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="field" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-fg-2">Categoria</label>
                <select value={editing.category ?? ''} onChange={(e) => setEditing({ ...editing, category: e.target.value || null })} className="field">
                  <option value="">Sem categoria</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-fg-2">Unidade de medida</label>
                <select value={normalizeUnit(editing.unit)} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} className="field">
                  {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-fg-2">Em casa ({normalizeUnit(editing.unit)})</label>
                <input type="number" min={0} step={unitStep(editing.unit)} value={editing.quantity} onChange={(e) => setEditing({ ...editing, quantity: Number(e.target.value) })} className="field" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-fg-2">Avisar com ({normalizeUnit(editing.unit)})</label>
                <input type="number" min={0} step={unitStep(editing.unit)} value={editing.minQuantity ?? ''} placeholder="—"
                  onChange={(e) => setEditing({ ...editing, minQuantity: e.target.value === '' ? null : Number(e.target.value) })} className="field" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-fg-2">Comprar ({normalizeUnit(editing.unit)})</label>
                <input type="number" min={0} step={unitStep(editing.unit)} value={editing.listQuantity} onChange={(e) => setEditing({ ...editing, listQuantity: Number(e.target.value) })} className="field" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg-2">Validade média (dias)</label>
              <input type="number" min={1} value={editing.shelfLifeDays ?? ''} placeholder="Ex: 7 para pão, 365 para arroz"
                onChange={(e) => setEditing({ ...editing, shelfLifeDays: e.target.value === '' ? null : Number(e.target.value) })} className="field" />
            </div>
            <p className="text-[11px] text-fg-muted">&quot;Avisar com&quot;: quando o estoque chegar nessa quantidade, o item vai sozinho para a lista e a família é avisada. A validade conta a partir da última compra.</p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditing(null)} className="btn btn-secondary flex-1">Cancelar</button>
              <button onClick={saveEdit} disabled={!editing.name.trim()} className="btn btn-primary flex-1"><Check size={14} /> Salvar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function DcaosMarketPage() {
  useAuth();
  return (
    <AppLayout title="Abastece Aí" subtitle="Mercado e despensa · o leite acabou. Novamente." noPadding>
      <div className="h-full overflow-y-auto">
        <DcaosGate>
          <Suspense fallback={null}><MarketContent /></Suspense>
        </DcaosGate>
      </div>
    </AppLayout>
  );
}
