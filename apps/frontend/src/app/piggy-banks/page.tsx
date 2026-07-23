'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/app-layout';
import { PlanGate } from '@/components/plan-gate';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import {
  PiggyBank as PiggyIcon, Plus, Edit3, Trash2, Target,
  TrendingUp, AlertCircle, Calendar, Loader2, ArrowDownCircle,
  ArrowUpCircle, X, CheckCircle2,
} from 'lucide-react';
import { PiggyBankModal } from '@/components/forms/PiggyBankModal';
import { CurrencyInput } from '@/lib/currency-input';
import { cn } from '@/lib/utils';

type Bank = {
  id: string;
  name: string;
  balance: number;
  monthlyGoal?: number;
  yearlyGoal?: number;
  targetDate?: string;
  imageUrl?: string;
  color?: string;
  progress: number;
};

type OperationModal = {
  bankId: string;
  bankName: string;
  bankColor: string;
  currentBalance: number;
  type: 'deposit' | 'withdraw';
} | null;

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) =>
  new Date(d + (d.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('pt-BR', {
    month: 'short', year: 'numeric',
  });

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=800';

export default function PiggyBanksPage() {
  useAuth();

  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Bank | null>(null);
  const [opModal, setOpModal] = useState<OperationModal>(null);
  const [opAmount, setOpAmount] = useState(0);
  const [opLoading, setOpLoading] = useState(false);
  const [opSuccess, setOpSuccess] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/piggy-banks');
      setBanks(data ?? []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setSelected(null); setModalOpen(true); };
  const openEdit = (b: Bank) => { setSelected(b); setModalOpen(true); };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Arquivar cofrinho "${name}"?`)) return;
    try {
      await api.delete(`/piggy-banks/${id}`);
      setBanks((prev) => prev.filter((b) => b.id !== id));
    } catch { /* ignore */ }
  };

  const openOp = (bank: Bank, type: 'deposit' | 'withdraw') => {
    setOpAmount(0);
    setOpSuccess(false);
    setOpModal({
      bankId: bank.id,
      bankName: bank.name,
      bankColor: bank.color ?? '#10b981',
      currentBalance: bank.balance,
      type,
    });
  };

  const handleOperation = async () => {
    if (!opModal || opAmount <= 0) return;
    const amount = opAmount;
    setOpLoading(true);
    try {
      const endpoint = opModal.type === 'deposit'
        ? `/piggy-banks/${opModal.bankId}/deposit`
        : `/piggy-banks/${opModal.bankId}/withdraw`;
      const { data } = await api.post(endpoint, { amount });
      setBanks((prev) =>
        prev.map((b) => {
          if (b.id !== opModal.bankId) return b;
          const balance = Number(data.balance ?? 0);
          const goal = Number(data.yearlyGoal || data.monthlyGoal || 1);
          return { ...b, balance, progress: Math.min((balance / goal) * 100, 100) };
        }),
      );
      setOpSuccess(true);
      setTimeout(() => setOpModal(null), 1200);
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Erro na operação.');
    } finally {
      setOpLoading(false);
    }
  };

  const totalSaved = banks.reduce((s, b) => s + b.balance, 0);
  const totalGoal = banks.reduce((s, b) => s + (b.yearlyGoal || b.monthlyGoal || 0), 0);

  const addButton = (
    <button
      data-tour="piggy-banks-add-btn"
      onClick={openCreate}
      className="flex items-center gap-2 px-5 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-emerald-500 dark:hover:bg-emerald-500 dark:hover:text-white transition-all shadow-lg active:scale-95"
    >
      <Plus size={16} strokeWidth={4} /> Nova Meta
    </button>
  );

  return (
    <AppLayout title="Cofrinhos" subtitle="Metas de poupança e sonhos" actions={addButton} noPadding>
      <PlanGate feature="dreams_goals">
      <div className="h-full flex flex-col overflow-hidden font-sans">

        {/* Frozen zone: KPIs + section label (does not scroll) */}
        <div className="shrink-0 px-6 lg:px-8 pt-6 space-y-6">
          {banks.length > 0 && (
            <div data-tour="piggy-banks-kpi-cards" className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Cofrinhos ativos', value: banks.length.toString() },
                { label: 'Total poupado', value: fmt(totalSaved) },
                { label: 'Meta total', value: fmt(totalGoal) },
                {
                  label: 'Progresso geral',
                  value: totalGoal > 0 ? `${Math.round((totalSaved / totalGoal) * 100)}%` : '—',
                },
              ].map((s) => (
                <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-emerald-100 dark:border-slate-800">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{s.label}</p>
                  <p className="text-xl font-black text-zinc-900 dark:text-white mt-1">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] italic">
            <Target size={12} /> Reservas & Sonhos ·{' '}
            {loading ? '...' : `${banks.length} cofrinhos`}
          </div>
        </div>

        {/* Scrollable zone: registered piggy banks only */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-6 mt-4">

        {/* Loading */}
        {loading && (
          <div className="py-32 flex flex-col items-center gap-4 opacity-50">
            <Loader2 size={48} className="animate-spin text-zinc-400" strokeWidth={1} />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] italic text-zinc-400">Carregando metas...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && banks.length === 0 && (
          <div className="py-28 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem]">
            <AlertCircle size={56} className="text-zinc-300 dark:text-zinc-700 mb-6" strokeWidth={1} />
            <p className="text-zinc-400 font-black uppercase tracking-[0.3em] text-[10px] italic">
              Nenhum cofrinho ainda
            </p>
            <button
              onClick={openCreate}
              className="mt-5 text-emerald-500 font-black uppercase text-[10px] hover:underline"
            >
              Criar primeiro cofrinho →
            </button>
          </div>
        )}

        {/* Grid */}
        {!loading && banks.length > 0 && (
          <div data-tour="piggy-banks-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {banks.map((bank) => {
              const color = bank.color ?? '#10b981';
              const goal = bank.yearlyGoal || bank.monthlyGoal || 0;
              const progress = bank.progress ?? 0;
              const done = progress >= 100;

              return (
                <div
                  key={bank.id}
                  className="group bg-white dark:bg-zinc-900/40 border border-zinc-100 dark:border-white/5 rounded-[1.75rem] overflow-hidden transition-all hover:shadow-2xl flex flex-col"
                  style={{ '--bank-color': color } as React.CSSProperties}
                >
                  {/* Image */}
                  <div className="relative h-28 overflow-hidden">
                    <img
                      src={bank.imageUrl || FALLBACK_IMG}
                      alt={bank.name}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale-[0.4] group-hover:grayscale-0"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Date badge */}
                    {bank.targetDate && (
                      <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
                        <Calendar size={12} className="text-white/70" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/90">
                          {fmtDate(bank.targetDate)}
                        </span>
                      </div>
                    )}

                    {/* Done badge */}
                    {done && (
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-1.5 rounded-xl">
                        <span className="text-[9px] font-black uppercase tracking-widest">Concluído!</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      {!done && (
                        <button
                          onClick={() => openEdit(bank)}
                          className="p-2.5 bg-white/90 dark:bg-zinc-800/90 text-zinc-700 dark:text-white rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-lg backdrop-blur-sm"
                        >
                          <Edit3 size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(bank.id, bank.name)}
                        className="p-2.5 bg-white/90 dark:bg-zinc-800/90 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg backdrop-blur-sm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Color bar at bottom of image */}
                    <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: color }} />
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3
                          className="text-base font-black uppercase italic tracking-tighter leading-none transition-colors"
                          style={{ color: done ? color : undefined }}
                        >
                          {bank.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <TrendingUp size={10} style={{ color }} />
                          <span className="text-[9px] font-bold text-zinc-400">
                            Poupado: <span className="font-black text-zinc-700 dark:text-zinc-200">{fmt(bank.balance)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-end">
                        {goal > 0 && (
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                            Meta: {fmt(goal)}
                          </span>
                        )}
                        <span
                          className="text-lg font-black italic leading-none ml-auto"
                          style={{ color }}
                        >
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{
                            width: `${progress}%`,
                            backgroundColor: done ? '#3b82f6' : color,
                            boxShadow: `0 0 12px ${color}60`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-auto pt-1">
                      <button
                        onClick={() => openOp(bank, 'deposit')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95"
                        style={{ backgroundColor: color }}
                      >
                        <ArrowDownCircle size={12} /> Depositar
                      </button>
                      <button
                        onClick={() => openOp(bank, 'withdraw')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-95"
                        style={{ borderColor: `${color}40`, color }}
                      >
                        <ArrowUpCircle size={12} /> Retirar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {/* Create/Edit modal */}
      {modalOpen && (
        <PiggyBankModal
          bank={selected}
          onClose={() => setModalOpen(false)}
          onRefresh={load}
        />
      )}

      {/* Deposit / Withdraw modal */}
      {opModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[2.5rem] bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden">
            <div
              className="px-8 pt-8 pb-6 flex items-center justify-between"
              style={{ borderBottom: `3px solid ${opModal.bankColor}20` }}
            >
              <div>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em]">
                  {opModal.type === 'deposit' ? 'Depositar em' : 'Retirar de'}
                </p>
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-zinc-900 dark:text-white leading-none mt-0.5">
                  {opModal.bankName}
                </h3>
                <p className="text-[10px] text-zinc-400 mt-1">
                  Saldo atual: <span className="font-black text-zinc-700 dark:text-zinc-300">{fmt(opModal.currentBalance)}</span>
                </p>
              </div>
              <button
                onClick={() => setOpModal(null)}
                className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-8 space-y-5">
              {opSuccess ? (
                <div className="py-8 flex flex-col items-center gap-3">
                  <CheckCircle2 size={48} className="text-emerald-500" />
                  <p className="font-black uppercase tracking-widest text-[10px] text-zinc-400">
                    {opModal.type === 'deposit' ? 'Depósito realizado!' : 'Retirada realizada!'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                      Valor (R$)
                    </label>
                    <CurrencyInput
                      autoFocus
                      value={opAmount}
                      onChange={setOpAmount}
                      placeholder="0,00"
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-2xl font-black focus:outline-none transition"
                      style={{ borderColor: opAmount > 0 ? `${opModal.bankColor}60` : undefined }}
                      onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleOperation()}
                    />
                  </div>

                  <button
                    onClick={handleOperation}
                    disabled={opLoading || opAmount <= 0}
                    className={cn(
                      'w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] text-white transition disabled:opacity-40 flex items-center justify-center gap-2',
                    )}
                    style={{ backgroundColor: opModal.bankColor }}
                  >
                    {opLoading ? <Loader2 size={16} className="animate-spin" /> : (
                      opModal.type === 'deposit' ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />
                    )}
                    {opModal.type === 'deposit' ? 'Confirmar Depósito' : 'Confirmar Retirada'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </PlanGate>
    </AppLayout>
  );
}
