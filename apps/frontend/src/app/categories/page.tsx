'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Trash2, X, Check, Loader2, AlertCircle, Pencil, ChevronDown, ChevronLeft, ChevronRight,
  Search, LayoutGrid, List, ArrowUpCircle, ArrowDownCircle, PiggyBank, Target, AlertTriangle,
} from '@/components/ui/icons';
import { IconPicker, LucideIcon } from '@/lib/icon-picker';
import { ColorPicker } from '@/lib/color-picker';
import { AppLayout } from '@/components/app-layout';
import { cn, parseDateOnly } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dcash:token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Types ──────────────────────────────────────────────────────────────────

type ApiType = 'income' | 'expense' | 'reserve';

type Category = {
  id: string; name: string; type: ApiType; color: string; icon: string;
  userId?: string; familyGroupId?: string;
};

type Usage = { amount: number; count: number; planned: number | null };
type Sort = 'usage' | 'name';
type View = 'grid' | 'list';

const DEFAULT_ICON = 'Tag';

const TYPE_OPTIONS: {
  value: ApiType; label: string; short: string; icon: React.ElementType;
  text: string; soft: string; border: string; bar: string; totalLabel: string;
}[] = [
  { value: 'income',  label: 'Receita',                short: 'Receita', icon: ArrowUpCircle,   text: 'text-accent', soft: 'bg-primary-soft', border: 'border-primary-border', bar: 'bg-primary', totalLabel: 'recebido' },
  { value: 'expense', label: 'Despesa',                short: 'Despesa', icon: ArrowDownCircle, text: 'text-danger', soft: 'bg-danger-soft',  border: 'border-danger/30',      bar: 'bg-danger',  totalLabel: 'gasto' },
  { value: 'reserve', label: 'Reserva / Investimento', short: 'Reserva', icon: PiggyBank,       text: 'text-info',   soft: 'bg-info-soft',    border: 'border-info/30',        bar: 'bg-info',    totalLabel: 'reservado' },
];
const typeMeta = (t: ApiType) => TYPE_OPTIONS.find((o) => o.value === t)!;

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const fmtBRL = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fieldCls = 'w-full rounded-xl px-4 py-3 text-sm outline-none transition bg-primary-soft dark:bg-surface-2 border border-primary-border dark:border-border text-fg placeholder:text-fg-muted focus:border-primary ';

const EMPTY_USAGE: Usage = { amount: 0, count: 0, planned: null };

// ── Category tile / row ───────────────────────────────────────────────────

function CategoryIcon({ cat, size = 'md' }: { cat: Category; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cn('flex shrink-0 items-center justify-center rounded-lg', size === 'md' ? 'h-9 w-9' : 'h-8 w-8')}
      style={{ backgroundColor: `color-mix(in srgb, ${cat.color || 'var(--primary)'} 16%, transparent)`, color: cat.color || 'var(--primary)' }}
    >
      <LucideIcon name={cat.icon || DEFAULT_ICON} size={size === 'md' ? 17 : 15} />
    </span>
  );
}

function RowActions({ cat, onEdit, onDelete, deleting }: {
  cat: Category; onEdit: (c: Category) => void; onDelete: (c: Category) => void; deleting: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
      <button
        onClick={(e) => { e.stopPropagation(); onEdit(cat); }}
        aria-label="Editar"
        className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-accent transition-colors"
      >
        <Pencil size={13} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(cat); }}
        disabled={deleting}
        aria-label="Excluir"
        className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-danger-soft hover:text-danger transition-colors"
      >
        {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
      </button>
    </div>
  );
}

function UsageBar({ cat, usage, typeTotal }: { cat: Category; usage: Usage; typeTotal: number }) {
  const over = usage.planned !== null && usage.amount > usage.planned;
  const pct = usage.planned
    ? Math.min(100, (usage.amount / usage.planned) * 100)
    : typeTotal > 0 ? (usage.amount / typeTotal) * 100 : 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-track">
      <div
        className={cn('h-full rounded-full transition-all duration-700', over && 'bg-danger')}
        style={{ width: `${usage.amount > 0 ? Math.max(pct, 2) : 0}%`, ...(!over && { backgroundColor: cat.color || 'var(--primary)' }) }}
      />
    </div>
  );
}

function CategoryTile({ cat, usage, typeTotal, onEdit, onDelete, deleting }: {
  cat: Category; usage: Usage; typeTotal: number;
  onEdit: (c: Category) => void; onDelete: (c: Category) => void; deleting: boolean;
}) {
  const share = typeTotal > 0 ? (usage.amount / typeTotal) * 100 : 0;
  const over = usage.planned !== null && usage.amount > usage.planned;
  return (
    <div
      onClick={() => onEdit(cat)}
      className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-border-hover hover:bg-card-hover"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <CategoryIcon cat={cat} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-fg">{cat.name}</p>
            <p className="text-[11px] text-fg-muted">
              {usage.count > 0 ? `${usage.count} lançamento${usage.count === 1 ? '' : 's'}` : 'Sem uso no mês'}
            </p>
          </div>
        </div>
        <RowActions cat={cat} onEdit={onEdit} onDelete={onDelete} deleting={deleting} />
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <p className={cn('text-base font-semibold tabular-nums tracking-tight', usage.amount > 0 ? 'text-fg' : 'text-fg-muted')}>
            {fmtBRL(usage.amount)}
          </p>
          {usage.amount > 0 && <span className="text-[11px] tabular-nums text-fg-muted">{share.toFixed(0)}%</span>}
        </div>
        <UsageBar cat={cat} usage={usage} typeTotal={typeTotal} />
        {usage.planned !== null && (
          <p className={cn('mt-1.5 flex items-center gap-1 text-[11px] tabular-nums', over ? 'font-medium text-danger' : 'text-fg-muted')}>
            {over ? <AlertTriangle size={11} /> : <Target size={11} />}
            {over ? `Acima do plano de ${fmtBRL(usage.planned)}` : `${fmtBRL(usage.planned - usage.amount)} restantes de ${fmtBRL(usage.planned)}`}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [limits, setLimits]         = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [filterType, setFilterType] = useState<ApiType | 'all'>('all');
  const [collapsed, setCollapsed]   = useState<Record<ApiType, boolean>>({ income: false, expense: false, reserve: false });
  const [search, setSearch]         = useState('');
  const [sort, setSort]             = useState<Sort>('usage');
  const [view, setView]             = useState<View>('grid');
  const [month, setMonth]           = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  // Form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName]   = useState('');
  const [type, setType]   = useState<ApiType>('expense');
  const [color, setColor] = useState('#10b981');
  const [icon, setIcon]   = useState(DEFAULT_ICON);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [catRes] = await Promise.all([
          fetch(`${API}/categories`, { headers: getAuthHeaders() }),
          fetch(`${API}/transactions`, { headers: getAuthHeaders() })
            .then((r) => (r.ok ? r.json() : []))
            .then((d) => setTransactions(Array.isArray(d) ? d : []))
            .catch(() => setTransactions([])),
        ]);
        if (!catRes.ok) throw new Error();
        setCategories(await catRes.json());
      } catch {
        setError('Não foi possível carregar as categorias.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    fetch(`${API}/category-limits?month=${month.getMonth() + 1}&year=${month.getFullYear()}`, { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setLimits(Array.isArray(d) ? d : []))
      .catch(() => setLimits([]));
  }, [month]);

  const openCreate = () => {
    setEditingId(null);
    setName(''); setType(filterType === 'all' ? 'expense' : filterType); setColor('#10b981'); setIcon(DEFAULT_ICON);
    setError(null); setDrawerOpen(true);
  };
  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name); setType(cat.type); setColor(cat.color || '#10b981'); setIcon(cat.icon || DEFAULT_ICON);
    setError(null); setDrawerOpen(true);
  };
  const closeDrawer = () => { setDrawerOpen(false); setError(null); };

  const handleSave = async () => {
    if (!name.trim()) { setError('Informe o nome da categoria.'); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${API}/categories${editingId ? `/${editingId}` : ''}`, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ name: name.trim(), type, color, icon }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Erro ao salvar categoria.'); return; }
      setCategories((prev) => editingId
        ? prev.map((c) => (c.id === editingId ? data : c))
        : [data, ...prev]);
      closeDrawer();
    } catch {
      setError('Erro de conexão com o servidor.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Excluir a categoria "${cat.name}"?`)) return;
    setDeleteId(cat.id);
    try {
      const res = await fetch(`${API}/categories/${cat.id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message ?? 'Erro ao excluir categoria.');
        return;
      }
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } catch {
      alert('Erro de conexão ao excluir.');
    } finally {
      setDeleteId(null);
    }
  };

  /* ── Uso por categoria no mês selecionado ─────────────────── */
  const usage = useMemo(() => {
    const map: Record<string, Usage> = {};
    transactions.forEach((t) => {
      const id = t.category?.id;
      if (!id) return;
      const d = parseDateOnly(t.date);
      if (d.getFullYear() !== month.getFullYear() || d.getMonth() !== month.getMonth()) return;
      const u = (map[id] ||= { ...EMPTY_USAGE });
      u.amount += Number(t.amount);
      u.count += 1;
    });
    limits.forEach((l) => {
      const id = l.categoryId || l.category?.id;
      if (!id) return;
      (map[id] ||= { ...EMPTY_USAGE }).planned = Number(l.amount || 0);
    });
    return map;
  }, [transactions, limits, month]);

  const usageOf = (id: string) => usage[id] ?? EMPTY_USAGE;

  const totals = useMemo(() => {
    const t: Record<ApiType, { count: number; amount: number; unused: number; over: number }> = {
      income:  { count: 0, amount: 0, unused: 0, over: 0 },
      expense: { count: 0, amount: 0, unused: 0, over: 0 },
      reserve: { count: 0, amount: 0, unused: 0, over: 0 },
    };
    categories.forEach((c) => {
      const u = usage[c.id] ?? EMPTY_USAGE;
      const bucket = t[c.type];
      if (!bucket) return;
      bucket.count += 1;
      bucket.amount += u.amount;
      if (u.count === 0) bucket.unused += 1;
      if (u.planned !== null && u.amount > u.planned) bucket.over += 1;
    });
    return t;
  }, [categories, usage]);

  const q = search.trim().toLowerCase();
  const grouped = useMemo(() => {
    const byType = (tp: ApiType) => categories
      .filter((c) => c.type === tp && (!q || c.name.toLowerCase().includes(q)))
      .sort((a, b) => sort === 'name'
        ? a.name.localeCompare(b.name, 'pt-BR')
        : (usage[b.id]?.amount ?? 0) - (usage[a.id]?.amount ?? 0) || a.name.localeCompare(b.name, 'pt-BR'));
    return { income: byType('income'), expense: byType('expense'), reserve: byType('reserve') } as Record<ApiType, Category[]>;
  }, [categories, q, sort, usage]);

  const visibleTypes = filterType === 'all' ? TYPE_OPTIONS : TYPE_OPTIONS.filter((o) => o.value === filterType);
  const unusedTotal = totals.income.unused + totals.expense.unused + totals.reserve.unused;
  const overTotal = totals.expense.over + totals.income.over + totals.reserve.over;
  const isCurrentMonth = (() => { const n = new Date(); return n.getFullYear() === month.getFullYear() && n.getMonth() === month.getMonth(); })();

  const addButton = (
    <button data-tour="categories-add-btn" onClick={openCreate} className="btn btn-primary">
      <Plus size={16} /> Nova categoria
    </button>
  );

  const preview = typeMeta(type);

  return (
    <AppLayout
      title="Categorias"
      subtitle={`${categories.length} categorias cadastradas`}
      actions={addButton}
      noPadding
    >
      <div className="h-full overflow-y-auto">
      <div className="w-full p-4 md:p-6 space-y-4">

        {/* ── Resumo / filtros por tipo ───────────────────────────── */}
        <section data-tour="categories-type-filters" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {TYPE_OPTIONS.map((opt) => {
            const active = filterType === opt.value;
            const tt = totals[opt.value];
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setFilterType(active ? 'all' : opt.value)}
                aria-pressed={active}
                className={cn(
                  'rounded-2xl border bg-card p-5 text-left transition-colors',
                  active ? cn(opt.border, opt.soft) : 'border-border hover:border-border-hover',
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-fg-2">{opt.label}</p>
                  <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg border border-border', opt.text)}>
                    <Icon size={15} strokeWidth={1.75} />
                  </span>
                </div>
                <p className="mt-3 text-[26px] leading-none font-semibold tracking-tight tabular-nums text-fg">{fmtBRL(tt.amount)}</p>
                <p className="mt-3 text-[11px] text-fg-muted">
                  {tt.count} categoria{tt.count === 1 ? '' : 's'} · {opt.totalLabel} em {MONTHS_PT[month.getMonth()].toLowerCase()}
                </p>
              </button>
            );
          })}

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-fg-2">Saúde das categorias</p>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-fg-muted">
                <Target size={15} strokeWidth={1.75} />
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className={cn('text-[26px] leading-none font-semibold tabular-nums', overTotal > 0 ? 'text-danger' : 'text-fg')}>{overTotal}</p>
                <p className="mt-1.5 text-[11px] text-fg-muted">acima do plano</p>
              </div>
              <div>
                <p className="text-[26px] leading-none font-semibold tabular-nums text-fg">{unusedTotal}</p>
                <p className="mt-1.5 text-[11px] text-fg-muted">sem uso no mês</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Toolbar ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-border bg-surface-2 p-0.5" role="tablist">
              {([{ value: 'all', label: 'Todas', count: categories.length }, ...TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.short, count: totals[o.value].count }))] as { value: ApiType | 'all'; label: string; count: number }[]).map((f) => (
                <button
                  key={f.value}
                  role="tab"
                  aria-selected={filterType === f.value}
                  onClick={() => setFilterType(f.value)}
                  className={cn(
                    'flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 text-xs font-medium transition-colors',
                    filterType === f.value ? 'bg-card text-fg border-border shadow-xs' : 'text-fg-muted hover:text-fg border-transparent',
                  )}
                >
                  {f.label}
                  <span className="text-[10px] tabular-nums text-fg-muted">{f.count}</span>
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-56">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar categoria..."
                className="field h-9 !pl-8 !text-[13px]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Ordenar por"
              className="field h-9 !w-auto !text-[13px]"
            >
              <option value="usage">Mais usadas</option>
              <option value="name">Nome (A–Z)</option>
            </select>

            <div className="flex rounded-lg border border-border bg-surface-2 p-0.5">
              {([{ v: 'grid', I: LayoutGrid, l: 'Grade' }, { v: 'list', I: List, l: 'Lista' }] as const).map(({ v, I, l }) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  aria-label={l}
                  title={l}
                  className={cn(
                    'flex h-7 w-8 items-center justify-center rounded-md border transition-colors',
                    view === v ? 'bg-card text-fg border-border shadow-xs' : 'text-fg-muted hover:text-fg border-transparent',
                  )}
                >
                  <I size={14} />
                </button>
              ))}
            </div>

            {!isCurrentMonth && (
              <button onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }} className="btn btn-secondary h-9">
                Mês atual
              </button>
            )}
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
              <button onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} aria-label="Mês anterior"
                className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-fg transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[120px] px-2 text-center text-[13px] font-medium text-fg">
                {MONTHS_PT[month.getMonth()]} {month.getFullYear()}
              </span>
              <button onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} aria-label="Próximo mês"
                className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-fg transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Conteúdo ────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-accent" />
          </div>
        )}

        {!loading && categories.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <Target size={32} strokeWidth={1.5} className="mx-auto mb-3 text-fg-disabled" />
            <p className="text-base font-semibold text-fg">Nenhuma categoria ainda</p>
            <p className="mt-1 text-sm text-fg-muted">Crie sua primeira categoria para organizar suas finanças.</p>
            <button onClick={openCreate} className="btn btn-primary mt-5">
              <Plus size={16} /> Criar categoria
            </button>
          </div>
        )}

        {!loading && categories.length > 0 && (
          <div data-tour="categories-list" className="space-y-4">
            {visibleTypes.map((opt) => {
              const list = grouped[opt.value];
              if (list.length === 0 && (filterType !== opt.value) && !q) return null;
              const isOpen = !collapsed[opt.value];
              const typeTotal = totals[opt.value].amount;
              return (
                <section key={opt.value} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => setCollapsed((prev) => ({ ...prev, [opt.value]: !prev[opt.value] }))}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-hover transition-colors"
                  >
                    <span className={cn('h-2 w-2 rounded-full', opt.bar)} />
                    <h2 className="text-sm font-semibold text-fg">{opt.label}</h2>
                    <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums', opt.soft, opt.text)}>{list.length}</span>
                    <span className="ml-auto text-[13px] font-semibold tabular-nums text-fg">{fmtBRL(typeTotal)}</span>
                    <ChevronDown size={16} className={cn('text-fg-muted transition-transform', isOpen && 'rotate-180')} />
                  </button>

                  {isOpen && (
                    <div className="border-t border-border">
                      {list.length === 0 ? (
                        <p className="px-5 py-6 text-[13px] text-fg-muted">
                          {q ? 'Nenhuma categoria encontrada.' : `Nenhuma categoria de ${opt.label.toLowerCase()}.`}
                        </p>
                      ) : view === 'grid' ? (
                        <div className="grid grid-cols-1 gap-3 bg-surface-2/40 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6">
                          {list.map((cat) => (
                            <CategoryTile
                              key={cat.id}
                              cat={cat}
                              usage={usageOf(cat.id)}
                              typeTotal={typeTotal}
                              onEdit={openEdit}
                              onDelete={handleDelete}
                              deleting={deleteId === cat.id}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[640px] text-[13px]">
                            <thead>
                              <tr className="border-b border-border bg-surface-2 text-left text-xs text-fg-muted">
                                <th className="px-5 py-2.5 font-medium">Categoria</th>
                                <th className="px-3 py-2.5 font-medium text-right">Lançamentos</th>
                                <th className="px-3 py-2.5 font-medium w-[28%]">Participação</th>
                                <th className="px-3 py-2.5 font-medium text-right">Planejado</th>
                                <th className="px-3 py-2.5 font-medium text-right">Valor no mês</th>
                                <th className="px-5 py-2.5 font-medium text-right w-24">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {list.map((cat) => {
                                const u = usageOf(cat.id);
                                const share = typeTotal > 0 ? (u.amount / typeTotal) * 100 : 0;
                                const over = u.planned !== null && u.amount > u.planned;
                                return (
                                  <tr key={cat.id} onClick={() => openEdit(cat)} className="group cursor-pointer hover:bg-hover transition-colors">
                                    <td className="px-5 py-2.5">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <CategoryIcon cat={cat} size="sm" />
                                        <span className="truncate font-medium text-fg">{cat.name}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums text-fg-2">{u.count}</td>
                                    <td className="px-3 py-2.5">
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1"><UsageBar cat={cat} usage={{ ...u, planned: null }} typeTotal={typeTotal} /></div>
                                        <span className="w-9 text-right text-[11px] tabular-nums text-fg-muted">{share.toFixed(0)}%</span>
                                      </div>
                                    </td>
                                    <td className={cn('px-3 py-2.5 text-right tabular-nums', over ? 'font-medium text-danger' : 'text-fg-2')}>
                                      {u.planned !== null ? fmtBRL(u.planned) : '—'}
                                    </td>
                                    <td className={cn('px-3 py-2.5 text-right font-semibold tabular-nums', u.amount > 0 ? 'text-fg' : 'text-fg-muted')}>
                                      {fmtBRL(u.amount)}
                                    </td>
                                    <td className="px-5 py-2.5">
                                      <div className="flex justify-end">
                                        <RowActions cat={cat} onEdit={openEdit} onDelete={handleDelete} deleting={deleteId === cat.id} />
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
      </div>

      {/* ── Drawer nova categoria ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-overlay backdrop-blur-sm" onClick={closeDrawer} />

          <div className="w-full max-w-[440px] flex flex-col bg-card shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header + live preview */}
            <div className="shrink-0 border-b border-border bg-surface-2 p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-fg">{editingId ? 'Editar categoria' : 'Nova categoria'}</p>
                <button onClick={closeDrawer} aria-label="Fechar" className="icon-btn !h-8 !w-8">
                  <X size={14} />
                </button>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
                >
                  <LucideIcon name={icon} size={22} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-fg">{name || 'Nome da categoria'}</p>
                  <span className={cn('mt-0.5 inline-block rounded-md border px-1.5 py-0.5 text-[11px] font-medium', preview.soft, preview.text, preview.border)}>
                    {preview.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {error && (
                <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm bg-danger-soft border border-danger/30 text-danger">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </div>
              )}

              {/* Tipo */}
              <div>
                <label className="block text-xs font-semibold mb-2 text-fg-muted">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {TYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = type === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setType(opt.value)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-colors',
                          active ? cn(opt.border, opt.soft, opt.text) : 'border-border bg-card text-fg-2 hover:bg-hover',
                        )}
                      >
                        <Icon size={16} strokeWidth={1.75} />
                        <span className="text-center leading-tight">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold mb-2 text-fg-muted">Nome</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  placeholder="Ex: Alimentação, Salário, Reserva..."
                  className={fieldCls}
                />
              </div>

              {/* Ícone */}
              <div>
                <label className="block text-xs font-semibold mb-2 text-fg-muted">Ícone</label>
                <button
                  type="button"
                  onClick={() => setIconPickerOpen(true)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-fg-2 hover:bg-hover transition-colors"
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
                  >
                    <LucideIcon name={icon} size={16} />
                  </span>
                  <span className="text-sm">{icon}</span>
                  <span className="ml-auto text-xs text-fg-muted">Alterar</span>
                </button>
              </div>

              {/* Cor */}
              <div>
                <label className="block text-xs font-semibold mb-2 text-fg-muted">Cor</label>
                <ColorPicker selected={color} onSelect={setColor} />
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 flex gap-3 shrink-0 border-t border-border">
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-on-primary bg-primary hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</>
                  : <><Check className="h-4 w-4" /> {editingId ? 'Salvar alterações' : 'Criar categoria'}</>
                }
              </button>
              <button
                onClick={closeDrawer}
                className="rounded-xl px-5 py-3 text-sm font-semibold border border-border text-fg-2 hover:bg-hover transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Icon picker */}
      {iconPickerOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay p-4"
          onClick={() => setIconPickerOpen(false)}
        >
          <div
            className="rounded-2xl p-5 max-w-md w-full shadow-2xl bg-card border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-fg">Selecione um ícone</h3>
              <button
                onClick={() => setIconPickerOpen(false)}
                aria-label="Fechar"
                className="p-2 rounded-lg text-fg-muted hover:bg-hover transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <IconPicker
              selected={icon}
              onSelect={(selectedIcon) => { setIcon(selectedIcon); setIconPickerOpen(false); }}
            />
          </div>
        </div>
      )}
    </AppLayout>
  );
}
