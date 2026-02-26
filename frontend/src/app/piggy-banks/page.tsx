'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { 
  PiggyBank as PiggyIcon, 
  Plus, 
  Edit3, 
  Trash2, 
  Target, 
  TrendingUp,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { PiggyBankModal } from '@/components/forms/PiggyBankModal';

export default function PiggyBanksPage() {
  useAuth();

  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);

  const fetchBanks = async () => {
    try {
      setLoading(true);
      // Alterado para a rota padrão de listagem para pegar o balance atualizado
      const { data } = await api.get('/piggy-banks');
      setBanks(data);
    } catch (err) {
      console.error("Erro ao buscar cofrinhos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const handleEdit = (bank: any) => {
    setSelectedBank(bank);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedBank(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Deseja realmente arquivar o cofrinho "${name}"? As transações vinculadas serão preservadas.`)) {
      try {
        await api.delete(`/piggy-banks/${id}`);
        fetchBanks();
      } catch (err) {
        alert("Erro ao remover o cofrinho.");
      }
    }
  };

  return (
    <div className="p-8 text-white min-h-screen max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-zinc-800 pb-8 gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter flex items-center gap-4 uppercase italic">
            <PiggyIcon size={48} className="text-emerald-500" /> Meus Cofrinhos
          </h1>
          <p className="text-zinc-500 mt-2 font-medium uppercase tracking-widest text-[10px]">
            Gestão de metas de médio e longo prazo
          </p>
        </div>
        
        <button 
          onClick={handleCreate}
          className="bg-emerald-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-500 hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20"
        >
          <Plus size={20} /> Nova Meta
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-20 text-zinc-700">
          <div className="animate-spin mb-4">
            <PiggyIcon size={40} />
          </div>
          <span className="font-black uppercase tracking-[0.2em] text-sm">Sincronizando Cofres...</span>
        </div>
      ) : banks.length === 0 ? (
        <div className="flex flex-col items-center py-20 bg-zinc-900/20 border-2 border-dashed border-zinc-800 rounded-[40px]">
          <AlertCircle size={48} className="text-zinc-700 mb-4" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm text-center">
            Nenhum cofrinho ativo encontrado.<br/>
            <span className="text-zinc-700 text-xs">Comece criando uma nova meta de economia.</span>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {banks.map((bank: any) => {
            // AJUSTE: Mapeia balance para totalSaved e garante que sejam números
            const currentBalance = Number(bank.balance || 0);
            const goal = Number(bank.yearlyGoal || bank.monthlyGoal || 1); // evita divisão por zero
            const progress = (currentBalance / goal) * 100;
            
            const targetLabel = bank.targetDate 
              ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(bank.targetDate))
              : 'Sem prazo';
            
            return (
              <div 
                key={bank.id} 
                className="bg-zinc-900/40 border border-zinc-800 rounded-[40px] hover:border-emerald-500/50 transition-all group relative overflow-hidden flex flex-col"
              >
                {/* Banner de Cabeçalho */}
                <div className="h-40 w-full relative overflow-hidden">
                  <img 
                    src={bank.imageUrl || 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=800'} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700"
                    alt={bank.name}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                  
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                    <Calendar size={12} className="text-emerald-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white">
                      Alvo: {targetLabel}
                    </span>
                  </div>

                  <div className="absolute top-4 right-4 flex gap-2">
                    <button 
                      onClick={() => handleEdit(bank)}
                      className="p-2 bg-black/40 backdrop-blur-md text-white hover:bg-emerald-500 rounded-xl transition-all border border-white/10"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(bank.id, bank.name)}
                      className="p-2 bg-black/40 backdrop-blur-md text-white hover:bg-red-500 rounded-xl transition-all border border-white/10"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Conteúdo do Card */}
                <div className="p-8 pt-6 flex flex-col flex-1 relative">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                      <Target size={18} />
                    </div>
                    <h3 className="font-black text-2xl text-white uppercase tracking-tighter italic">
                      {bank.name}
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-8">
                    <TrendingUp size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.15em]">
                      Saldo Atual: R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="mt-auto space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Objetivo Final</span>
                        <span className="text-lg font-black text-white italic tracking-tight">
                          R$ {goal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-2xl font-black text-emerald-500 italic leading-none">
                          {Math.round(progress)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="h-4 bg-zinc-950 rounded-full border border-zinc-800 overflow-hidden p-[3px]">
                      <div 
                        className="h-full bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <PiggyBankModal 
          bank={selectedBank} 
          onClose={() => setIsModalOpen(false)} 
          onRefresh={fetchBanks}
        />
      )}
    </div>
  );
}