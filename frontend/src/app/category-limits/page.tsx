'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { 
  Target, 
  Plus, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  Trash2,
  Edit3,
  Loader2
} from 'lucide-react';
import { CategoryLimitModal } from '@/components/forms/CategoryLimitModal';

export default function CategoryLimitsPage() {
  useAuth();

  const [limits, setLimits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLimit, setSelectedLimit] = useState(null);
  
  // Estado para o Filtro de Mês/Ano (Inicia no mês atual)
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchLimits = useCallback(async () => {
    try {
      setLoading(true);
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      // Chamada para o endpoint que criamos no NestJS
      const { data } = await api.get(`/category-limits?month=${month}&year=${year}`);
      setLimits(data);
    } catch (err) {
      console.error("Erro ao buscar limites:", err);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(newDate);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja remover este limite?")) {
      try {
        await api.delete(`/category-limits/${id}`);
        fetchLimits();
      } catch (err) {
        alert("Erro ao remover limite.");
      }
    }
  };

  // Regras de negócio para sinalização visual
  const getStatus = (percent: number) => {
    if (percent > 100) return { color: '#ef4444', icon: '🚨', label: 'Excedido', bg: 'bg-red-500' };
    if (percent >= 75) return { color: '#f59e0b', icon: '😨', label: 'Cuidado', bg: 'bg-yellow-500' };
    return { color: '#10b981', icon: '✅', label: 'Saudável', bg: 'bg-emerald-500' };
  };

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' });
  const yearName = currentDate.getFullYear();

  return (
    <div className="p-8 text-white min-h-screen max-w-7xl mx-auto mb-20">
      
      {/* Header & Navegação de Meses */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3 uppercase italic">
            <Target size={40} className="text-emerald-500" /> Limites de Gastos
          </h1>
          <p className="text-zinc-500 mt-1 font-bold uppercase tracking-[0.3em] text-[9px]">
            Controle mensal por categoria
          </p>
        </div>

        <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 p-2 rounded-3xl shadow-2xl">
          <button 
            onClick={() => changeMonth(-1)} 
            className="p-3 hover:bg-zinc-800 rounded-2xl transition-all active:scale-90"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="px-8 text-center min-w-[160px]">
            <span className="block text-[10px] font-black uppercase text-emerald-500 tracking-widest">{yearName}</span>
            <span className="text-xl font-black uppercase italic tracking-tighter leading-none">{monthName}</span>
          </div>

          <button 
            onClick={() => changeMonth(1)} 
            className="p-3 hover:bg-zinc-800 rounded-2xl transition-all active:scale-90"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        
        <button 
          onClick={() => { setSelectedLimit(null); setIsModalOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95"
        >
          <Plus size={20} /> Definir Teto
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-32 text-zinc-800">
           <Loader2 size={48} className="animate-spin mb-4" />
           <span className="font-black uppercase tracking-widest text-xs">Sincronizando Dados...</span>
        </div>
      ) : limits.length === 0 ? (
        <div className="flex flex-col items-center py-32 bg-zinc-900/10 border-2 border-dashed border-zinc-900 rounded-[40px]">
          <AlertCircle size={48} className="text-zinc-800 mb-4" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm text-center">
            Sem limites para {monthName}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {limits.map((item: any) => {
            const status = getStatus(item.percent);
            
            return (
              <div 
                key={item.id} 
                className="relative group rounded-[40px] p-7 flex flex-col justify-between transition-all duration-300 hover:scale-[1.03] overflow-hidden"
                style={{ 
                  backgroundColor: `${item.category.color}10`, // 10% de opacidade da cor da categoria
                  border: `1px solid ${item.category.color}30` 
                }}
              >
                {/* Background Glow */}
                <div 
                  className="absolute -top-20 -right-20 w-40 h-40 blur-[80px] rounded-full opacity-20"
                  style={{ backgroundColor: item.category.color }}
                />

                <div className="flex justify-between items-start z-10">
                  <div 
                    className="w-16 h-16 rounded-[24px] flex items-center justify-center text-3xl shadow-xl"
                    style={{ backgroundColor: `${item.category.color}20`, border: `1px solid ${item.category.color}40` }}
                  >
                    {item.category.icon}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-3xl filter drop-shadow-md">{status.icon}</span>
                    <span className="text-[10px] font-black uppercase mt-1" style={{ color: status.color }}>
                      {status.label}
                    </span>
                  </div>
                </div>

                <div className="mt-8 z-10">
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-6">
                    {item.category.name}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-black text-zinc-500 uppercase mb-1">Limite</p>
                      <p className="text-sm font-bold tracking-tight">R$ {item.amount.toLocaleString()}</p>
                    </div>
                    <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-black text-zinc-500 uppercase mb-1">Gasto</p>
                      <p className="text-sm font-black italic">R$ {item.spent.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Barra de Progresso Customizada */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                       <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Progresso</span>
                       <span className="text-sm font-black italic" style={{ color: status.color }}>
                         {Math.round(item.percent)}%
                       </span>
                    </div>
                    <div className="h-4 bg-zinc-950 rounded-full overflow-hidden p-[3px] border border-white/5">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-in-out ${status.bg}`}
                        style={{ width: `${Math.min(item.percent, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Ações Rápidas no Hover */}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <button 
                    onClick={() => { setSelectedLimit(item); setIsModalOpen(true); }}
                    className="p-2 bg-zinc-900 text-white hover:bg-white hover:text-black rounded-xl transition-all shadow-xl"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-zinc-900 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-xl"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <CategoryLimitModal 
          limit={selectedLimit} 
          onClose={() => setIsModalOpen(false)} 
          onRefresh={fetchLimits}
        />
      )}
    </div>
  );
}