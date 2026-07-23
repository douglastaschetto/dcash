'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/app-layout';
import { PlanGate } from '@/components/plan-gate';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { FixedBillModal } from '@/components/forms/FixedBillModal';
import { cn } from '@/lib/utils';
import {
  Plus, Trash2, Edit3,
  ChevronLeft, ChevronRight,
  RefreshCw, Loader2, CheckCircle2, AlertCircle,
  CreditCard, Receipt,
} from 'lucide-react';

type Bill = {
  id: string;
  fixedBillId: string;
  title: string;
  value: number;
  dayOfMonth: number;
  isPaid: boolean;
  type: 'transaction' | 'aggregation' | 'card';
  paymentMethodType?: string;
  paymentMethodId?: string;
  categoryId?: string;
};

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export default function FixedBillsPage() {
  useAuth();

  const [bills, setBills] = useState<Bill[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<{ open: boolean; data: Bill | null }>({
    open: false,
    data: null,
  });
  const [currentDate, setCurrentDate] = useState(new Date());

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [resBills, resMethods] = await Promise.all([
        api.get('/fixed-bills', { params: { month, year } }),
        api.get('/payment-methods'),
      ]);
      setBills(resBills.data ?? []);
      setPaymentMethods(resMethods.data ?? []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () =>
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const handleSave = async (payload: any, id?: string) => {
    if (id) await api.patch(`/fixed-bills/${id}`, payload);
    else await api.post('/fixed-bills', payload);
    load();
  };

  const handleDelete = async (bill: Bill) => {
    const msg = bill.type === 'card'
      ? `Remover a regra "${bill.title}" e todas as transações futuras pendentes?`
      : `Remover "${bill.title}" e todos os lançamentos futuros não pagos?`;
    if (!confirm(msg)) return;
    try {
      await api.delete(`/fixed-bills/${bill.fixedBillId}`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Erro ao remover.');
    }
  };

  const totalPending = bills.filter((b) => !b.isPaid).reduce((s, b) => s + b.value, 0);
  const totalPaid = bills.filter((b) => b.isPaid).reduce((s, b) => s + b.value, 0);
  const totalMonth = bills.reduce((s, b) => s + b.value, 0);

  const addButton = (
    <button
      data-tour="fixed-bills-add-btn"
      onClick={() => setModalState({ open: true, data: null })}
      className="flex items-center gap-3 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-orange-500 dark:hover:bg-orange-500 dark:hover:text-white shadow-xl transition-all active:scale-95"
    >
      <Plus size={18} strokeWidth={3} /> Nova Conta Fixa
    </button>
  );

  return (
    <AppLayout title="Contas Fixas" subtitle="Despesas recorrentes mensais" actions={addButton} noPadding>
      <PlanGate feature="fixed_bills">
      <div className="h-full flex flex-col overflow-hidden">

        {/* Frozen zone: month navigator + KPIs (does not scroll) */}
        <div className="shrink-0 px-6 lg:px-8 pt-6 pb-4 space-y-3 max-w-5xl mx-auto w-full">

        {/* Month navigator */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
          <div className="flex items-center gap-2 text-orange-500 font-black text-[9px] tracking-[0.3em] uppercase">
            <RefreshCw size={12} className={cn(loading && 'animate-spin')} />
            Fluxo Recorrente
          </div>

          <div data-tour="fixed-bills-month-nav" className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition active:scale-90"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="px-5 text-center min-w-[110px]">
              <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest leading-none">{year}</p>
              <p className="text-xs font-black uppercase italic text-zinc-900 dark:text-white mt-0.5">
                {MONTHS[month - 1]}
              </p>
            </div>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition active:scale-90"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div data-tour="fixed-bills-kpi-cards" className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total do Mês', value: fmt(totalMonth), color: 'text-zinc-900 dark:text-white' },
            { label: 'Pendente', value: fmt(totalPending), color: 'text-red-500' },
            { label: 'Pago', value: fmt(totalPaid), color: 'text-emerald-500' },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-zinc-900 rounded-xl p-3 border border-zinc-100 dark:border-zinc-800">
              <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{s.label}</p>
              <p className={cn('text-base font-black mt-0.5', s.color)}>{s.value}</p>
            </div>
          ))}
        </div>
        </div>

        {/* Scrollable zone: bills table */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-6 max-w-5xl mx-auto w-full">
        <div data-tour="fixed-bills-table" className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-24 flex justify-center">
              <Loader2 className="text-orange-500 animate-spin" size={32} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[9px] font-black uppercase text-zinc-400 tracking-[0.2em] italic">
                    <th className="px-6 py-3.5 text-left">Conta / Origem</th>
                    <th className="px-5 py-3.5 text-center">Tipo</th>
                    <th className="px-5 py-3.5 text-right">Valor & Status</th>
                    <th className="px-6 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                  {bills.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-20 text-center text-zinc-400 text-[10px] font-black uppercase italic tracking-[0.2em]">
                        Nenhuma conta fixa neste mês
                      </td>
                    </tr>
                  ) : (
                    bills.map((bill) => (
                      <tr
                        key={bill.id}
                        className="transition-all hover:bg-white dark:hover:bg-zinc-900/80 group"
                      >
                        {/* Title */}
                        <td className="px-6 py-3.5">
                          <p className="font-black text-zinc-900 dark:text-white text-sm uppercase italic tracking-tighter leading-none">
                            {bill.title}
                          </p>
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                            Vence dia {bill.dayOfMonth}
                          </p>
                        </td>

                        {/* Type badge */}
                        <td className="px-5 py-3.5 text-center">
                          {bill.type === 'card' ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-500">
                              <CreditCard size={11} />
                              <span className="text-[9px] font-black uppercase tracking-wider">Cartão</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-500">
                              <Receipt size={11} />
                              <span className="text-[9px] font-black uppercase tracking-wider">Conta</span>
                            </div>
                          )}
                        </td>

                        {/* Value + status */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <span className="font-black italic text-base tracking-tighter text-zinc-900 dark:text-white">
                              {fmt(bill.value)}
                            </span>
                            {bill.isPaid ? (
                              <div className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-500" title="Pago">
                                <CheckCircle2 size={18} strokeWidth={2.5} />
                              </div>
                            ) : (
                              <div className="p-1.5 rounded-full bg-red-500/10 text-red-500 animate-pulse" title="Pendente">
                                <AlertCircle size={18} strokeWidth={2.5} />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex justify-end gap-1">
                            {bill.type === 'transaction' && (
                              <button
                                onClick={() => setModalState({ open: true, data: bill })}
                                className="p-2 text-zinc-400 hover:text-orange-500 transition rounded-lg hover:bg-orange-500/5"
                                title="Editar lançamento"
                              >
                                <Edit3 size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(bill)}
                              className="p-2 text-zinc-300 dark:text-zinc-600 hover:text-red-500 transition rounded-lg hover:bg-red-500/5"
                              title="Remover regra e lançamentos futuros"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      </div>

      <FixedBillModal
        isOpen={modalState.open}
        onClose={() => setModalState({ open: false, data: null })}
        onSave={handleSave}
        initialData={modalState.data}
        paymentMethods={paymentMethods}
      />
      </PlanGate>
    </AppLayout>
  );
}
