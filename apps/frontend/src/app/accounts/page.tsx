'use client';

import { useEffect, useState } from 'react';
import {
  Plus, Pencil, Trash2, X, Check, Loader2, AlertCircle,
  CreditCard, Wallet, Banknote, Receipt, TrendingUp,
} from 'lucide-react';
import { fmtCurrency } from '@/lib/currency';
import { CurrencyInput } from '@/lib/currency-input';
import { ColorPicker } from '@/lib/color-picker';
import { AppLayout } from '@/components/app-layout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dcash:token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Types ──────────────────────────────────────────────────────────────────

export type PaymentType = 'credit_card' | 'cash' | 'pix' | 'boleto' | 'financing';

type PaymentMethod = {
  id: string;
  name: string;
  type: PaymentType;
  color: string;
  icon: string;
  limit: number;
  closingDay?: number;
  dueDay?: number;
  description?: string;
  balance: number;
  userId: string;
  ownerId?: string;
  owner?: { id: string; name: string; avatar?: string };
};

const TYPE_OPTIONS: { value: PaymentType; label: string; icon: React.ReactNode; hasLimit: boolean }[] = [
  { value: 'credit_card', label: 'Cartão de Crédito', icon: <CreditCard size={18} />, hasLimit: true  },
  { value: 'financing',   label: 'Financiamento',     icon: <TrendingUp  size={18} />, hasLimit: true  },
  { value: 'cash',        label: 'Dinheiro',           icon: <Wallet      size={18} />, hasLimit: false },
  { value: 'pix',         label: 'PIX',                icon: <Banknote    size={18} />, hasLimit: false },
  { value: 'boleto',      label: 'Boleto',             icon: <Receipt     size={18} />, hasLimit: false },
];

const TYPE_LABELS: Record<PaymentType, string> = {
  credit_card: 'Cartão de Crédito',
  financing:   'Financiamento',
  cash:        'Dinheiro',
  pix:         'PIX',
  boleto:      'Boleto',
};

// ── Wallet card ───────────────────────────────────────────────────────────

function WalletCard({ item, onEdit, onDelete, deleting }: {
  item: PaymentMethod;
  onEdit: (item: PaymentMethod) => void;
  onDelete: (id: string) => void;
  deleting: string | null;
}) {
  const hasLimit = TYPE_OPTIONS.find((t) => t.value === item.type)?.hasLimit ?? false;

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-md group"
      style={{ background: `linear-gradient(135deg, ${item.color}ee, ${item.color}88)` }}
    >
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
      <div className="absolute -bottom-5 -left-5 w-20 h-20 rounded-full bg-white/10" />

      <div className="relative p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-white/70 font-bold">
              {TYPE_LABELS[item.type]}
            </p>
            <h3 className="text-sm font-bold text-white mt-0.5">{item.name}</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(item)}
              className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => onDelete(item.id)}
              disabled={deleting === item.id}
              className="p-1.5 bg-white/20 hover:bg-red-400/50 rounded-lg text-white transition"
            >
              {deleting === item.id
                ? <Loader2 size={12} className="animate-spin" />
                : <Trash2 size={12} />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[9px] text-white/60 uppercase tracking-wide">Saldo</p>
            <p className="text-sm font-bold text-white">{fmtCurrency(item.balance ?? 0)}</p>
          </div>
          {hasLimit && (
            <div>
              <p className="text-[9px] text-white/60 uppercase tracking-wide">Limite</p>
              <p className="text-sm font-bold text-white">{fmtCurrency(item.limit ?? 0)}</p>
            </div>
          )}
        </div>

        {hasLimit && (item.closingDay || item.dueDay) && (
          <div className="flex gap-3 pt-2 border-t border-white/20">
            {item.closingDay && (
              <p className="text-[10px] text-white/60">
                Fecha dia <span className="font-bold text-white">{item.closingDay}</span>
              </p>
            )}
            {item.dueDay && (
              <p className="text-[10px] text-white/60">
                Vence dia <span className="font-bold text-white">{item.dueDay}</span>
              </p>
            )}
          </div>
        )}

        {item.owner?.name && (
          <p className="text-[10px] text-white/60">
            Proprietário: <span className="font-semibold text-white">{item.owner.name}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────

type FormState = {
  name: string; type: PaymentType; color: string;
  limit: string; closingDay: string; dueDay: string; description: string;
};

const EMPTY_FORM: FormState = {
  name: '', type: 'credit_card', color: '#10b981',
  limit: '', closingDay: '', dueDay: '', description: '',
};

const fieldCls = 'w-full rounded-xl px-4 py-3 text-sm outline-none transition bg-emerald-50 dark:bg-slate-800 border border-emerald-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-500 dark:focus:border-emerald-400';

function PaymentMethodDrawer({ editing, onClose, onSaved }: {
  editing: PaymentMethod | null;
  onClose: () => void;
  onSaved: (item: PaymentMethod) => void;
}) {
  const [form, setForm] = useState<FormState>(
    editing ? {
      name: editing.name, type: editing.type,
      color: editing.color ?? '#10b981',
      limit: editing.limit ? String(editing.limit) : '',
      closingDay: editing.closingDay ? String(editing.closingDay) : '',
      dueDay: editing.dueDay ? String(editing.dueDay) : '',
      description: editing.description ?? '',
    } : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const hasLimit = TYPE_OPTIONS.find((t) => t.value === form.type)?.hasLimit ?? false;
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Informe o nome.'); return; }
    setSaving(true); setError(null);

    const body: Record<string, unknown> = {
      name: form.name.trim(), type: form.type,
      color: form.color, description: form.description,
    };
    if (hasLimit && form.limit)      body.limit      = Number(form.limit);
    if (hasLimit && form.closingDay) body.closingDay = Number(form.closingDay);
    if (hasLimit && form.dueDay)     body.dueDay     = Number(form.dueDay);

    try {
      const url    = editing ? `${API}/payment-methods/${editing.id}` : `${API}/payment-methods`;
      const method = editing ? 'PATCH' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Erro ao salvar.'); return; }
      onSaved(data);
    } catch {
      setError('Erro de conexão.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-[400px] flex flex-col bg-white dark:bg-slate-900 shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Live preview */}
        <div
          className="relative overflow-hidden p-5 shrink-0"
          style={{ background: `linear-gradient(135deg, ${form.color}ee, ${form.color}88)` }}
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-5 -left-5 w-24 h-24 rounded-full bg-white/10" />
          <div className="relative flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/70 font-semibold">
                {TYPE_LABELS[form.type]}
              </p>
              <p className="text-lg font-bold text-white mt-0.5 truncate max-w-[220px]">
                {form.name || 'Nome da conta'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition shrink-0"
            >
              <X size={14} />
            </button>
          </div>
          <div className="relative flex gap-5">
            <div>
              <p className="text-[10px] text-white/60 uppercase tracking-wide">Saldo</p>
              <p className="text-sm font-bold text-white">R$ 0,00</p>
            </div>
            {hasLimit && form.limit && (
              <div>
                <p className="text-[10px] text-white/60 uppercase tracking-wide">Limite</p>
                <p className="text-sm font-bold text-white">{fmtCurrency(Number(form.limit))}</p>
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs bg-red-50 border border-red-200 text-red-600">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          {/* Tipo */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2 text-slate-500">
              Tipo de conta
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, type: opt.value }))}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-lg text-[10px] font-semibold border transition ${
                    form.type === opt.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-emerald-200 bg-white text-slate-600 hover:bg-emerald-50'
                  }`}
                >
                  {opt.icon}
                  <span className="text-center leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-slate-500">
              Nome
            </label>
            <input
              value={form.name}
              onChange={set('name')}
              placeholder="Ex: Nubank, Bradesco, Dinheiro..."
              className={fieldCls}
            />
          </div>

          {/* Cor */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-slate-500">
              Cor do cartão
            </label>
            <ColorPicker
              selected={form.color}
              onSelect={(color) => setForm((p) => ({ ...p, color }))}
            />
          </div>

          {/* Limite e datas */}
          {hasLimit && (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-slate-500">
                  Limite (R$)
                </label>
                <CurrencyInput
                  value={parseFloat(form.limit) || 0}
                  onChange={(value) => setForm((p) => ({ ...p, limit: value.toString() }))}
                  placeholder="0,00"
                  className={fieldCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-slate-500">
                    Fechamento
                  </label>
                  <input
                    type="number" min={1} max={31}
                    value={form.closingDay}
                    onChange={set('closingDay')}
                    placeholder="Dia 1–31"
                    className={fieldCls}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-slate-500">
                    Vencimento
                  </label>
                  <input
                    type="number" min={1} max={31}
                    value={form.dueDay}
                    onChange={set('dueDay')}
                    placeholder="Dia 1–31"
                    className={fieldCls}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 flex gap-2.5 shrink-0 border-t border-emerald-100 dark:border-slate-700">
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white bg-emerald-950 hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? <><Loader2 size={15} className="animate-spin" /> Salvando…</>
              : <><Check size={15} /> {editing ? 'Atualizar' : 'Criar conta'}</>
            }
          </button>
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold border border-emerald-200 text-slate-600 hover:bg-emerald-50 transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const [items, setItems]       = useState<PaymentMethod[]>([]);
  const [loading, setLoading]   = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing]   = useState<PaymentMethod | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<PaymentType | 'all'>('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/payment-methods`, { headers: getAuthHeaders() });
        if (res.ok) setItems(await res.json());
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openCreate = () => { setEditing(null); setDrawerOpen(true); };
  const openEdit   = (item: PaymentMethod) => { setEditing(item); setDrawerOpen(true); };

  const handleSaved = (saved: PaymentMethod) => {
    setItems((prev) =>
      editing
        ? prev.map((p) => (p.id === saved.id ? saved : p))
        : [saved, ...prev],
    );
    setDrawerOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta forma de pagamento?')) return;
    setDeleting(id);
    try {
      await fetch(`${API}/payment-methods/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      setItems((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const filtered = filterType === 'all' ? items : items.filter((i) => i.type === filterType);

  const totals = {
    balance: items.reduce((s, i) => s + (i.balance ?? 0), 0),
    limit: items
      .filter((i) => TYPE_OPTIONS.find((t) => t.value === i.type)?.hasLimit)
      .reduce((s, i) => s + (i.limit ?? 0), 0),
  };

  const addButton = (
    <button
      data-tour="accounts-add-btn"
      onClick={openCreate}
      className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white bg-emerald-950 hover:bg-emerald-800 shadow transition"
    >
      <Plus size={16} /> Nova conta
    </button>
  );

  return (
    <AppLayout title="Carteira" subtitle={`${items.length} formas de pagamento`} actions={addButton} noPadding>
      <div className="h-full flex flex-col overflow-hidden">

        {/* Frozen: summary + filters */}
        <div className="shrink-0 px-6 pt-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div data-tour="accounts-balance-card" className="rounded-2xl border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Saldo Total</p>
              <p className={`text-xl font-bold ${totals.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {fmtCurrency(totals.balance)}
              </p>
            </div>
            <div data-tour="accounts-limit-card" className="rounded-2xl border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Limite Total</p>
              <p className="text-xl font-bold text-blue-600">{fmtCurrency(totals.limit)}</p>
            </div>
          </div>

          <div data-tour="accounts-filter-chips" className="flex gap-2 overflow-x-auto pb-1 mb-3">
            {(['all', ...TYPE_OPTIONS.map((t) => t.value)] as (PaymentType | 'all')[]).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`flex-shrink-0 text-xs px-4 py-2 rounded-full font-semibold transition border ${
                  filterType === t
                    ? 'bg-emerald-950 text-white border-emerald-950'
                    : 'bg-white dark:bg-slate-800 border-emerald-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-700'
                }`}
              >
                {t === 'all' ? 'Todos' : TYPE_LABELS[t as PaymentType]}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable: cards */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-emerald-600" />
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="rounded-2xl border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 shadow-sm text-center">
              <Wallet size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-base font-semibold text-emerald-950 dark:text-white">Nenhuma forma de pagamento</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Cadastre cartões, contas e outras formas de pagamento.</p>
              <button
                onClick={openCreate}
                className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white bg-emerald-950 hover:bg-emerald-800 transition"
              >
                <Plus size={16} /> Criar agora
              </button>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((item) => (
                <WalletCard
                  key={item.id}
                  item={item}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  deleting={deleting}
                />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && items.length > 0 && (
            <p className="text-center py-10 text-slate-500">Nenhum item com este filtro.</p>
          )}
        </div>
      </div>

      {drawerOpen && (
        <PaymentMethodDrawer
          editing={editing}
          onClose={() => setDrawerOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </AppLayout>
  );
}
