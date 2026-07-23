'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, X, Check, Loader2, AlertCircle, Pencil, ChevronDown } from 'lucide-react';
import { IconPicker, LucideIcon } from '@/lib/icon-picker';
import { ColorPicker } from '@/lib/color-picker';
import { AppLayout } from '@/components/app-layout';

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

const DEFAULT_ICON = 'Tag';

const TYPE_OPTIONS: { value: ApiType; label: string; accent: string; bg: string }[] = [
  { value: 'income',  label: 'Receita',               accent: '#059669', bg: 'bg-emerald-50  border-emerald-200' },
  { value: 'expense', label: 'Despesa',                accent: '#e11d48', bg: 'bg-rose-50     border-rose-200'    },
  { value: 'reserve', label: 'Reserva / Investimento', accent: '#2563eb', bg: 'bg-blue-50     border-blue-200'    },
];

const fieldCls = 'w-full rounded-xl px-4 py-3 text-sm outline-none transition bg-emerald-50 dark:bg-slate-800 border border-emerald-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-500 dark:focus:border-emerald-400';

function typeLabel(t: ApiType): string {
  return t === 'income' ? 'Receita' : t === 'expense' ? 'Despesa' : 'Reserva';
}

function accentFor(t: ApiType): string {
  return TYPE_OPTIONS.find((o) => o.value === t)?.accent ?? '#059669';
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [filterType, setFilterType] = useState<ApiType | 'all'>('all');
  const [expanded, setExpanded] = useState<Record<ApiType, boolean>>({
    income: false, expense: false, reserve: false,
  });

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
        const res = await fetch(`${API}/categories`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error();
        setCategories(await res.json());
      } catch {
        setError('Não foi possível carregar as categorias.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setName(''); setType('expense'); setColor('#10b981'); setIcon(DEFAULT_ICON);
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

  const handleDelete = async (id: string) => {
    setDeleteId(id);
    try {
      const res = await fetch(`${API}/categories/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message ?? 'Erro ao excluir categoria.');
        return;
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert('Erro de conexão ao excluir.');
    } finally {
      setDeleteId(null);
    }
  };

  const grouped: Record<ApiType, Category[]> = {
    income:  categories.filter((c) => c.type === 'income'),
    expense: categories.filter((c) => c.type === 'expense'),
    reserve: categories.filter((c) => c.type === 'reserve'),
  };

  const visibleTypes = filterType === 'all'
    ? TYPE_OPTIONS
    : TYPE_OPTIONS.filter((o) => o.value === filterType);

  const addButton = (
    <button
      data-tour="categories-add-btn"
      onClick={openCreate}
      className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white bg-emerald-950 hover:bg-emerald-800 shadow transition"
    >
      <Plus size={16} /> Nova categoria
    </button>
  );

  return (
    <AppLayout
      title="Categorias"
      subtitle={`${categories.length} categorias cadastradas`}
      actions={addButton}
      noPadding
    >
      <div className="h-full flex flex-col overflow-hidden">

        {/* Frozen: summary cards */}
        <div className="shrink-0 px-6 pt-4">
          <div data-tour="categories-type-filters" className="grid grid-cols-3 gap-3 mb-3">
            {TYPE_OPTIONS.map((opt) => {
              const active = filterType === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setFilterType(active ? 'all' : opt.value)}
                  className="rounded-2xl p-4 text-left border-2 transition shadow-sm bg-white dark:bg-slate-900"
                  style={{
                    borderColor: active ? opt.accent : '#d1fae5',
                    backgroundColor: active ? `${opt.accent}0d` : undefined,
                  }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1"
                    style={{ color: opt.accent }}>
                    {opt.label}
                  </p>
                  <p className="text-xl font-bold text-emerald-950 dark:text-white">{grouped[opt.value].length}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">categorias</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable: groups + cards */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          )}

          {!loading && categories.length === 0 && (
            <div className="rounded-2xl border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 shadow-sm text-center">
              <div className="text-4xl mb-3">📂</div>
              <p className="text-base font-semibold text-emerald-950 dark:text-white">Nenhuma categoria ainda</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Crie sua primeira categoria para organizar suas finanças.</p>
              <button
                onClick={openCreate}
                className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white bg-emerald-950 hover:bg-emerald-800 transition"
              >
                <Plus size={16} /> Criar categoria
              </button>
            </div>
          )}

          {!loading && categories.length > 0 && (
            <div data-tour="categories-list" className="space-y-4">
              {visibleTypes.map((opt) => {
                const list = grouped[opt.value];
                if (list.length === 0 && filterType !== opt.value) return null;
                const isOpen = expanded[opt.value] || filterType === opt.value;
                return (
                  <section key={opt.value} className="rounded-2xl border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [opt.value]: !prev[opt.value] }))}
                      className="flex w-full items-center gap-2.5 text-left"
                    >
                      <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: opt.accent }}>
                        {opt.label}
                      </h2>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: `${opt.accent}18`, color: opt.accent }}
                      >
                        {list.length}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`ml-auto text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isOpen && (
                      <div className="mt-3">
                        {list.length === 0 ? (
                          <p className="text-sm text-slate-400 py-3">Nenhuma categoria de {opt.label.toLowerCase()}.</p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                            {list.map((cat) => (
                              <div
                                key={cat.id}
                                onClick={() => openEdit(cat)}
                                className="group relative rounded-xl p-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-200 dark:hover:border-slate-600 hover:bg-emerald-50 dark:hover:bg-slate-700 transition cursor-pointer"
                              >
                                <div
                                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                                  style={{ backgroundColor: `${cat.color}22`, color: cat.color || '#10b981' }}
                                >
                                  <LucideIcon name={cat.icon || DEFAULT_ICON} size={16} />
                                </div>

                                <p className="font-semibold text-xs text-emerald-950 dark:text-white truncate">{cat.name}</p>

                                <span
                                  className="mt-1 inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                  style={{ background: `${accentFor(cat.type)}18`, color: accentFor(cat.type) }}
                                >
                                  {typeLabel(cat.type)}
                                </span>

                                <div
                                  className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full border-2 border-white"
                                  style={{ backgroundColor: cat.color || '#10b981' }}
                                />

                                <div className="absolute bottom-2 right-2 flex items-center gap-1">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openEdit(cat); }}
                                    className="p-1 rounded-lg text-slate-400 hover:text-emerald-600"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(cat.id); }}
                                    disabled={deleteId === cat.id}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500"
                                  >
                                    {deleteId === cat.id
                                      ? <Loader2 className="h-3 w-3 animate-spin" />
                                      : <Trash2 className="h-3 w-3" />}
                                  </button>
                                </div>
                              </div>
                            ))}
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
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closeDrawer} />

          <div className="w-full max-w-[440px] flex flex-col bg-white dark:bg-slate-900 shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Live preview */}
            <div
              className="relative overflow-hidden p-6 shrink-0"
              style={{ background: `linear-gradient(135deg, ${color}ee, ${color}88)` }}
            >
              <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
              <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/10" />
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-white/25">
                    <LucideIcon name={icon} size={28} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-white/70 font-semibold">{typeLabel(type)}</p>
                    <p className="text-xl font-bold text-white mt-0.5 truncate max-w-[200px]">
                      {name || 'Nome da categoria'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeDrawer}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && (
                <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </div>
              )}

              {/* Tipo */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-3 text-slate-500">
                  Tipo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setType(opt.value)}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl text-xs font-semibold border transition"
                      style={
                        type === opt.value
                          ? { borderColor: opt.accent, backgroundColor: `${opt.accent}12`, color: opt.accent }
                          : { borderColor: '#d1fae5', backgroundColor: '#f0fdf4', color: '#475569' }
                      }
                    >
                      <span className="text-center leading-tight">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-500">
                  Nome
                </label>
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
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-500">
                  Ícone
                </label>
                <button
                  type="button"
                  onClick={() => setIconPickerOpen(true)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-slate-700 hover:bg-emerald-100 transition"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${color}22`, color }}
                  >
                    <LucideIcon name={icon} size={16} />
                  </div>
                  <span className="text-sm">{icon}</span>
                </button>
              </div>

              {/* Cor */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-slate-500">
                  Cor
                </label>
                <ColorPicker selected={color} onSelect={setColor} />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 flex gap-3 shrink-0 border-t border-emerald-100">
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white bg-emerald-950 hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</>
                  : <><Check className="h-4 w-4" /> {editingId ? 'Salvar alterações' : 'Criar categoria'}</>
                }
              </button>
              <button
                onClick={closeDrawer}
                className="rounded-xl px-5 py-3 text-sm font-semibold border border-emerald-200 text-slate-600 hover:bg-emerald-50 transition"
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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIconPickerOpen(false)}
        >
          <div
            className="rounded-[28px] p-5 max-w-md w-full shadow-2xl bg-white border border-emerald-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-emerald-950">Selecione um ícone</h3>
              <button
                onClick={() => setIconPickerOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:bg-emerald-50 transition"
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
