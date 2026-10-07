'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Pencil, Trash2, X, Check, Loader2, AlertCircle,
  CreditCard, Wallet, Banknote, Receipt, TrendingUp, TrendingDown, Landmark, Zap,
  Nfc, CalendarClock, ShoppingBag, Layers, ArrowDownLeft, ArrowUpRight, Sparkles,
} from '@/components/ui/icons';
import { fmtCurrency } from '@/lib/currency';
import { CurrencyInput } from '@/lib/currency-input';
import { ColorPicker } from '@/lib/color-picker';
import { AppLayout } from '@/components/app-layout';
import { cn, parseDateOnly } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dcash:token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Types ──────────────────────────────────────────────────────────────────

export type PaymentType = 'credit_card' | 'debit_card' | 'cash' | 'pix' | 'boleto' | 'financing';

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

type Tx = {
  id: string;
  description: string;
  amount: number | string;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  isPaid: boolean;
  installmentGroup?: string | null;
  piggyBankId?: string | null;
  category?: { id: string | null; name: string | null; color: string | null } | null;
  paymentMethod?: { id: string | null } | null;
};

type Stats = {
  spent: number;
  income: number;
  prevSpent: number;
  count: number;
  topCategory: { name: string; amount: number } | null;
  last: Tx | null;
  activeInstallments: number;
};

const TYPE_OPTIONS: { value: PaymentType; label: string; icon: React.ReactNode; hasLimit: boolean }[] = [
  { value: 'credit_card', label: 'Cartão de Crédito', icon: <CreditCard size={18} />, hasLimit: true  },
  { value: 'debit_card',  label: 'Cartão de Débito',  icon: <CreditCard size={18} />, hasLimit: false },
  { value: 'cash',        label: 'Dinheiro',          icon: <Wallet     size={18} />, hasLimit: false },
  { value: 'pix',         label: 'PIX',               icon: <Zap        size={18} />, hasLimit: false },
  { value: 'boleto',      label: 'Boleto',            icon: <Receipt    size={18} />, hasLimit: false },
  { value: 'financing',   label: 'Financiamento',     icon: <TrendingUp size={18} />, hasLimit: true  },
];

const TYPE_LABELS: Record<PaymentType, string> = {
  credit_card: 'Cartão de Crédito',
  debit_card:  'Cartão de Débito',
  financing:   'Financiamento',
  cash:        'Dinheiro',
  pix:         'PIX',
  boleto:      'Boleto',
};

const hasLimitType = (t: PaymentType) => TYPE_OPTIONS.find((o) => o.value === t)?.hasLimit ?? false;
const isCardType = (t: PaymentType) => t === 'credit_card' || t === 'debit_card';

// ── Skin options (persisted in payment_method.icon) ───────────────────────

type CardBrand = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'other';
type Currency = 'BRL' | 'USD' | 'EUR';

const BRANDS: { value: CardBrand; label: string }[] = [
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'visa',       label: 'Visa' },
  { value: 'elo',        label: 'Elo' },
  { value: 'amex',       label: 'Amex' },
  { value: 'hipercard',  label: 'Hipercard' },
  { value: 'other',      label: 'Outra' },
];

/* Banknote skins are illustrations (like the hero card), so they carry their own palette */
const CURRENCIES: Record<Currency, { label: string; symbol: string; from: string; to: string; ink: string; issuer: string }> = {
  BRL: { label: 'Real',  symbol: 'R$', from: '#2f6f86', to: '#173f4f', ink: '#a8dbea', issuer: 'REPÚBLICA FEDERATIVA DO BRASIL' },
  USD: { label: 'Dólar', symbol: 'US$', from: '#4f6e51', to: '#25392a', ink: '#d3e6c4', issuer: 'FEDERAL RESERVE NOTE' },
  EUR: { label: 'Euro',  symbol: '€',  from: '#9a5b2b', to: '#56300f', ink: '#f5cf9f', issuer: 'BCE · ECB · EZB · EKT · EKP' },
};

const brandOf = (icon?: string): CardBrand =>
  (BRANDS.some((b) => b.value === icon) ? icon : 'other') as CardBrand;
const currencyOf = (icon?: string): Currency =>
  (icon && icon in CURRENCIES ? icon : 'BRL') as Currency;

// ── Color helpers ─────────────────────────────────────────────────────────

function mix(hex: string, target: string, amount: number) {
  const parse = (h: string) => {
    const v = h.replace('#', '');
    const full = v.length === 3 ? v.split('').map((c) => c + c).join('') : v.padEnd(6, '0');
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) || 0);
  };
  const a = parse(hex), b = parse(target);
  return `rgb(${a.map((c, i) => Math.round(c + (b[i] - c) * amount)).join(',')})`;
}

const skinGradient = (color: string) =>
  `linear-gradient(135deg, ${mix(color || '#10b981', '#ffffff', 0.08)} 0%, ${mix(color || '#10b981', '#000000', 0.35)} 55%, ${mix(color || '#10b981', '#000000', 0.6)} 100%)`;

const pad2 = (n: number) => String(n).padStart(2, '0');

// ── Skins ─────────────────────────────────────────────────────────────────

function BrandMark({ brand }: { brand: CardBrand }) {
  switch (brand) {
    case 'visa':
      return <span className="text-[22px] font-black italic leading-none tracking-tight text-white">VISA</span>;
    case 'mastercard':
      return (
        <span className="flex items-center">
          <span className="h-7 w-7 rounded-full bg-[#eb001b]/95" />
          <span className="-ml-3 h-7 w-7 rounded-full bg-[#f79e1b]/90 mix-blend-screen" />
        </span>
      );
    case 'elo':
      return (
        <span className="flex items-center gap-1 text-lg font-extrabold lowercase leading-none text-white">
          <span className="flex flex-col gap-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ffcb05]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#00a4e0]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#ef4123]" />
          </span>
          elo
        </span>
      );
    case 'amex':
      return <span className="rounded-sm border border-white/80 px-1.5 py-0.5 text-[11px] font-bold tracking-widest text-white">AMEX</span>;
    case 'hipercard':
      return <span className="rounded bg-[#b3131b] px-1.5 py-0.5 text-[11px] font-bold italic text-white">Hipercard</span>;
    default:
      return <CreditCard size={22} className="text-white/80" strokeWidth={1.5} />;
  }
}

function CardSkin({ item }: { item: Pick<PaymentMethod, 'name' | 'type' | 'color' | 'icon' | 'closingDay' | 'dueDay' | 'owner'> }) {
  const isCredit = item.type === 'credit_card';
  return (
    <div
      className="relative aspect-[1.586/1] w-full overflow-hidden rounded-2xl p-5 text-white shadow-lg ring-1 ring-white/10"
      style={{ background: skinGradient(item.color) }}
    >
      {/* Sheen + pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,rgba(255,255,255,0.22),transparent_55%)]" />
      <div className="pointer-events-none absolute -right-16 -bottom-24 h-64 w-64 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -right-4 -bottom-28 h-64 w-64 rounded-full border border-white/10" />

      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-tight">{item.name || 'Nome do cartão'}</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/60">{isCredit ? 'Crédito' : 'Débito'}</p>
          </div>
          <Nfc size={20} className="shrink-0 text-white/70" strokeWidth={1.5} />
        </div>

        {/* Chip */}
        <div className="flex items-center gap-3">
          <div
            className="relative h-8 w-11 overflow-hidden rounded-md"
            style={{ background: 'linear-gradient(135deg,#f1dc9a 0%,#c9a24a 50%,#e6cf86 100%)' }}
          >
            <span className="absolute inset-x-0 top-1/2 h-px bg-black/25" />
            <span className="absolute inset-y-0 left-1/3 w-px bg-black/25" />
            <span className="absolute inset-y-0 right-1/3 w-px bg-black/25" />
            <span className="absolute left-1/3 right-1/3 top-1/4 bottom-1/4 rounded-sm border border-black/20" />
          </div>
          <p className="font-mono text-sm tracking-[0.2em] text-white/80">•••• ••••</p>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.14em] text-white/50">Titular</p>
            <p className="truncate text-[13px] font-medium uppercase tracking-wide">{item.owner?.name || '—'}</p>
          </div>
          <div className="flex items-end gap-4">
            {isCredit && (item.closingDay || item.dueDay) && (
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/50">Fecha · Vence</p>
                <p className="font-mono text-[13px] tabular-nums">
                  {item.closingDay ? pad2(item.closingDay) : '--'}/{item.dueDay ? pad2(item.dueDay) : '--'}
                </p>
              </div>
            )}
            <BrandMark brand={brandOf(item.icon)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BanknoteSkin({ item, amount, serial }: {
  item: Pick<PaymentMethod, 'name' | 'icon' | 'owner'>;
  amount: number;
  serial: string;
}) {
  const cur = CURRENCIES[currencyOf(item.icon)];
  return (
    <div
      className="relative aspect-[2.15/1] w-full overflow-hidden rounded-xl text-white shadow-lg ring-1 ring-white/10"
      style={{ background: `linear-gradient(120deg, ${cur.from}, ${cur.to})` }}
    >
      {/* Guilloche */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: [
            'repeating-radial-gradient(circle at 22% 50%, rgba(255,255,255,0.09) 0 1px, transparent 1px 7px)',
            'repeating-linear-gradient(115deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 9px)',
          ].join(','),
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_85%_10%,rgba(255,255,255,0.18),transparent_60%)]" />

      {/* Frame */}
      <div className="absolute inset-2 rounded-lg border border-white/25" />
      <div className="absolute inset-3 rounded-md border border-dashed border-white/10" />

      <div className="relative flex h-full items-center gap-4 px-6 py-5">
        {/* Medallion */}
        <div
          className="flex aspect-square h-[62%] shrink-0 items-center justify-center rounded-full border-2 border-white/30"
          style={{ background: `radial-gradient(circle, ${cur.ink}33, transparent 70%)` }}
        >
          <span className="text-2xl font-bold" style={{ color: cur.ink }}>{cur.symbol}</span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[8px] font-semibold tracking-[0.18em]" style={{ color: cur.ink }}>{cur.issuer}</p>
            <p className="shrink-0 font-mono text-[9px] tracking-widest text-white/60">{serial}</p>
          </div>
          <div>
            <p className="truncate text-[10px] uppercase tracking-[0.16em] text-white/60">{item.name || 'Dinheiro'} · {cur.label}</p>
            <p className="truncate text-[26px] font-semibold leading-tight tabular-nums tracking-tight">{fmtCurrency(amount)}</p>
          </div>
          <p className="truncate text-[9px] uppercase tracking-[0.14em] text-white/50">{item.owner?.name || ' '}</p>
        </div>
      </div>
    </div>
  );
}

function FlatSkin({ item }: { item: Pick<PaymentMethod, 'name' | 'type' | 'color' | 'owner'> }) {
  const Icon = item.type === 'financing' ? Landmark : item.type === 'boleto' ? Receipt : Zap;
  return (
    <div
      className="relative aspect-[2.15/1] w-full overflow-hidden rounded-2xl p-5 text-white shadow-lg ring-1 ring-white/10"
      style={{ background: skinGradient(item.color) }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,rgba(255,255,255,0.2),transparent_55%)]" />
      <Icon className="pointer-events-none absolute -right-4 -bottom-6 h-36 w-36 text-white/10" strokeWidth={1.25} />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <Icon size={18} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-tight">{item.name || 'Nome da conta'}</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/60">{TYPE_LABELS[item.type]}</p>
          </div>
        </div>
        <p className="truncate text-[11px] uppercase tracking-[0.14em] text-white/60">{item.owner?.name || ' '}</p>
      </div>
    </div>
  );
}

function Skin({ item }: { item: PaymentMethod }) {
  if (isCardType(item.type)) return <CardSkin item={item} />;
  if (item.type === 'cash') return <BanknoteSkin item={item} amount={item.balance ?? 0} serial={`Nº ${item.id.slice(0, 8).toUpperCase()}`} />;
  return <FlatSkin item={item} />;
}

// ── Account card (skin + insights) ────────────────────────────────────────

function daysUntilDay(day: number) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  let target = new Date(now.getFullYear(), now.getMonth(), day);
  if (target < now) target = new Date(now.getFullYear(), now.getMonth() + 1, day);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

function Trend({ curr, prev }: { curr: number; prev: number }) {
  if (prev === 0 && curr === 0) return null;
  const pct = prev > 0 ? ((curr - prev) / prev) * 100 : 100;
  if (Math.round(pct) === 0) return <span className="text-[11px] text-fg-muted">= mês anterior</span>;
  const up = pct > 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
      up ? 'border-danger/30 bg-danger-soft text-danger' : 'border-primary-border bg-primary-soft text-accent')}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

function AccountCard({ item, stats, onEdit, onDelete, deleting }: {
  item: PaymentMethod;
  stats: Stats;
  onEdit: (item: PaymentMethod) => void;
  onDelete: (id: string) => void;
  deleting: string | null;
}) {
  const limited = hasLimitType(item.type);
  const limit = Number(item.limit ?? 0);
  const available = Number(item.balance ?? 0);
  const used = Math.max(0, limit - available);
  const usedPct = limit > 0 ? (used / limit) * 100 : 0;
  const over = available < 0;
  const dueIn = item.dueDay ? daysUntilDay(item.dueDay) : null;
  const bestDay = item.closingDay ? (item.closingDay % 31) + 1 : null;

  return (
    <article className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-border-hover">
      <div className="relative">
        <Skin item={item} />
        <div className="absolute right-3 top-3 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
          <button
            onClick={() => onEdit(item)}
            aria-label="Editar"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 transition"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            disabled={deleting === item.id}
            aria-label="Excluir"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-black/30 text-white backdrop-blur-sm hover:bg-danger transition"
          >
            {deleting === item.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </button>
        </div>
      </div>

      <div className="space-y-3 px-1.5 pb-1.5">
        {limited ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] text-fg-muted">{item.type === 'financing' ? 'Saldo devedor' : 'Fatura em aberto'}</p>
                <p className="text-xl font-semibold tabular-nums tracking-tight text-fg">{fmtCurrency(used)}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-fg-muted">Disponível</p>
                <p className={cn('text-[13px] font-semibold tabular-nums', over ? 'text-danger' : 'text-accent')}>{fmtCurrency(available)}</p>
              </div>
            </div>
            <div>
              <div className="h-1.5 overflow-hidden rounded-full bg-track">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', usedPct > 90 ? 'bg-danger' : usedPct > 70 ? 'bg-warning' : 'bg-primary')}
                  style={{ width: `${Math.min(100, usedPct)}%` }}
                />
              </div>
              <p className={cn('mt-1.5 text-[11px] tabular-nums', over ? 'font-medium text-danger' : 'text-fg-muted')}>
                {over
                  ? `Limite estourado em ${fmtCurrency(Math.abs(available))}`
                  : `${usedPct.toFixed(0)}% de ${fmtCurrency(limit)} usado`}
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] text-fg-muted">Saldo</p>
              <p className={cn('text-xl font-semibold tabular-nums tracking-tight', available < 0 ? 'text-danger' : 'text-fg')}>{fmtCurrency(available)}</p>
            </div>
            <div className="flex gap-3 text-right">
              <div>
                <p className="flex items-center justify-end gap-0.5 text-[11px] text-fg-muted"><ArrowDownLeft size={11} /> Entradas</p>
                <p className="text-[13px] font-semibold tabular-nums text-accent">{fmtCurrency(stats.income)}</p>
              </div>
              <div>
                <p className="flex items-center justify-end gap-0.5 text-[11px] text-fg-muted"><ArrowUpRight size={11} /> Saídas</p>
                <p className="text-[13px] font-semibold tabular-nums text-fg">{fmtCurrency(stats.spent)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Insights */}
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface-2/60 text-xs">
          <li className="flex items-center justify-between gap-2 px-3 py-2">
            <span className="flex items-center gap-2 text-fg-muted"><ShoppingBag size={13} strokeWidth={1.75} /> Gasto no mês</span>
            <span className="flex items-center gap-2">
              <Trend curr={stats.spent} prev={stats.prevSpent} />
              <span className="font-semibold tabular-nums text-fg">{fmtCurrency(stats.spent)}</span>
            </span>
          </li>

          {item.type === 'credit_card' && dueIn !== null && (
            <li className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="flex items-center gap-2 text-fg-muted"><CalendarClock size={13} strokeWidth={1.75} /> Vencimento</span>
              <span className={cn('font-medium', dueIn <= 3 ? 'text-warning' : 'text-fg')}>
                {dueIn === 0 ? 'Hoje' : `Em ${dueIn} dia${dueIn === 1 ? '' : 's'}`} · dia {item.dueDay}
              </span>
            </li>
          )}

          {item.type === 'credit_card' && bestDay && (
            <li className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="flex items-center gap-2 text-fg-muted"><Sparkles size={13} strokeWidth={1.75} /> Melhor dia de compra</span>
              <span className="font-medium text-accent">Dia {bestDay}</span>
            </li>
          )}

          {stats.activeInstallments > 0 && (
            <li className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="flex items-center gap-2 text-fg-muted"><Layers size={13} strokeWidth={1.75} /> Parcelamentos ativos</span>
              <span className="font-medium text-fg">{stats.activeInstallments}</span>
            </li>
          )}

          {stats.topCategory && (
            <li className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="text-fg-muted">Maior categoria</span>
              <span className="min-w-0 truncate text-right font-medium text-fg">
                {stats.topCategory.name} <span className="text-fg-muted">· {stats.spent > 0 ? Math.round((stats.topCategory.amount / stats.spent) * 100) : 0}%</span>
              </span>
            </li>
          )}

          <li className="flex items-center justify-between gap-2 px-3 py-2">
            <span className="text-fg-muted">Última movimentação</span>
            {stats.last ? (
              <span className="min-w-0 truncate text-right text-fg-2">
                {stats.last.description}
                <span className="text-fg-muted"> · {parseDateOnly(stats.last.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
              </span>
            ) : (
              <span className="text-fg-muted">Nenhuma</span>
            )}
          </li>
        </ul>
      </div>
    </article>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────

type FormState = {
  name: string; type: PaymentType; color: string; skin: string;
  limit: string; closingDay: string; dueDay: string; description: string;
};

const EMPTY_FORM: FormState = {
  name: '', type: 'credit_card', color: '#10b981', skin: 'mastercard',
  limit: '', closingDay: '', dueDay: '', description: '',
};

const defaultSkin = (type: PaymentType, icon?: string) =>
  type === 'cash' ? currencyOf(icon) : isCardType(type) ? (brandOf(icon) === 'other' && !icon ? 'mastercard' : brandOf(icon)) : icon ?? '';

const fieldCls = 'w-full rounded-xl px-4 py-3 text-sm outline-none transition bg-primary-soft dark:bg-surface-2 border border-primary-border dark:border-border text-fg placeholder:text-fg-muted focus:border-primary ';

function PaymentMethodDrawer({ editing, onClose, onSaved }: {
  editing: PaymentMethod | null;
  onClose: () => void;
  onSaved: (item: PaymentMethod) => void;
}) {
  const [form, setForm] = useState<FormState>(
    editing ? {
      name: editing.name, type: editing.type,
      color: editing.color ?? '#10b981',
      skin: defaultSkin(editing.type, editing.icon),
      limit: editing.limit ? String(editing.limit) : '',
      closingDay: editing.closingDay ? String(editing.closingDay) : '',
      dueDay: editing.dueDay ? String(editing.dueDay) : '',
      description: editing.description ?? '',
    } : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const hasLimit = hasLimitType(form.type);
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const setType = (type: PaymentType) =>
    setForm((p) => ({
      ...p,
      type,
      skin: type === 'cash'
        ? (p.skin in CURRENCIES ? p.skin : 'BRL')
        : isCardType(type)
          ? (BRANDS.some((b) => b.value === p.skin) ? p.skin : 'mastercard')
          : p.skin,
    }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Informe o nome.'); return; }
    setSaving(true); setError(null);

    const body: Record<string, unknown> = {
      name: form.name.trim(), type: form.type,
      color: form.color, description: form.description,
    };
    if (isCardType(form.type) || form.type === 'cash') body.icon = form.skin;
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

  const preview: PaymentMethod = {
    id: editing?.id ?? 'novo0000',
    name: form.name,
    type: form.type,
    color: form.color,
    icon: form.skin,
    limit: Number(form.limit) || 0,
    closingDay: Number(form.closingDay) || undefined,
    dueDay: Number(form.dueDay) || undefined,
    balance: editing?.balance ?? 0,
    userId: editing?.userId ?? '',
    owner: editing?.owner,
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-overlay backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-[420px] flex flex-col bg-card shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header + live preview */}
        <div className="shrink-0 border-b border-border bg-surface-2 p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-fg">{editing ? 'Editar forma de pagamento' : 'Nova forma de pagamento'}</p>
            <button onClick={onClose} aria-label="Fechar" className="icon-btn !h-8 !w-8">
              <X size={14} />
            </button>
          </div>
          <Skin item={preview} />
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs bg-danger-soft border border-danger/30 text-danger">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          {/* Tipo */}
          <div>
            <label className="block text-[11px] font-semibold mb-2 text-fg-muted">Tipo de conta</label>
            <div className="grid grid-cols-3 gap-1.5">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-2 rounded-lg text-[11px] font-semibold border transition',
                    form.type === opt.value
                      ? 'border-primary bg-primary-soft text-accent'
                      : 'border-border bg-card text-fg-2 hover:bg-hover',
                  )}
                >
                  {opt.icon}
                  <span className="text-center leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-[11px] font-semibold mb-1.5 text-fg-muted">Nome</label>
            <input
              value={form.name}
              onChange={set('name')}
              placeholder="Ex: Nubank, Bradesco, Carteira..."
              className={fieldCls}
            />
          </div>

          {/* Bandeira (cartões) */}
          {isCardType(form.type) && (
            <div>
              <label className="block text-[11px] font-semibold mb-2 text-fg-muted">Bandeira</label>
              <div className="grid grid-cols-3 gap-1.5">
                {BRANDS.map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, skin: b.value }))}
                    className={cn(
                      'h-9 rounded-lg border text-xs font-medium transition',
                      form.skin === b.value ? 'border-primary bg-primary-soft text-accent' : 'border-border text-fg-2 hover:bg-hover',
                    )}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cédula (dinheiro) */}
          {form.type === 'cash' && (
            <div>
              <label className="block text-[11px] font-semibold mb-2 text-fg-muted">Estilo da cédula</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(CURRENCIES) as Currency[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, skin: c }))}
                    className={cn(
                      'flex h-10 items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition',
                      form.skin === c ? 'border-primary bg-primary-soft text-accent' : 'border-border text-fg-2 hover:bg-hover',
                    )}
                  >
                    <span className="font-semibold">{CURRENCIES[c].symbol}</span> {CURRENCIES[c].label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-fg-muted">Apenas visual: os valores continuam em reais.</p>
            </div>
          )}

          {/* Cor */}
          {form.type !== 'cash' && (
            <div>
              <label className="block text-[11px] font-semibold mb-1.5 text-fg-muted">Cor do cartão</label>
              <ColorPicker
                selected={form.color}
                onSelect={(color) => setForm((p) => ({ ...p, color }))}
              />
            </div>
          )}

          {/* Limite e datas */}
          {hasLimit && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold mb-1.5 text-fg-muted">Limite (R$)</label>
                <CurrencyInput
                  value={parseFloat(form.limit) || 0}
                  onChange={(value) => setForm((p) => ({ ...p, limit: value.toString() }))}
                  placeholder="0,00"
                  className={fieldCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5 text-fg-muted">Fechamento</label>
                  <input
                    type="number" min={1} max={31}
                    value={form.closingDay}
                    onChange={set('closingDay')}
                    placeholder="Dia 1–31"
                    className={fieldCls}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5 text-fg-muted">Vencimento</label>
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
        <div className="p-5 flex gap-2.5 shrink-0 border-t border-border">
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-on-primary bg-primary hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? <><Loader2 size={15} className="animate-spin" /> Salvando…</>
              : <><Check size={15} /> {editing ? 'Atualizar' : 'Criar conta'}</>
            }
          </button>
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold border border-border text-fg-2 hover:bg-hover transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

const TAB_ICONS: Record<PaymentType | 'all', React.ElementType> = {
  all: Layers, credit_card: CreditCard, debit_card: CreditCard, cash: Banknote, pix: Zap, boleto: Receipt, financing: Landmark,
};

const SECTIONS: { key: string; title: string; types: PaymentType[] }[] = [
  { key: 'cards', title: 'Cartões',        types: ['credit_card', 'debit_card'] },
  { key: 'cash',  title: 'Dinheiro',       types: ['cash'] },
  { key: 'other', title: 'Outras contas',  types: ['pix', 'boleto', 'financing'] },
];

const EMPTY_STATS: Stats = { spent: 0, income: 0, prevSpent: 0, count: 0, topCategory: null, last: null, activeInstallments: 0 };

export default function AccountsPage() {
  const [items, setItems]       = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading]   = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing]   = useState<PaymentMethod | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<PaymentType | 'all'>('all');

  const loadItems = async () => {
    const res = await fetch(`${API}/payment-methods`, { headers: getAuthHeaders() });
    if (res.ok) setItems(await res.json());
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadItems(),
          fetch(`${API}/transactions`, { headers: getAuthHeaders() })
            .then((r) => (r.ok ? r.json() : []))
            .then((d) => setTransactions(Array.isArray(d) ? d : []))
            .catch(() => setTransactions([])),
        ]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openCreate = () => { setEditing(null); setDrawerOpen(true); };
  const openEdit   = (item: PaymentMethod) => { setEditing(item); setDrawerOpen(true); };

  const handleSaved = () => {
    // Reload so the computed balance (from transactions) comes back with the item
    loadItems().catch(() => {});
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

  /* ── Per-account stats (current month) ──────────────────────── */
  const statsById = useMemo(() => {
    const now = new Date();
    const inMonth = (iso: string, offset: number) => {
      const d = parseDateOnly(iso);
      const ref = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
    };
    const map: Record<string, Stats> = {};
    const cats: Record<string, Record<string, number>> = {};
    const groups: Record<string, Set<string>> = {};

    transactions.forEach((t) => {
      const pmId = t.paymentMethod?.id;
      if (!pmId) return;
      const s = (map[pmId] ||= { ...EMPTY_STATS });
      const amount = Number(t.amount);
      const isSpend = t.type === 'EXPENSE' && !t.piggyBankId;

      if (inMonth(t.date, 0)) {
        s.count += 1;
        if (t.type === 'INCOME') s.income += amount;
        if (isSpend) {
          s.spent += amount;
          const cat = t.category?.name || 'Sem categoria';
          (cats[pmId] ||= {})[cat] = (cats[pmId][cat] || 0) + amount;
        }
      } else if (isSpend && inMonth(t.date, -1)) {
        s.prevSpent += amount;
      }

      if (parseDateOnly(t.date) <= now && (!s.last || parseDateOnly(t.date) > parseDateOnly(s.last.date))) s.last = t;
      if (t.installmentGroup && !t.isPaid) (groups[pmId] ||= new Set()).add(t.installmentGroup);
    });

    Object.entries(map).forEach(([id, s]) => {
      const top = Object.entries(cats[id] || {}).sort((a, b) => b[1] - a[1])[0];
      s.topCategory = top ? { name: top[0], amount: top[1] } : null;
      s.activeInstallments = groups[id]?.size ?? 0;
    });
    return map;
  }, [transactions]);

  /* ── Totals ─────────────────────────────────────────────────── */
  const totals = useMemo(() => {
    const accounts = items.filter((i) => !hasLimitType(i.type));
    const credit = items.filter((i) => i.type === 'credit_card');
    const limit = credit.reduce((s, i) => s + Number(i.limit ?? 0), 0);
    const available = credit.reduce((s, i) => s + Number(i.balance ?? 0), 0);
    const spent = items.reduce((s, i) => s + (statsById[i.id]?.spent ?? 0), 0);
    const prevSpent = items.reduce((s, i) => s + (statsById[i.id]?.prevSpent ?? 0), 0);
    const top = [...items].sort((a, b) => (statsById[b.id]?.spent ?? 0) - (statsById[a.id]?.spent ?? 0))[0];
    return {
      balance: accounts.reduce((s, i) => s + Number(i.balance ?? 0), 0),
      accountsCount: accounts.length,
      limit,
      available,
      used: Math.max(0, limit - available),
      usedPct: limit > 0 ? Math.min(100, ((limit - available) / limit) * 100) : 0,
      spent,
      prevSpent,
      topMethod: top && (statsById[top.id]?.spent ?? 0) > 0 ? top : null,
    };
  }, [items, statsById]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    items.forEach((i) => { c[i.type] = (c[i.type] || 0) + 1; });
    return c;
  }, [items]);

  const filtered = filterType === 'all' ? items : items.filter((i) => i.type === filterType);

  const addButton = (
    <button data-tour="accounts-add-btn" onClick={openCreate} className="btn btn-primary">
      <Plus size={16} /> Nova conta
    </button>
  );

  const renderGrid = (list: PaymentMethod[]) => (
    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {list.map((item) => (
        <AccountCard
          key={item.id}
          item={item}
          stats={statsById[item.id] ?? EMPTY_STATS}
          onEdit={openEdit}
          onDelete={handleDelete}
          deleting={deleting}
        />
      ))}
    </div>
  );

  return (
    <AppLayout title="Carteira" subtitle={`${items.length} formas de pagamento`} actions={addButton} noPadding>
      <div className="h-full overflow-y-auto">
      <div className="w-full p-4 md:p-6 space-y-5">

        {/* ── KPIs ───────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div data-tour="accounts-balance-card" className="hero-card relative overflow-hidden rounded-2xl p-5">
            <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full border border-white/10" />
            <p className="flex items-center gap-2 text-[13px] font-medium text-white/70">
              <Wallet size={15} strokeWidth={1.75} /> Saldo em contas
            </p>
            <p className="mt-4 text-[26px] leading-none font-semibold tracking-tight tabular-nums">{fmtCurrency(totals.balance)}</p>
            <p className="mt-3 text-[11px] text-white/60">
              {totals.accountsCount} conta{totals.accountsCount === 1 ? '' : 's'} · dinheiro, débito e PIX
            </p>
          </div>

          <div data-tour="accounts-limit-card" className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-fg-2">Limite disponível</p>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-fg-muted">
                <CreditCard size={15} strokeWidth={1.75} />
              </span>
            </div>
            <p className={cn('mt-3 text-[26px] leading-none font-semibold tracking-tight tabular-nums', totals.available < 0 ? 'text-danger' : 'text-fg')}>
              {fmtCurrency(totals.available)}
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-track">
              <div
                className={cn('h-full rounded-full transition-all duration-700', totals.usedPct > 90 ? 'bg-danger' : totals.usedPct > 70 ? 'bg-warning' : 'bg-primary')}
                style={{ width: `${totals.usedPct}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-fg-muted tabular-nums">{totals.usedPct.toFixed(0)}% de {fmtCurrency(totals.limit)} usado</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-fg-2">Faturas em aberto</p>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-fg-muted">
                <Receipt size={15} strokeWidth={1.75} />
              </span>
            </div>
            <p className="mt-3 text-[26px] leading-none font-semibold tracking-tight tabular-nums text-fg">{fmtCurrency(totals.used)}</p>
            <p className="mt-3 text-[11px] text-fg-muted">
              {counts.credit_card ?? 0} cartão{(counts.credit_card ?? 0) === 1 ? '' : 'ões'} de crédito
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-fg-2">Gasto no mês</p>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-fg-muted">
                <ShoppingBag size={15} strokeWidth={1.75} />
              </span>
            </div>
            <p className="mt-3 text-[26px] leading-none font-semibold tracking-tight tabular-nums text-fg">{fmtCurrency(totals.spent)}</p>
            <div className="mt-3 flex min-h-5 items-center gap-2">
              <Trend curr={totals.spent} prev={totals.prevSpent} />
              <span className="truncate text-[11px] text-fg-muted">
                {totals.topMethod ? `Mais usado: ${totals.topMethod.name}` : 'Sem gastos neste mês'}
              </span>
            </div>
          </div>
        </section>

        {/* ── Abas por tipo ──────────────────────────────────────── */}
        <div data-tour="accounts-filter-chips" className="border-b border-border">
          <div className="-mb-px flex overflow-x-auto scrollbar-none" role="tablist" aria-label="Tipos de conta">
            {(['all', ...TYPE_OPTIONS.map((t) => t.value)] as (PaymentType | 'all')[]).map((t) => {
              const Icon = TAB_ICONS[t];
              const active = filterType === t;
              const n = counts[t] ?? 0;
              return (
                <button
                  key={t}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilterType(t)}
                  className={cn(
                    'group flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors',
                    active ? 'border-primary text-fg' : 'border-transparent text-fg-muted hover:border-border-hover hover:text-fg',
                    !active && n === 0 && 'opacity-60',
                  )}
                >
                  <Icon size={15} strokeWidth={1.75} className={active ? 'text-accent' : 'text-fg-muted group-hover:text-fg-2'} />
                  {t === 'all' ? 'Todos' : TYPE_LABELS[t as PaymentType]}
                  <span className={cn(
                    'min-w-5 rounded-full px-1.5 py-px text-center text-[10px] font-semibold tabular-nums',
                    active ? 'bg-primary-soft text-accent' : 'bg-surface-2 text-fg-muted',
                  )}>{n}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Lista ──────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-accent" />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <Wallet size={32} strokeWidth={1.5} className="mx-auto mb-3 text-fg-disabled" />
            <p className="text-base font-semibold text-fg">Nenhuma forma de pagamento</p>
            <p className="mt-1 text-sm text-fg-muted">Cadastre cartões, contas e outras formas de pagamento.</p>
            <button onClick={openCreate} className="btn btn-primary mt-5">
              <Plus size={16} /> Criar agora
            </button>
          </div>
        )}

        {!loading && items.length > 0 && filterType === 'all' && SECTIONS.map((section) => {
          const list = items.filter((i) => section.types.includes(i.type));
          if (list.length === 0) return null;
          return (
            <section key={section.key} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-fg">{section.title}</h2>
                <span className="text-xs text-fg-muted">{list.length}</span>
              </div>
              {renderGrid(list)}
            </section>
          );
        })}

        {!loading && filterType !== 'all' && filtered.length > 0 && renderGrid(filtered)}

        {!loading && filterType !== 'all' && filtered.length === 0 && items.length > 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-[13px] font-medium text-fg">Nenhum {TYPE_LABELS[filterType as PaymentType].toLowerCase()} cadastrado</p>
            <button onClick={openCreate} className="btn btn-secondary mt-4"><Plus size={15} /> Nova conta</button>
          </div>
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
