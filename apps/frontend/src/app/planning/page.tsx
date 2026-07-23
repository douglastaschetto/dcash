'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, ChevronLeft, ChevronRight, Check,
  ArrowRight, ArrowLeft, Trash2, Plus, X, Target, Pencil, Copy,
} from 'lucide-react';
import { LucideIcon } from '@/lib/icon-picker';
import { CurrencyInput } from '@/lib/currency-input';
import { AppLayout } from '@/components/app-layout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dcash:token') : null;
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type YearlyStatus = { month: number; hasPlanning: boolean; totalPlanned: number; totalSpent: number; percent: number };

type CategoryLimit = {
  id: string;
  amount: number;
  spent: number;
  percent: number;
  categoryId: string;
  category: { id: string; name: string; color: string; icon: string };
};

type ExpenseCategory = { id: string; name: string; color: string; icon: string };

type Step = 'empty' | 'income' | 'categories';

type CatInput = { categoryId: string; name: string; color: string; icon: string; amount: number; limitId?: string };

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ percent, color }: { percent: number; color: string }) {
  const pct = Math.min(percent, 100);
  const over = percent > 100;
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: over ? '#ef4444' : color || '#10b981' }}
      />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PlanningPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [yearlyStatus, setYearlyStatus] = useState<YearlyStatus[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Panel state
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [step, setStep] = useState<Step>('empty');
  const [panelLoading, setPanelLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Step 1 – income
  const [income, setIncome] = useState(0);
  const [reservePct, setReservePct] = useState(20);

  // Step 2 – categories
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [catInputs, setCatInputs] = useState<CatInput[]>([]);
  const [existingLimits, setExistingLimits] = useState<CategoryLimit[]>([]);

  const reserveAmt = income * (reservePct / 100);
  const available = income - reserveAmt;
  const distributed = catInputs.reduce((s, c) => s + c.amount, 0);
  const remaining = available - distributed;

  // ── Load yearly status ────────────────────────────────────────────────────
  const loadYearlyStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch(`${API}/category-limits/yearly-status?year=${year}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) setYearlyStatus(await res.json());
    } finally {
      setLoadingStatus(false);
    }
  }, [year]);

  useEffect(() => { loadYearlyStatus(); }, [loadYearlyStatus]);

  // ── Load expense categories ───────────────────────────────────────────────
  const loadExpenseCategories = useCallback(async (): Promise<ExpenseCategory[]> => {
    try {
      const res = await fetch(`${API}/categories`, { headers: getAuthHeaders() });
      if (!res.ok) return [];
      const all = await res.json();
      const expenses = all.filter((c: any) => c.type === 'expense');
      setExpenseCategories(expenses);
      return expenses;
    } catch { return []; }
  }, []);

  // ── Merge the full expense-category list with whatever limits exist ──────
  const mergeWithCategories = (categories: ExpenseCategory[], limits: CategoryLimit[]): CatInput[] =>
    categories.map((c) => {
      const l = limits.find((x) => x.categoryId === c.id);
      return {
        categoryId: c.id, name: c.name, color: c.color, icon: c.icon,
        amount: l ? l.amount : 0,
        limitId: l?.id,
      };
    });

  // ── Open month panel ──────────────────────────────────────────────────────
  const openMonth = async (month: number) => {
    setSelectedMonth(month);
    setIncome(0); setReservePct(20);
    const status = yearlyStatus.find((s) => s.month === month);
    if (!status?.hasPlanning) {
      setStep('empty');
      setCatInputs([]);
      setExistingLimits([]);
      return;
    }
    // Has planning → load limits + all expense categories, then go to categories
    setPanelLoading(true);
    try {
      const [res, categories] = await Promise.all([
        fetch(`${API}/category-limits?month=${month}&year=${year}`, { headers: getAuthHeaders() }),
        loadExpenseCategories(),
      ]);
      if (!res.ok) { setStep('empty'); return; }
      const limits: CategoryLimit[] = await res.json();
      setExistingLimits(limits);
      setCatInputs(mergeWithCategories(categories, limits));
      setStep('categories');
    } finally {
      setPanelLoading(false);
    }
  };

  const closePanel = () => { setSelectedMonth(null); };

  // ── Start new planning ────────────────────────────────────────────────────
  const startPlanning = async () => {
    await loadExpenseCategories();
    setStep('income');
  };

  // ── Quick-create: open panel straight into the income step (skip the empty screen) ──
  const createPlanning = async (month: number) => {
    setSelectedMonth(month);
    setIncome(0); setReservePct(20);
    setCatInputs([]); setExistingLimits([]);
    await loadExpenseCategories();
    setStep('income');
  };

  // ── Replicate previous month's category amounts into this month ──────────
  const [replicating, setReplicating] = useState(false);
  const replicatePrevMonth = async (month: number) => {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear  = month === 1 ? year - 1 : year;
    setReplicating(true);
    try {
      const [res, categories] = await Promise.all([
        fetch(`${API}/category-limits?month=${prevMonth}&year=${prevYear}`, { headers: getAuthHeaders() }),
        loadExpenseCategories(),
      ]);
      const limits: CategoryLimit[] = res.ok ? await res.json() : [];
      if (limits.length === 0) {
        alert(`Não há planejamento em ${MONTHS[prevMonth - 1]} para replicar.`);
        return;
      }
      setSelectedMonth(month);
      setIncome(0); setReservePct(20);
      setExistingLimits([]);
      setCatInputs(mergeWithCategories(categories, limits).map((c) => ({ ...c, limitId: undefined })));
      setStep('categories');
    } finally {
      setReplicating(false);
    }
  };

  // ── Go to categories step ─────────────────────────────────────────────────
  const goToCategories = async () => {
    if (catInputs.length === 0) {
      await loadExpenseCategories();
      // Pre-fill all expense categories
      const inputs: CatInput[] = expenseCategories.map((c) => ({
        categoryId: c.id, name: c.name, color: c.color, icon: c.icon, amount: 0,
      }));
      setCatInputs(inputs.length > 0 ? inputs : []);
    }
    setStep('categories');
  };

  // When expenseCategories loads after startPlanning → move to categories
  useEffect(() => {
    if (step === 'income' && expenseCategories.length > 0 && catInputs.length === 0) {
      const inputs: CatInput[] = expenseCategories.map((c) => ({
        categoryId: c.id, name: c.name, color: c.color, icon: c.icon, amount: 0,
      }));
      setCatInputs(inputs);
    }
  }, [expenseCategories, step, catInputs.length]);

  // ── Save planning ─────────────────────────────────────────────────────────
  const savePlanning = async () => {
    if (!selectedMonth) return;
    const toSave = catInputs.filter((c) => c.amount > 0);
    if (toSave.length === 0) return;
    setSaving(true);
    try {
      for (const c of toSave) {
        await fetch(`${API}/category-limits`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ categoryId: c.categoryId, amount: c.amount, month: selectedMonth, year }),
        });
      }
      // Delete removed limits (was in DB but now amount=0 or removed)
      for (const limit of existingLimits) {
        const kept = catInputs.find((c) => c.categoryId === limit.categoryId && c.amount > 0);
        if (!kept) {
          await fetch(`${API}/category-limits/${limit.id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
        }
      }
      await loadYearlyStatus();
      closePanel();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  // ── Clear an individual category's planned amount (category stays listed) ──
  const clearLimit = async (limitId: string | undefined, categoryId: string) => {
    if (limitId) {
      await fetch(`${API}/category-limits/${limitId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    }
    setCatInputs((prev) => prev.map((c) => (c.categoryId === categoryId ? { ...c, amount: 0, limitId: undefined } : c)));
    setExistingLimits((prev) => prev.filter((l) => l.id !== limitId));
  };

  const hasPlanning = yearlyStatus.find((s) => s.month === selectedMonth)?.hasPlanning ?? false;

  // ── Month status ──────────────────────────────────────────────────────────
  const getStatus = (month: number) => yearlyStatus.find((s) => s.month === month);

  return (
    <AppLayout title="Planejamento" subtitle="Controle seus gastos por categoria">

      {/* Year selector */}
      <div data-tour="planning-year-nav" className="flex items-center justify-between mb-6 rounded-2xl border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-4 shadow-sm">
        <button
          onClick={() => setYear((y) => y - 1)}
          className="p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-xl font-bold text-emerald-950 dark:text-white">{year}</span>
        <button
          onClick={() => setYear((y) => y + 1)}
          className="p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Month grid */}
      {loadingStatus ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <div data-tour="planning-months-grid" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {MONTHS.map((monthName, idx) => {
            const month = idx + 1;
            const status = getStatus(month);
            const isCurrent = month === now.getMonth() + 1 && year === now.getFullYear();
            const isSelected = selectedMonth === month;
            const planned = status?.hasPlanning ?? false;

            return (
              <div
                key={month}
                role="button"
                tabIndex={0}
                onClick={() => openMonth(month)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openMonth(month)}
                className={`relative flex flex-col items-start gap-2 rounded-2xl border-2 p-5 text-left transition cursor-pointer
                  ${isSelected
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 shadow-md'
                    : isCurrent
                    ? 'border-emerald-400 bg-white dark:bg-slate-900 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-emerald-300 dark:hover:border-slate-600 hover:shadow-sm'
                  }`}
              >
                {/* Current badge */}
                {isCurrent && !isSelected && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                    Atual
                  </span>
                )}

                {/* Create / edit action icon */}
                <button
                  type="button"
                  title={planned ? 'Editar planejamento' : 'Criar planejamento'}
                  onClick={(e) => { e.stopPropagation(); planned ? openMonth(month) : createPlanning(month); }}
                  className={`absolute bottom-3 right-3 h-7 w-7 rounded-lg flex items-center justify-center transition
                    ${planned
                      ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                      : 'text-slate-400 dark:text-slate-500 hover:bg-emerald-50 dark:hover:bg-slate-700 hover:text-emerald-600'
                    }`}
                >
                  {planned ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-4 w-4" />}
                </button>

                {/* Month name */}
                <p className={`text-base font-bold ${isSelected ? 'text-emerald-800 dark:text-emerald-200' : 'text-emerald-950 dark:text-white'}`}>
                  {monthName}
                </p>

                {/* Status */}
                {planned ? (
                  <>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      Planejado
                    </span>
                    {status && status.totalPlanned > 0 && (
                      <div className="w-full pr-8">
                        <ProgressBar percent={status.percent} color="#10b981" />
                        <p className={`text-[11px] font-semibold mt-1 ${status.percent > 100 ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                          {status.percent.toFixed(0)}% realizado
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500">Sem planejamento</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Right panel ──────────────────────────────────────────────────── */}
      {selectedMonth !== null && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closePanel} />

          {/* Panel */}
          <div className="w-full max-w-[480px] flex flex-col bg-white dark:bg-slate-900 shadow-2xl animate-in slide-in-from-right duration-300 overflow-hidden">

            {/* Header */}
            <div className="relative bg-gradient-to-br from-emerald-950 to-emerald-800 p-6 text-white shrink-0">
              <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
              <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/5" />
              <div className="relative">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
                    {step === 'income' ? 'Passo 1 de 2' : step === 'categories' ? 'Passo 2 de 2' : 'Planejamento'}
                  </p>
                  <button onClick={closePanel} className="p-1.5 rounded-lg hover:bg-white/10 transition">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <h2 className="text-2xl font-bold">
                  {MONTHS[selectedMonth - 1]} {year}
                </h2>
                {step === 'categories' && catInputs.length > 0 && (
                  <div className="flex gap-6 mt-4">
                    <div>
                      <p className="text-xs text-emerald-300 uppercase tracking-wide">Restante</p>
                      <p className={`text-lg font-bold ${remaining < 0 ? 'text-red-300' : 'text-white'}`}>
                        R$ {fmt(Math.abs(remaining))} {remaining < 0 ? 'acima' : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-emerald-300 uppercase tracking-wide">Distribuído</p>
                      <p className="text-lg font-bold">R$ {fmt(distributed)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {panelLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : (
              <>
                {/* ── Step: empty ─────────────────────────────────────────── */}
                {step === 'empty' && (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="h-20 w-20 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mb-6">
                      <Target className="h-10 w-10 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-emerald-950 dark:text-white mb-2">
                      Sem planejamento
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-xs">
                      Defina limites por categoria e controle seus gastos mensais de forma inteligente.
                    </p>
                    <button
                      data-tour="planning-start-btn"
                      onClick={startPlanning}
                      className="flex items-center gap-2 rounded-xl bg-emerald-950 px-8 py-3.5 text-sm font-bold text-white hover:bg-emerald-800 transition"
                    >
                      <Plus className="h-4 w-4" />
                      Iniciar planejamento
                    </button>
                    <button
                      onClick={() => selectedMonth && replicatePrevMonth(selectedMonth)}
                      disabled={replicating}
                      className="flex items-center gap-2 mt-3 rounded-xl border border-slate-200 dark:border-slate-600 px-8 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition"
                    >
                      {replicating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                      Replicar mês anterior
                    </button>
                  </div>
                )}

                {/* ── Step: income ────────────────────────────────────────── */}
                {step === 'income' && (
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Income */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
                        Previsão de Receita Mensal
                      </label>
                      <div className="rounded-2xl border-2 border-emerald-200 dark:border-slate-600 bg-emerald-50 dark:bg-slate-800 p-5">
                        <p className="text-xs text-slate-400 mb-1">R$</p>
                        <CurrencyInput
                          value={income}
                          onChange={setIncome}
                          className="w-full text-3xl font-bold text-emerald-950 dark:text-white bg-transparent outline-none border-none"
                          placeholder="0,00"
                        />
                      </div>
                    </div>

                    {/* Reserve slider */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          Meta de Reserva
                        </label>
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{reservePct}%</span>
                      </div>
                      <input
                        type="range" min={0} max={50} step={1}
                        value={reservePct}
                        onChange={(e) => setReservePct(Number(e.target.value))}
                        className="w-full accent-emerald-600"
                      />
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>0%</span><span>25%</span><span>50%</span>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Receita bruta</span>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">R$ {fmt(income)}</span>
                      </div>
                      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Aporte / Reserva</span>
                        <span className="text-sm font-semibold text-orange-500">- R$ {fmt(reserveAmt)}</span>
                      </div>
                      <div className="flex items-center justify-between px-5 py-4 bg-emerald-50 dark:bg-emerald-950/30">
                        <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Disponível para gastos</span>
                        <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">R$ {fmt(available)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step: categories ────────────────────────────────────── */}
                {step === 'categories' && (
                  <div className="flex-1 overflow-y-auto p-6">
                    {catInputs.length === 0 && (
                      <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
                        Nenhuma categoria de despesa encontrada.<br />
                        Cadastre categorias do tipo "Despesa" primeiro.
                      </p>
                    )}

                    {catInputs.length > 0 && (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        {/* Header row */}
                        <div className="grid grid-cols-[1fr_130px_64px_36px] gap-3 items-center px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Categoria</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Valor</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">% Total</span>
                          <span />
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                          {catInputs.map((cat) => {
                            const pctOfTotal = distributed > 0 ? (cat.amount / distributed) * 100 : null;

                            return (
                              <div
                                key={cat.categoryId}
                                className="grid grid-cols-[1fr_130px_64px_36px] gap-3 items-center px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div
                                    className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: `${cat.color}22`, color: cat.color || '#10b981' }}
                                  >
                                    <LucideIcon name={cat.icon || 'Tag'} size={14} />
                                  </div>
                                  <span className="text-sm font-medium text-emerald-950 dark:text-white truncate">{cat.name}</span>
                                </div>

                                <CurrencyInput
                                  value={cat.amount}
                                  onChange={(val) =>
                                    setCatInputs((prev) =>
                                      prev.map((c) => (c.categoryId === cat.categoryId ? { ...c, amount: val } : c)),
                                    )
                                  }
                                  placeholder="0,00"
                                  className="w-full rounded-lg bg-emerald-50 dark:bg-slate-700 border border-emerald-200 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-right text-slate-900 dark:text-white outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition"
                                />

                                <span className="text-xs font-semibold text-right text-slate-500 dark:text-slate-400">
                                  {pctOfTotal !== null ? `${pctOfTotal.toFixed(0)}%` : '—'}
                                </span>

                                <button
                                  onClick={() => clearLimit(cat.limitId, cat.categoryId)}
                                  disabled={cat.amount === 0 && !cat.limitId}
                                  title="Zerar valor"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:hover:bg-transparent transition justify-self-end"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Footer ──────────────────────────────────────────────── */}
                <div className="shrink-0 border-t border-slate-100 dark:border-slate-700 p-5">
                  {step === 'income' && (
                    <div className="flex gap-3">
                      <button
                        onClick={goToCategories}
                        disabled={income <= 0}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-950 px-6 py-3.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-40 transition"
                      >
                        Planejar categorias <ArrowRight className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setStep('empty')}
                        className="rounded-xl border border-slate-200 dark:border-slate-600 px-5 py-3.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {step === 'categories' && (
                    <div className="flex gap-3">
                      <button
                        onClick={savePlanning}
                        disabled={saving || catInputs.filter((c) => c.amount > 0).length === 0}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-950 px-6 py-3.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-40 transition"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Salvar planejamento
                      </button>
                      {!hasPlanning && (
                        <button
                          onClick={() => setStep('income')}
                          className="rounded-xl border border-slate-200 dark:border-slate-600 px-5 py-3.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
