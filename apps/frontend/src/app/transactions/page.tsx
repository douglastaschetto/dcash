'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import {
  Plus, Search, X, ArrowLeft,
  CreditCard, Calendar as CalendarIcon, CheckCheck,
  Pencil, Trash2, Filter,
  ArrowUpCircle, ArrowDownCircle, PiggyBank,
  Layers, Wallet, Hash, ArrowRightCircle, TrendingUp,
  Download, Users, Tag, CircleDot, Repeat,
} from '@/components/ui/icons';
import { EmptyState } from '@/components/ui';
import { MultiFilter, AmountFilter, PeriodFilter, Segmented, monthRange, type FilterOption } from './components/filters';
const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (iso: string) => { const d = parseDateOnly(iso); return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${String(d.getFullYear()).slice(-2)}`; };
const parseISO  = (s: string) => parseDateOnly(s);
const startOfDay = (d: Date) => { const r = new Date(d); r.setHours(0,0,0,0); return r; };
const endOfDay   = (d: Date) => { const r = new Date(d); r.setHours(23,59,59,999); return r; };
import Link from 'next/link';
import TransactionForm, { TransactionMode } from '@/components/forms/TransactionForm';
import { AppLayout } from '@/components/app-layout';
import { cn, parseDateOnly } from '@/lib/utils';

/* ── Types ───────────────────────────────────────────────────────── */
interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  isPaid: boolean;
  paymentMethod?: { id: string; name: string; type: string };
  category?: { name: string; id: string; color?: string };
  piggyBank?: { id: string; name: string } | null;
  piggyBankId?: string;
  fixedBillId?: string;
  totalInstallments?: number;
  installmentNumber?: number;
  installmentGroup?: string;
  familyGroupId?: string;
  userId?: string;
  paymentMethodType?: string;
}

interface PaymentMethod { id: string; name: string; type: string; }
interface Category      { id: string; name: string; type: string; color?: string; }
interface PiggyBank     { id: string; name: string; }
interface Member        { id: string; name: string; }

type Kind = 'ALL' | 'INCOME' | 'EXPENSE' | 'PIGGY';

const PM_TYPE_LABELS: Record<string, string> = {
  credit_card: 'Cartão de crédito', debit_card: 'Cartão de débito', cash: 'Dinheiro', pix: 'PIX',
  boleto: 'Boleto', financing: 'Financiamento', transfer: 'Transferência',
};
const pmTypeOf = (t: Transaction) => (t.paymentMethod?.type || t.paymentMethodType || '').toLowerCase();
const kindOf = (t: Transaction): Exclude<Kind, 'ALL'> => (t.piggyBankId ? 'PIGGY' : t.type);
const currentMonth = () => { const n = new Date(); return monthRange(n.getFullYear(), n.getMonth()); };

/* ── Summary card ────────────────────────────────────────────────── */
function SummaryCard({
  label, value, color,
}: { label: string; value: number; color: string }) {
  return (
    <div className={cn('rounded-2xl px-4 py-3.5 border', color)}>
      <p className="text-xs font-medium text-fg-2">{label}</p>
      <p className="text-xl font-semibold tracking-tight tabular-nums mt-1">
        {value < 0 ? '−' : ''}R$ {Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}

/* ── Main content ────────────────────────────────────────────────── */
function TransactionsContent() {
  const router = useRouter();

  const [transactions, setTransactions]   = useState<Transaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories]       = useState<Category[]>([]);
  const [piggyBanks, setPiggyBanks]       = useState<PiggyBank[]>([]);
  const [members, setMembers]             = useState<Member[]>([]);
  const [loading, setLoading]             = useState(true);

  /* ── modal ──────────────────── */
  const [activeModal, setActiveModal]         = useState<TransactionMode | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showOptions, setShowOptions]         = useState(false);

  /* ── selection ──────────────── */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  /* ── filters ────────────────── */
  /* Empty multi-select = "todos". Period defaults to the current month. */
  const [search, setSearch]               = useState('');
  const [startDate, setStartDate]         = useState(() => currentMonth().from);
  const [endDate, setEndDate]             = useState(() => currentMonth().to);
  const [kind, setKind]                   = useState<Kind>('ALL');
  const [userFilter, setUserFilter]       = useState<string[]>([]);
  const [pmFilter, setPmFilter]           = useState<string[]>([]);
  const [pmTypeFilter, setPmTypeFilter]   = useState<string[]>([]);
  const [catFilter, setCatFilter]         = useState<string[]>([]);
  const [piggyFilter, setPiggyFilter]     = useState<string[]>([]);
  const [statusFilter, setStatusFilter]   = useState<string[]>([]);
  const [fixedFilter, setFixedFilter]     = useState<string[]>([]);
  const [installFilter, setInstallFilter] = useState<string[]>([]);
  const [minAmount, setMinAmount]         = useState('');
  const [maxAmount, setMaxAmount]         = useState('');

  /* ── load ───────────────────── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [t, pm, cat, pb, fm] = await Promise.all([
        api.get('/transactions'),
        api.get('/payment-methods'),
        api.get('/categories'),
        api.get('/piggy-banks'),
        api.get('/family/members').catch(() => ({ data: null })),
      ]);
      setTransactions(t.data || []);
      setPaymentMethods(pm.data || []);
      setCategories(cat.data || []);
      setPiggyBanks(pb.data || []);
      setMembers(fm.data?.members || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── delete ─────────────────── */
  const handleDelete = async (id: string, description: string) => {
    if (!confirm(`Excluir [${description}]?`)) return;
    try {
      await api.delete(`/transactions/${id}`);
      fetchData();
    } catch { alert('Falha na exclusão.'); }
  };

  /* ── edit ───────────────────── */
  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t);
    if (t.piggyBankId) setActiveModal('PIGGY');
    else setActiveModal(t.type as TransactionMode);
  };

  /* ── export CSV ─────────────── */
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('dcash:token');
      const res = await fetch(`${base}/transactions/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Falha ao exportar.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dcash-transacoes-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao exportar.');
    } finally {
      setExporting(false);
    }
  };

  /* ── mark paid ──────────────── */
  const markPaid = async (ids: string[]) => {
    try {
      await api.patch('/transactions/mark-paid', { ids });
      fetchData();
      setSelectedIds([]);
    } catch { alert('Falha ao marcar como pago.'); }
  };

  /* ── filter ─────────────────── */
  const min = minAmount ? Number(minAmount) : null;
  const max = maxAmount ? Number(maxAmount) : null;

  /** Transactions inside the selected period (base for the counts shown in each filter). */
  const inPeriod = useMemo(() => {
    const from = startDate ? startOfDay(parseISO(startDate)) : null;
    const to   = endDate   ? endOfDay(parseISO(endDate))     : null;
    return transactions.filter((t) => {
      const d = parseDateOnly(t.date);
      return (!from || d >= from) && (!to || d <= to);
    });
  }, [transactions, startDate, endDate]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inPeriod.filter((t) => {
      if (q && !`${t.description} ${t.category?.name ?? ''} ${t.paymentMethod?.name ?? ''}`.toLowerCase().includes(q)) return false;
      if (kind !== 'ALL' && kindOf(t) !== kind) return false;
      if (userFilter.length    && !userFilter.includes(t.userId ?? '')) return false;
      if (pmFilter.length      && !pmFilter.includes(t.paymentMethod?.id ?? 'NONE')) return false;
      if (pmTypeFilter.length  && !pmTypeFilter.includes(pmTypeOf(t) || 'NONE')) return false;
      if (catFilter.length     && !catFilter.includes(t.category?.id ?? 'NONE')) return false;
      if (piggyFilter.length   && !piggyFilter.includes(t.piggyBankId ? (t.piggyBank?.id ?? t.piggyBankId) : 'NONE')) return false;
      if (statusFilter.length  && !statusFilter.includes(t.isPaid ? 'PAID' : 'PENDING')) return false;
      if (fixedFilter.length   && !fixedFilter.includes(t.fixedBillId ? 'FIXED' : 'VARIABLE')) return false;
      if (installFilter.length && !installFilter.includes((t.totalInstallments ?? 1) > 1 ? 'INSTALLMENTS' : 'SINGLE')) return false;
      if (min !== null && Number(t.amount) < min) return false;
      if (max !== null && Number(t.amount) > max) return false;
      return true;
    });
  }, [inPeriod, search, kind, userFilter, pmFilter, pmTypeFilter, catFilter, piggyFilter, statusFilter, fixedFilter, installFilter, min, max]);

  /* ── filter options, each with its count inside the period ── */
  const countBy = (key: (t: Transaction) => string) => {
    const m: Record<string, number> = {};
    inPeriod.forEach((t) => { const k = key(t); m[k] = (m[k] || 0) + 1; });
    return m;
  };
  const withCounts = (opts: FilterOption[], counts: Record<string, number>) =>
    opts.map((o) => ({ ...o, hint: counts[o.value] ? String(counts[o.value]) : undefined }));

  const userIds = Array.from(new Set(transactions.map((t) => t.userId).filter(Boolean))) as string[];
  const nameOfUser = (id?: string) => (id ? members.find((m) => m.id === id)?.name ?? 'Usuário' : undefined);
  const userOptions = withCounts(userIds.map((id) => ({ value: id, label: nameOfUser(id)! })), countBy((t) => t.userId ?? ''));

  const pmTypes = Array.from(new Set([...paymentMethods.map((p) => p.type?.toLowerCase()), ...transactions.map(pmTypeOf)].filter(Boolean)));
  const pmTypeOptions = withCounts(pmTypes.map((v) => ({ value: v, label: PM_TYPE_LABELS[v] ?? v })), countBy((t) => pmTypeOf(t) || 'NONE'));

  const pmOptions = withCounts(
    [...paymentMethods.map((p) => ({ value: p.id, label: p.name || 'Sem nome' })), { value: 'NONE', label: 'Sem forma de pagamento' }],
    countBy((t) => t.paymentMethod?.id ?? 'NONE'),
  );
  const catOptions = withCounts(
    [...categories.map((c) => ({ value: c.id, label: c.name, color: c.color })), { value: 'NONE', label: 'Sem categoria' }],
    countBy((t) => t.category?.id ?? 'NONE'),
  );
  const piggyOptions = withCounts(
    [...piggyBanks.map((p) => ({ value: p.id, label: p.name || 'Cofrinho' })), { value: 'NONE', label: 'Sem cofrinho' }],
    countBy((t) => (t.piggyBankId ? (t.piggyBank?.id ?? t.piggyBankId) : 'NONE')),
  );
  const statusOptions  = withCounts([{ value: 'PAID', label: 'Pago' }, { value: 'PENDING', label: 'Pendente' }], countBy((t) => (t.isPaid ? 'PAID' : 'PENDING')));
  const fixedOptions   = withCounts([{ value: 'FIXED', label: 'Conta fixa' }, { value: 'VARIABLE', label: 'Variável' }], countBy((t) => (t.fixedBillId ? 'FIXED' : 'VARIABLE')));
  const installOptions = withCounts([{ value: 'INSTALLMENTS', label: 'Parcelado' }, { value: 'SINGLE', label: 'À vista' }], countBy((t) => ((t.totalInstallments ?? 1) > 1 ? 'INSTALLMENTS' : 'SINGLE')));

  /* ── active filter chips (everything except the period, which has its own control) ── */
  const labelsOf = (vals: string[], opts: FilterOption[]) => vals.map((v) => opts.find((o) => o.value === v)?.label ?? v).join(', ');
  const kindLabel = { INCOME: 'Receitas', EXPENSE: 'Despesas', PIGGY: 'Investimentos' } as const;
  const activeChips = ([
    search              && { key: 'search',  label: `Busca: "${search}"`, clear: () => setSearch('') },
    kind !== 'ALL'      && { key: 'kind',    label: `Tipo: ${kindLabel[kind as keyof typeof kindLabel]}`, clear: () => setKind('ALL') },
    userFilter.length   && { key: 'user',    label: `Usuário: ${labelsOf(userFilter, userOptions)}`, clear: () => setUserFilter([]) },
    pmFilter.length     && { key: 'pm',      label: `Forma: ${labelsOf(pmFilter, pmOptions)}`, clear: () => setPmFilter([]) },
    pmTypeFilter.length && { key: 'pmType',  label: `Tipo de pagamento: ${labelsOf(pmTypeFilter, pmTypeOptions)}`, clear: () => setPmTypeFilter([]) },
    catFilter.length    && { key: 'cat',     label: `Categoria: ${labelsOf(catFilter, catOptions)}`, clear: () => setCatFilter([]) },
    statusFilter.length && { key: 'status',  label: `Status: ${labelsOf(statusFilter, statusOptions)}`, clear: () => setStatusFilter([]) },
    fixedFilter.length  && { key: 'fixed',   label: `Recorrência: ${labelsOf(fixedFilter, fixedOptions)}`, clear: () => setFixedFilter([]) },
    installFilter.length && { key: 'install', label: `Parcelamento: ${labelsOf(installFilter, installOptions)}`, clear: () => setInstallFilter([]) },
    piggyFilter.length  && { key: 'piggy',   label: `Cofrinho: ${labelsOf(piggyFilter, piggyOptions)}`, clear: () => setPiggyFilter([]) },
    (minAmount || maxAmount) && {
      key: 'amount',
      label: `Valor: ${[minAmount && `≥ R$ ${minAmount}`, maxAmount && `≤ R$ ${maxAmount}`].filter(Boolean).join(' e ')}`,
      clear: () => { setMinAmount(''); setMaxAmount(''); },
    },
  ].filter(Boolean)) as { key: string; label: string; clear: () => void }[];

  const showUserColumn = userOptions.length > 1;

  /* ── summary ────────────────── */
  const summary = useMemo(() => {
    const income  = filtered.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [filtered]);

  /* ── selection helpers ──────── */
  const toggle  = (id: string) => setSelectedIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const selAll  = () => setSelectedIds(filtered.map((t) => t.id));
  const clrSel  = () => setSelectedIds([]);

  /* ── clear filters (keeps the period; "Voltar ao padrão" also resets it to this month) ── */
  const clearFilters = (resetPeriod = false) => {
    setSearch(''); setKind('ALL');
    setUserFilter([]); setPmFilter([]); setPmTypeFilter([]); setCatFilter([]);
    setPiggyFilter([]); setStatusFilter([]); setFixedFilter([]); setInstallFilter([]);
    setMinAmount(''); setMaxAmount('');
    if (resetPeriod) { const m = currentMonth(); setStartDate(m.from); setEndDate(m.to); }
  };

  /* ── header title + actions (rendered in AppLayout's top bar) ── */
  const pageTitle = (
    <span className="inline-flex items-center gap-3">
      <Link href="/calendar" className="p-2 bg-surface-2 dark:bg-white/5 hover:bg-primary hover:text-on-primary rounded-xl transition-all">
        <ArrowLeft size={18} />
      </Link>
      <span className="tracking-tight">
        Extrato detalhado
      </span>
    </span>
  );

  const headerActions = (
    <div className="flex items-center gap-3">
      <button
        onClick={handleExport}
        disabled={exporting}
        title="Exportar CSV"
        aria-label="Exportar transações em CSV"
        className="btn btn-secondary btn-square"
      >
        <Download size={16} strokeWidth={1.75} />
      </button>

      {/* Create dropdown */}
      <div className="relative">
        <button
          data-tour="transactions-lancar-btn"
          onClick={() => setShowOptions(!showOptions)}
          className="btn btn-primary"
        >
          <Plus size={15} /> Lançar
        </button>

        {showOptions && (
          <>
            <div className="fixed inset-0 z-[105]" onClick={() => setShowOptions(false)} />
            <div className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-2xl shadow-2xl z-[110] overflow-hidden text-fg">
              {([
                { mode: 'INCOME',  icon: ArrowUpCircle,   label: 'Nova Receita',    color: 'text-accent', bg: 'bg-primary-soft' },
                { mode: 'EXPENSE', icon: ArrowDownCircle, label: 'Nova Despesa',     color: 'text-danger',     bg: 'bg-danger-soft' },
                { mode: 'PIGGY',   icon: PiggyBank,       label: 'Investimento',     color: 'text-info',    bg: 'bg-info-soft' },
              ] as const).map(({ mode, icon: Icon, label, color, bg }) => (
                <button
                  key={mode}
                  onClick={() => { setActiveModal(mode); setEditingTransaction(null); setShowOptions(false); }}
                  className="w-full p-4 flex items-center gap-3 hover:bg-hover dark:hover:bg-white/5 border-b border-border last:border-none transition"
                >
                  <div className={cn('p-2 rounded-lg', bg, color)}><Icon size={16} /></div>
                  <span className="text-[11px] font-semibold tracking-tight">{label}</span>
                </button>
              ))}
              <button
                onClick={() => { router.push('/payments/import-ofx'); setShowOptions(false); }}
                className="w-full p-4 flex items-center gap-3 hover:bg-hover dark:hover:bg-white/5 transition"
              >
                <div className="p-2 rounded-lg bg-warning-soft text-warning"><ArrowRightCircle size={16} /></div>
                <span className="text-[11px] font-semibold tracking-tight">Importar OFX</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  /* ── render ─────────────────── */
  return (
    <AppLayout noPadding title={pageTitle} subtitle={`${filtered.length} movimentações`} actions={headerActions}>
    <div className="h-full bg-background flex flex-col overflow-hidden">

      {/* Summary strip */}
      <div className="px-4 md:px-6 pt-4 pb-3 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
        <SummaryCard label="Receitas"  value={summary.income}  color="border-border bg-card text-accent" />
        <SummaryCard label="Despesas"  value={summary.expense} color="border-border bg-card text-danger" />
        <SummaryCard label="Saldo"     value={summary.balance} color={cn('border-border bg-card', summary.balance >= 0 ? 'text-fg' : 'text-danger')} />
      </div>

      {/* Filters */}
      <div className="mx-4 md:mx-6 mb-3 rounded-2xl border border-border bg-card shrink-0">
        <div className="flex flex-wrap items-center gap-2 p-3">
          <PeriodFilter from={startDate} to={endDate} onChange={(f, t) => { setStartDate(f); setEndDate(t); }} />

          <div className="relative min-w-[12rem] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar descrição, categoria ou forma..."
              className="field !h-8 !pl-9 !pr-8 !text-[13px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Limpar busca"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-fg-muted hover:text-fg">
                <X size={14} />
              </button>
            )}
          </div>

          <Segmented<Kind>
            value={kind}
            onChange={setKind}
            options={[
              { value: 'ALL', label: 'Todos' },
              { value: 'INCOME', label: 'Receitas' },
              { value: 'EXPENSE', label: 'Despesas' },
              { value: 'PIGGY', label: 'Investimentos' },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2.5">
          <span className="mr-1 flex items-center gap-1.5 text-xs font-medium text-fg-muted">
            <Filter size={13} strokeWidth={1.75} /> Filtrar por
          </span>
          {userOptions.length > 1 && (
            <MultiFilter label="Usuário" icon={Users} options={userOptions} selected={userFilter} onChange={setUserFilter} />
          )}
          <MultiFilter label="Forma de pagamento" icon={Wallet} options={pmOptions} selected={pmFilter} onChange={setPmFilter} />
          {pmTypeOptions.length > 0 && (
            <MultiFilter label="Tipo de pagamento" icon={CreditCard} options={pmTypeOptions} selected={pmTypeFilter} onChange={setPmTypeFilter} />
          )}
          <MultiFilter label="Categoria" icon={Tag} options={catOptions} selected={catFilter} onChange={setCatFilter} />
          <MultiFilter label="Status" icon={CircleDot} options={statusOptions} selected={statusFilter} onChange={setStatusFilter} />
          <MultiFilter label="Recorrência" icon={Repeat} options={fixedOptions} selected={fixedFilter} onChange={setFixedFilter} />
          <MultiFilter label="Parcelamento" icon={Layers} options={installOptions} selected={installFilter} onChange={setInstallFilter} />
          {piggyBanks.length > 0 && (
            <MultiFilter label="Cofrinho" icon={PiggyBank} options={piggyOptions} selected={piggyFilter} onChange={setPiggyFilter} />
          )}
          <AmountFilter min={minAmount} max={maxAmount} onChange={(lo, hi) => { setMinAmount(lo); setMaxAmount(hi); }} />
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-3 py-2.5">
            {activeChips.map((c) => (
              <span key={c.key} className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-surface-2 py-0.5 pl-2 pr-1 text-xs text-fg-2">
                <span className="truncate">{c.label}</span>
                <button onClick={c.clear} aria-label={`Remover filtro ${c.label}`} className="rounded p-0.5 text-fg-muted hover:bg-hover hover:text-fg">
                  <X size={12} />
                </button>
              </span>
            ))}
            <button onClick={() => clearFilters()} className="ml-1 text-xs font-medium text-accent hover:underline underline-offset-2">
              Limpar filtros
            </button>
            <button onClick={() => clearFilters(true)} className="text-xs font-medium text-fg-muted hover:text-fg">
              Voltar ao padrão
            </button>
          </div>
        )}
      </div>

      {/* Batch toolbar */}
      {selectedIds.length > 0 && (
        <div className="mx-4 md:mx-6 mb-3 rounded-xl px-4 py-2 bg-primary-soft border border-primary-border flex items-center justify-between gap-4 shrink-0">
          <span className="text-xs font-semibold text-accent">{selectedIds.length} selecionadas</span>
          <div className="flex gap-2">
            <button onClick={clrSel} className="px-3 py-1.5 rounded-lg bg-card dark:bg-surface-2 text-xs font-semibold border border-border">Limpar</button>
            <button onClick={() => markPaid(selectedIds)} className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold flex items-center gap-1.5">
              <CheckCheck size={13} /> Marcar como pago
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto px-4 md:px-6 pb-6">
          {loading ? (
            <div className="py-32 flex flex-col items-center text-fg-muted">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-xs font-semibold">Carregando...</p>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Nenhum registro encontrado"
              description={transactions.length > 0 ? 'Nada neste período com os filtros atuais. Ajuste as datas ou remova filtros.' : undefined}
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[840px] text-left text-[13px]">
              <thead className="sticky top-0 z-10 bg-surface-2">
                <tr className="text-xs font-medium text-fg-muted border-b border-border">
                  <th className="px-3 py-2 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filtered.length}
                      onChange={(e) => e.target.checked ? selAll() : clrSel()}
                    />
                  </th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Descrição</th>
                  <th className="px-3 py-2">Categoria</th>
                  <th className="px-3 py-2">Pagamento</th>
                  {showUserColumn && <th className="px-3 py-2">Usuário</th>}
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-3 py-2 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    className="group hover:bg-hover transition-colors"
                  >
                    <td className="px-3 py-2.5 pl-4">
                      <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggle(t.id)} />
                    </td>
                    <td className="px-3 py-2.5 text-fg-2 tabular-nums whitespace-nowrap">
                      {fmtDate(t.date)}
                    </td>
                    <td className="px-3 py-2.5 max-w-xs">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-fg truncate">
                            {t.description}
                          </span>
                          {t.fixedBillId && <CalendarIcon size={10} className="text-accent shrink-0" />}
                          {t.type === 'EXPENSE' && (t.totalInstallments ?? 1) > 1 && <Layers size={10} className="text-warning shrink-0" />}
                          {t.piggyBankId && <PiggyBank size={10} className="text-info shrink-0" />}
                        </div>
                        {t.type === 'EXPENSE' && (t.totalInstallments ?? 1) > 1 && (
                          <span className="text-[11px] text-warning font-semibold">
                            {t.installmentNumber}/{t.totalInstallments}x
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-fg-2">
                        {t.category?.name || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 border border-border rounded-md">
                          {t.piggyBankId
                            ? <PiggyBank size={12} className="text-info" />
                            : <CreditCard size={12} className="text-fg-muted" />}
                        </div>
                        <span className="text-fg-2 truncate max-w-[7rem]">
                          {t.paymentMethod?.name || (t.piggyBankId ? t.piggyBank?.name || 'Cofrinho' : '—')}
                        </span>
                      </div>
                    </td>
                    {showUserColumn && (
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-fg-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-soft text-[10px] font-semibold text-accent">
                            {(nameOfUser(t.userId) ?? '?').charAt(0).toUpperCase()}
                          </span>
                          <span className="truncate max-w-[6rem]">{nameOfUser(t.userId)?.split(' ')[0] ?? '—'}</span>
                        </span>
                      </td>
                    )}
                    <td className={cn(
                      'px-3 py-2.5 text-right font-semibold tabular-nums whitespace-nowrap',
                      t.type === 'INCOME' ? 'text-accent' : 'text-fg',
                    )}>
                      {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border',
                        t.isPaid
                          ? 'bg-primary-soft text-accent border-primary-border'
                          : 'bg-warning-soft text-warning border-warning/30',
                      )}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />{t.isPaid ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 pr-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEdit(t)}
                          className="p-1.5 text-fg-muted hover:text-fg hover:bg-hover rounded-md transition-colors"
                        >
                          <Pencil size={14} strokeWidth={1.75} />
                        </button>
                        {!t.isPaid && (
                          <button
                            onClick={() => markPaid([t.id])}
                            className="p-1.5 text-accent hover:bg-primary-soft rounded-md transition-colors"
                            title="Marcar como pago"
                          >
                            <CheckCheck size={14} strokeWidth={1.75} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(t.id, t.description)}
                          className="p-1.5 text-fg-muted hover:text-danger hover:bg-danger-soft rounded-md transition-colors"
                        >
                          <Trash2 size={14} strokeWidth={1.75} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </main>

      {/* Transaction modal */}
      {activeModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => { setActiveModal(null); setEditingTransaction(null); }} />
          <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl p-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => { setActiveModal(null); setEditingTransaction(null); }}
              className="absolute top-3.5 right-3.5 p-2 text-fg-muted hover:text-danger hover:bg-danger-soft rounded-xl transition"
            >
              <X size={18} />
            </button>
            <h2 className="text-lg font-semibold mb-3 tracking-tight">
              {editingTransaction ? 'Editar' : 'Nova'}{' '}
              <span className={cn(
                activeModal === 'EXPENSE' ? 'text-danger' :
                activeModal === 'INCOME'  ? 'text-accent' : 'text-info',
              )}>
                {activeModal === 'EXPENSE' ? 'Despesa' :
                 activeModal === 'INCOME'  ? 'Receita' :
                 activeModal === 'PIGGY'   ? 'Investimento' : 'Reserva'}
              </span>
            </h2>
            <TransactionForm
              mode={activeModal}
              initialData={editingTransaction || undefined}
              onSuccess={() => { setActiveModal(null); setEditingTransaction(null); fetchData(); }}
            />
          </div>
        </div>
      )}
    </div>
    </AppLayout>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={
      <div className="h-full bg-background flex items-center justify-center text-[11px] font-semibold text-fg-2">
        Carregando...
      </div>
    }>
      <TransactionsContent />
    </Suspense>
  );
}
