'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import {
  Plus, Search, X, ArrowLeft,
  CreditCard, Calendar as CalendarIcon, CheckCheck,
  Pencil, Trash2, Filter, AlertCircle,
  ArrowUpCircle, ArrowDownCircle, PiggyBank,
  Layers, Wallet, Hash, ArrowRightCircle, TrendingUp,
} from 'lucide-react';
const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (iso: string) => { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${String(d.getFullYear()).slice(-2)}`; };
const parseISO  = (s: string) => new Date(s);
const startOfDay = (d: Date) => { const r = new Date(d); r.setHours(0,0,0,0); return r; };
const endOfDay   = (d: Date) => { const r = new Date(d); r.setHours(23,59,59,999); return r; };
import Link from 'next/link';
import TransactionForm, { TransactionMode } from '@/components/forms/TransactionForm';
import { AppLayout } from '@/components/app-layout';
import { cn } from '@/lib/utils';

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
}

interface PaymentMethod { id: string; name: string; type: string; }
interface Category      { id: string; name: string; type: string; }
interface PiggyBank     { id: string; name: string; }

/* ── Summary card ────────────────────────────────────────────────── */
function SummaryCard({
  label, value, color,
}: { label: string; value: number; color: string }) {
  return (
    <div className={cn('rounded-xl p-3 border', color)}>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{label}</p>
      <p className="text-base font-black mt-0.5">
        R$ {Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
  const [loading, setLoading]             = useState(true);
  const [showFilters, setShowFilters]     = useState(false);

  /* ── modal ──────────────────── */
  const [activeModal, setActiveModal]         = useState<TransactionMode | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showOptions, setShowOptions]         = useState(false);

  /* ── selection ──────────────── */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  /* ── filters ────────────────── */
  const [search, setSearch]               = useState('');
  const [startDate, setStartDate]         = useState('');
  const [endDate, setEndDate]             = useState('');
  const [typeFilter, setTypeFilter]       = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [pmFilter, setPmFilter]           = useState('ALL');
  const [catFilter, setCatFilter]         = useState('ALL');
  const [piggyFilter, setPiggyFilter]     = useState('ALL');
  const [fixedFilter, setFixedFilter]     = useState('ALL');
  const [installFilter, setInstallFilter] = useState('ALL');

  /* ── load ───────────────────── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [t, pm, cat, pb] = await Promise.all([
        api.get('/transactions'),
        api.get('/payment-methods'),
        api.get('/categories'),
        api.get('/piggy-banks'),
      ]);
      setTransactions(t.data || []);
      setPaymentMethods(pm.data || []);
      setCategories(cat.data || []);
      setPiggyBanks(pb.data || []);
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

  /* ── mark paid ──────────────── */
  const markPaid = async (ids: string[]) => {
    try {
      await api.patch('/transactions/mark-paid', { ids });
      fetchData();
      setSelectedIds([]);
    } catch { alert('Falha ao marcar como pago.'); }
  };

  /* ── filter ─────────────────── */
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
      if (startDate && d < startOfDay(parseISO(startDate))) return false;
      if (endDate   && d > endOfDay(parseISO(endDate)))     return false;
      if (pmFilter  !== 'ALL' && t.paymentMethod?.id !== pmFilter) return false;
      if (catFilter !== 'ALL' && t.category?.id !== catFilter) return false;
      if (piggyFilter !== 'ALL') {
        if (piggyFilter === 'NONE' && t.piggyBankId) return false;
        if (piggyFilter !== 'NONE' && t.piggyBank?.id !== piggyFilter) return false;
      }
      if (fixedFilter === 'FIXED'    && !t.fixedBillId) return false;
      if (fixedFilter === 'VARIABLE' && t.fixedBillId)  return false;
      if (installFilter === 'INSTALLMENTS' && (t.totalInstallments ?? 1) <= 1) return false;
      if (installFilter === 'SINGLE'       && (t.totalInstallments ?? 1) > 1)  return false;
      return true;
    });
  }, [transactions, search, typeFilter, startDate, endDate, pmFilter, catFilter, piggyFilter, fixedFilter, installFilter]);

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

  /* ── clear filters ──────────── */
  const clearFilters = () => {
    setSearch(''); setStartDate(''); setEndDate('');
    setTypeFilter('ALL'); setPmFilter('ALL'); setCatFilter('ALL');
    setPiggyFilter('ALL'); setFixedFilter('ALL'); setInstallFilter('ALL');
  };

  /* ── header title + actions (rendered in AppLayout's top bar) ── */
  const pageTitle = (
    <span className="inline-flex items-center gap-3">
      <Link href="/calendar" className="p-2 bg-zinc-50 dark:bg-white/5 hover:bg-emerald-500 hover:text-white rounded-xl transition-all">
        <ArrowLeft size={18} />
      </Link>
      <span className="uppercase italic tracking-tighter">
        Extrato <span className="text-emerald-600">Detalhado</span>
      </span>
    </span>
  );

  const headerActions = (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setShowFilters((v) => !v)}
        className={cn(
          'p-3.5 rounded-2xl border transition-all',
          showFilters
            ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
            : 'bg-white dark:bg-zinc-800 border-zinc-400 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:border-emerald-500 hover:text-emerald-600',
        )}
      >
        <Filter size={18} />
      </button>

      {/* Create dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3.5 rounded-2xl font-black uppercase italic text-[10px] tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/30"
        >
          <Plus size={16} strokeWidth={3} /> Lançar
        </button>

        {showOptions && (
          <>
            <div className="fixed inset-0 z-[105]" onClick={() => setShowOptions(false)} />
            <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-[2rem] shadow-2xl z-[110] overflow-hidden text-zinc-900 dark:text-zinc-100">
              {([
                { mode: 'INCOME',  icon: ArrowUpCircle,   label: 'Nova Receita',    color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { mode: 'EXPENSE', icon: ArrowDownCircle, label: 'Nova Despesa',     color: 'text-red-500',     bg: 'bg-red-500/10' },
                { mode: 'PIGGY',   icon: PiggyBank,       label: 'Investimento',     color: 'text-blue-500',    bg: 'bg-blue-500/10' },
              ] as const).map(({ mode, icon: Icon, label, color, bg }) => (
                <button
                  key={mode}
                  onClick={() => { setActiveModal(mode); setEditingTransaction(null); setShowOptions(false); }}
                  className="w-full p-4 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-white/5 border-b border-zinc-100 dark:border-white/5 last:border-none transition"
                >
                  <div className={cn('p-2 rounded-lg', bg, color)}><Icon size={16} /></div>
                  <span className="text-[10px] font-black uppercase tracking-tight">{label}</span>
                </button>
              ))}
              <button
                onClick={() => { router.push('/payments/import'); setShowOptions(false); }}
                className="w-full p-4 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-white/5 transition"
              >
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500"><ArrowRightCircle size={16} /></div>
                <span className="text-[10px] font-black uppercase tracking-tight">Importar OFX</span>
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
    <div className="h-full bg-white dark:bg-[#050505] flex flex-col overflow-hidden">

      {/* Summary strip */}
      <div className="px-6 lg:px-12 py-2.5 grid grid-cols-3 gap-2.5 shrink-0">
        <SummaryCard label="Receitas"  value={summary.income}  color="border-emerald-500/20 bg-emerald-500/5 text-emerald-600" />
        <SummaryCard label="Despesas"  value={summary.expense} color="border-red-500/20 bg-red-500/5 text-red-500" />
        <SummaryCard label="Saldo"     value={summary.balance} color={cn('border-zinc-200 dark:border-zinc-700', summary.balance >= 0 ? 'text-zinc-900 dark:text-zinc-100' : 'text-red-500')} />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-6 lg:px-12 py-3 bg-zinc-100 dark:bg-white/[0.02] border-b border-zinc-300 dark:border-white/5 shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">

            {/* Search */}
            <div className="relative col-span-2 md:col-span-2 lg:col-span-2">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text" placeholder="Buscar por descrição..."
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-400 dark:border-zinc-700 rounded-lg py-2 pl-9 pr-3 text-xs font-medium outline-none focus:ring-2 ring-emerald-500/30 text-zinc-900 dark:text-zinc-100"
                value={search} onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Date range */}
            <input type="date" className="bg-white dark:bg-zinc-950 border border-zinc-400 dark:border-zinc-700 rounded-lg py-2 px-2.5 text-xs text-zinc-700 dark:text-zinc-200 outline-none focus:ring-2 ring-emerald-500/30" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <input type="date" className="bg-white dark:bg-zinc-950 border border-zinc-400 dark:border-zinc-700 rounded-lg py-2 px-2.5 text-xs text-zinc-700 dark:text-zinc-200 outline-none focus:ring-2 ring-emerald-500/30" value={endDate}   onChange={(e) => setEndDate(e.target.value)} />

            {/* Type */}
            <select className="bg-white dark:bg-zinc-950 border border-zinc-400 dark:border-zinc-700 rounded-lg py-2 px-2.5 text-xs font-bold text-zinc-800 dark:text-zinc-200" value={typeFilter} onChange={(e: any) => setTypeFilter(e.target.value)}>
              <option value="ALL">Todos os tipos</option>
              <option value="INCOME">Receitas</option>
              <option value="EXPENSE">Despesas</option>
            </select>

            {/* Payment method */}
            <select className="bg-white dark:bg-zinc-950 border border-zinc-400 dark:border-zinc-700 rounded-lg py-2 px-2.5 text-xs font-bold text-zinc-800 dark:text-zinc-200" value={pmFilter} onChange={(e) => setPmFilter(e.target.value)}>
              <option value="ALL">Forma de pagamento</option>
              {paymentMethods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            {/* Category */}
            <select className="bg-white dark:bg-zinc-950 border border-zinc-400 dark:border-zinc-700 rounded-lg py-2 px-2.5 text-xs font-bold text-zinc-800 dark:text-zinc-200" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="ALL">Categoria</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {/* Piggy bank */}
            <select className="bg-white dark:bg-zinc-950 border border-zinc-400 dark:border-zinc-700 rounded-lg py-2 px-2.5 text-xs font-bold text-zinc-800 dark:text-zinc-200" value={piggyFilter} onChange={(e) => setPiggyFilter(e.target.value)}>
              <option value="ALL">Cofrinho</option>
              <option value="NONE">Sem cofrinho</option>
              {piggyBanks.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            {/* Fixed / variable */}
            <select className="bg-white dark:bg-zinc-950 border border-zinc-400 dark:border-zinc-700 rounded-lg py-2 px-2.5 text-xs font-bold text-zinc-800 dark:text-zinc-200" value={fixedFilter} onChange={(e) => setFixedFilter(e.target.value)}>
              <option value="ALL">Fixas e variáveis</option>
              <option value="FIXED">Apenas fixas</option>
              <option value="VARIABLE">Apenas variáveis</option>
            </select>

            {/* Installments */}
            <select className="bg-white dark:bg-zinc-950 border border-zinc-400 dark:border-zinc-700 rounded-lg py-2 px-2.5 text-xs font-bold text-zinc-800 dark:text-zinc-200" value={installFilter} onChange={(e) => setInstallFilter(e.target.value)}>
              <option value="ALL">Parcelamento</option>
              <option value="INSTALLMENTS">Parcelados</option>
              <option value="SINGLE">À vista</option>
            </select>

            {/* Clear */}
            <button onClick={clearFilters} className="bg-zinc-300 dark:bg-white/5 hover:bg-red-500 hover:text-white transition-all rounded-lg text-xs font-black uppercase py-2 text-zinc-700 dark:text-zinc-300 border border-zinc-400 dark:border-zinc-600">
              Limpar filtros
            </button>
          </div>
        </div>
      )}

      {/* Batch toolbar */}
      {selectedIds.length > 0 && (
        <div className="px-6 lg:px-12 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800/30 flex items-center justify-between gap-4 shrink-0">
          <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">{selectedIds.length} selecionadas</span>
          <div className="flex gap-2">
            <button onClick={clrSel} className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 text-xs font-black border border-zinc-200 dark:border-zinc-700">Limpar</button>
            <button onClick={() => markPaid(selectedIds)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center gap-1.5">
              <CheckCheck size={13} /> Marcar como pago
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto px-6 lg:px-12 py-3">
          {loading ? (
            <div className="py-32 flex flex-col items-center text-zinc-400">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-xs font-black uppercase tracking-widest">Carregando...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-32 flex flex-col items-center text-zinc-300 dark:text-zinc-700">
              <AlertCircle size={56} strokeWidth={1} className="mb-5 opacity-30" />
              <p className="text-xs font-black uppercase tracking-widest">Nenhum registro encontrado</p>
            </div>
          ) : (
            <table className="w-full text-left border-separate border-spacing-y-1.5">
              <thead className="sticky top-0 z-10 bg-white/90 dark:bg-[#050505]/90 backdrop-blur-md">
                <tr className="text-[9px] font-black uppercase text-zinc-400 italic tracking-widest">
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
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-3 py-2 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    className="group bg-white dark:bg-zinc-900/40 border border-zinc-100 dark:border-white/5 rounded-xl hover:shadow-lg hover:shadow-emerald-500/5 transition-all"
                  >
                    <td className="px-3 py-2.5 first:rounded-l-xl">
                      <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggle(t.id)} />
                    </td>
                    <td className="px-3 py-2.5 text-[10px] font-bold text-zinc-400 italic whitespace-nowrap">
                      {fmtDate(t.date)}
                    </td>
                    <td className="px-3 py-2.5 max-w-xs">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-500 transition-colors truncate">
                            {t.description}
                          </span>
                          {t.fixedBillId && <CalendarIcon size={10} className="text-emerald-500 shrink-0" />}
                          {t.type === 'EXPENSE' && (t.totalInstallments ?? 1) > 1 && <Layers size={10} className="text-orange-500 shrink-0" />}
                          {t.piggyBankId && <PiggyBank size={10} className="text-blue-500 shrink-0" />}
                        </div>
                        {t.type === 'EXPENSE' && (t.totalInstallments ?? 1) > 1 && (
                          <span className="text-[9px] text-orange-400 font-bold">
                            {t.installmentNumber}/{t.totalInstallments}x
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">
                        {t.category?.name || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-zinc-100 dark:bg-white/5 rounded-lg">
                          {t.piggyBankId
                            ? <PiggyBank size={12} className="text-blue-500" />
                            : <CreditCard size={12} className="text-zinc-400" />}
                        </div>
                        <span className="text-[9px] font-black text-zinc-400 uppercase truncate max-w-[6rem]">
                          {t.paymentMethod?.name || (t.piggyBankId ? t.piggyBank?.name || 'Cofrinho' : '—')}
                        </span>
                      </div>
                    </td>
                    <td className={cn(
                      'px-3 py-2.5 text-right font-black text-sm italic whitespace-nowrap',
                      t.type === 'INCOME' ? 'text-emerald-500' : 'text-zinc-900 dark:text-zinc-100',
                    )}>
                      {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn(
                        'px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border',
                        t.isPaid
                          ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20'
                          : 'bg-red-500/5 text-red-500 border-red-500/20',
                      )}>
                        {t.isPaid ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 last:rounded-r-xl">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEdit(t)}
                          className="p-1.5 bg-zinc-50 dark:bg-white/5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                        >
                          <Pencil size={12} />
                        </button>
                        {!t.isPaid && (
                          <button
                            onClick={() => markPaid([t.id])}
                            className="p-1.5 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg transition-all"
                            title="Marcar como pago"
                          >
                            <CheckCheck size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(t.id, t.description)}
                          className="p-1.5 bg-zinc-50 dark:bg-white/5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Transaction modal */}
      {activeModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => { setActiveModal(null); setEditingTransaction(null); }} />
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0f0f0f] border border-zinc-200 dark:border-white/5 rounded-[2rem] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => { setActiveModal(null); setEditingTransaction(null); }}
              className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition"
            >
              <X size={18} />
            </button>
            <h2 className="text-lg font-black uppercase italic mb-5 tracking-tighter">
              {editingTransaction ? 'Editar' : 'Nova'}{' '}
              <span className={cn(
                activeModal === 'EXPENSE' ? 'text-red-500' :
                activeModal === 'INCOME'  ? 'text-emerald-500' : 'text-blue-500',
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
      <div className="h-full bg-[#050505] flex items-center justify-center text-[10px] font-black uppercase italic tracking-[0.5em] text-zinc-700">
        Carregando...
      </div>
    }>
      <TransactionsContent />
    </Suspense>
  );
}
