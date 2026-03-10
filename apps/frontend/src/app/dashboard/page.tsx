"use client";

import { useState, useMemo } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { StatCard } from '@/components/ui/StatCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { FixedBills } from '@/components/dashboard/FixedBills';
import { PiggyBanks } from '@/components/dashboard/PiggyBanks';
import MonthlyChallengesWidget from "@/components/dashboard/MonthlyChallengesWidget";
import { TodoWidget } from '@/components/dashboard/TodoWidget';
import { Modal } from '@/components/layout/Modal';
import TransactionForm from '@/components/forms/TransactionForm';
import { DreamsCarousel } from '@/components/dashboard/DreamsCarousel';
import { 
  LucidePlus, LucideChevronLeft, LucideChevronRight 
} from 'lucide-react';

export default function DashboardPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { month, year } = useMemo(() => ({
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear()
  }), [currentDate]);

  const { data, loading, refresh } = useDashboard(month, year);

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(newDate);
  };

  if (loading && !data) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 lg:p-6 pb-20 animate-in fade-in duration-500">
      
      {/* 1. MURAL DOS SONHOS (SUB-HEADER) */}
      {data?.dreams?.length > 0 && (
        <div className="mb-6 scale-95 origin-top">
          <DreamsCarousel dreams={data.dreams} />
        </div>
      )}

      {/* 2. HEADER CONTROLES */}
      <div className="flex items-center justify-between mb-6 bg-[#0D0D0F]/50 p-2 pl-6 rounded-full border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-black/40 rounded-full p-1 border border-white/5">
            <button onClick={() => changeMonth(-1)} className="p-1.5 hover:text-emerald-500 transition-colors">
              <LucideChevronLeft size={18} />
            </button>
            <div className="px-4 text-center">
              <span className="text-[10px] block font-black text-zinc-600 leading-none uppercase">{year}</span>
              <span className="text-sm font-black uppercase italic tracking-tighter">
                {currentDate.toLocaleString('pt-BR', { month: 'short' })}
              </span>
            </div>
            <button onClick={() => changeMonth(1)} className="p-1.5 hover:text-emerald-500 transition-colors">
              <LucideChevronRight size={18} />
            </button>
          </div>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-full font-black uppercase italic text-[10px] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/10"
        >
          <LucidePlus size={14} strokeWidth={4} /> Novo Lançamento
        </button>
      </div>

      {/* 3. RÉGUA FINANCEIRA (NOVA POSIÇÃO: LINHA INTEIRA) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard title="Entradas" amount={data?.summary?.totalIncome || 0} type="income" compact />
        <StatCard title="Saídas" amount={data?.summary?.totalExpense || 0} type="expense" compact />
        <StatCard title="Saldo Geral" amount={data?.summary?.balance || 0} type="neutral" compact />
      </div>

      {/* 4. GRID PRINCIPAL (TAREFAS + BUDGET + TRANSAÇÕES) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8">
        
        {/* TAREFAS (Lugar antigo dos cards verticais) */}
        <div className="lg:col-span-3">
          <TodoWidget />
        </div>

        {/* BUDGET (Centralizado) */}
        <div className="lg:col-span-4 bg-[#0D0D0F] p-6 rounded-[2.5rem] border border-white/5">
          <h3 className="text-[9px] font-black uppercase opacity-40 mb-6 tracking-widest italic">Planejamento / Budget</h3>
          <div className="space-y-5 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
            {data?.categoriesData?.map((cat: any) => (
              <ProgressBar key={cat.id} label={cat.name} current={cat.amount} limit={cat.limit} color={cat.color} compact />
            ))}
          </div>
        </div>

        {/* TRANSAÇÕES (Lado Direito) */}
        <div className="lg:col-span-5">
          <RecentTransactions transactions={data?.recentTransactions ?? []} compact />
        </div>
      </div>

      {/* 5. FOOTER WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-90 hover:opacity-100 transition-opacity">
        <FixedBills bills={data?.fixedBills ?? []} />
        <PiggyBanks items={data?.piggyBanks ?? []} />
        <MonthlyChallengesWidget 
          selectedMonth={month} 
          selectedYear={year} 
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Lançamento">
        <TransactionForm onSuccess={() => { setIsModalOpen(false); refresh(); }} />
      </Modal>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
      `}</style>
    </div>
  );
}