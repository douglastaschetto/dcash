"use client";

import { useState } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { StatCard } from '@/components/ui/StatCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { FixedBills } from '@/components/dashboard/FixedBills';
import { PiggyBanks } from '@/components/dashboard/PiggyBanks';
import MonthlyChallengesWidget from "@/components/dashboard/MonthlyChallengesWidget";
import { Modal } from '@/components/layout/Modal';
import TransactionForm from '@/components/forms/TransactionForm';
import { DreamsCarousel } from '@/components/dashboard/DreamsCarousel';
import { 
  LucideTrendingUp, 
  LucideTrendingDown, 
  LucidePlus, 
  LucideWallet, 
  LucideLayoutDashboard 
} from 'lucide-react';

export default function DashboardPage() {
  const [filters] = useState({ 
    month: new Date().getMonth() + 1, 
    year: new Date().getFullYear() 
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { data, loading, error, refresh } = useDashboard(filters.month, filters.year);

  // 1. ESTADO DE CARREGAMENTO
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-emerald-500 font-black italic tracking-tighter uppercase text-[10px] animate-pulse">
          Sincronizando Engine Dcash...
        </p>
      </div>
    );
  }

  // 2. ESTADO DE ERRO
  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
        <LucideLayoutDashboard className="text-zinc-800 mb-4" size={48} />
        <h2 className="text-2xl font-black uppercase italic text-red-500 mb-2">Falha na Sincronização</h2>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-white text-black px-10 py-3 rounded-full font-black uppercase text-[10px] italic hover:scale-105 transition-transform"
        >
          Tentar Reconectar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 lg:p-10 pb-32 animate-in fade-in duration-700">
      
      {/* CARROSSEL DE SONHOS */}
      {data.dreams && data.dreams.length > 0 && (
        <div className="mb-10 animate-in slide-in-from-top duration-1000">
          <DreamsCarousel dreams={data.dreams} />
        </div>
      )}

      {/* GRID SUPERIOR: FINANCEIRO E ESTATÍSTICAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        
        {/* COLUNA 1: FLUXO DE CAIXA */}
        <div className="bg-[#0A0C16] p-10 rounded-[3rem] border border-white/5 flex flex-col justify-between min-h-[400px] relative overflow-hidden group">
          <div className="z-10 space-y-4">
              <StatCard 
                title="Entradas" 
                amount={data.summary?.totalIncome ?? 0} 
                type="income" 
                icon={<LucideTrendingUp size={14}/>} 
              />
              <StatCard 
                title="Saídas" 
                amount={data.summary?.totalExpense ?? 0} 
                type="expense" 
                icon={<LucideTrendingDown size={14}/>} 
              />
          </div>
          
          <div className="z-10 mt-8">
            <StatCard 
              title="Saldo Líquido" 
              amount={data.summary?.balance ?? 0} 
              isLarge 
              className="bg-transparent border-none p-0" 
            />
          </div>
          
          <LucideWallet className="absolute -right-10 -bottom-10 w-48 h-48 text-white/[0.02] group-hover:text-emerald-500/[0.03] transition-colors duration-700" />
        </div>

        {/* COLUNA 2: BUDGET POR CATEGORIA (DADOS REAIS) */}
<div className="bg-white p-10 rounded-[3rem] text-black shadow-2xl overflow-hidden">
    <h3 className="text-[10px] font-black uppercase opacity-40 mb-8 tracking-widest italic flex items-center gap-2">
      <span className="w-2 h-2 bg-emerald-500 rounded-full" />
      Budget por Categoria
    </h3>
    <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
      {/* Verifique se o seu hook useDashboard mapeia o retorno para 'categoryLimits' */}
      {data.categoryLimits?.length > 0 ? (
        data.categoryLimits.map((limit: any) => (
          <ProgressBar 
            key={limit.id} 
            label={limit.category?.name || 'Sem nome'} 
            current={limit.spent} 
            limit={limit.amount} 
            color={limit.category?.color || '#10b981'} 
          />
        ))
      ) : (
        <div className="flex flex-col items-center justify-center py-10 opacity-20">
          <LucideWallet size={32} className="mb-2" />
          <p className="text-[10px] font-bold text-black uppercase italic text-center">Nenhum limite definido</p>
        </div>
      )}
    </div>
</div>

        {/* COLUNA 3: LISTAGEM DE TRANSAÇÕES */}
        <RecentTransactions transactions={data.recentTransactions ?? []} />
      </div>

      {/* GRID INFERIOR: COMPROMISSOS E METAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Contas Fixas */}
        <FixedBills bills={data.fixedBills ?? []} />
        
        {/* Cofrinhos/Investimentos */}
        <PiggyBanks items={data.piggyBanks ?? []} />
        
        {/* NOVO WIDGET: Desafios do Mês Atual (Substituindo o antigo Challenges) */}
        <MonthlyChallengesWidget />
        
        {/* CARD DE AÇÃO: NOVO REGISTRO */}
        <div 
          onClick={() => setIsModalOpen(true)} 
          className="bg-emerald-500 p-10 rounded-[3rem] text-black flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-400 hover:-translate-y-2 transition-all duration-300 group shadow-[0_20px_50px_rgba(16,185,129,0.2)]"
        >
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mb-4 group-hover:rotate-90 transition-transform duration-500 shadow-xl">
            <LucidePlus className="text-emerald-500" size={32} />
          </div>
          <span className="font-black uppercase italic text-[10px] tracking-widest">Novo Lançamento</span>
          <p className="text-[8px] font-bold uppercase opacity-40 mt-1 tracking-tighter">Registrar movimentação</p>
        </div>
      </div>

      {/* MODAL GLOBAL DE TRANSAÇÕES */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Nova Movimentação"
      >
        <TransactionForm 
          onSuccess={() => { 
            setIsModalOpen(false); 
            refresh(); 
          }} 
        />
      </Modal>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e4e4e7;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}