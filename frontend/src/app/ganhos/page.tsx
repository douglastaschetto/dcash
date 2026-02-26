"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { 
  DollarSign, 
  Plus, 
  ChevronRight, 
  Wallet, 
  ArrowUpCircle,
  CalendarDays,
  MoreVertical,
  CheckCircle2,
  Clock
} from "lucide-react";
import CreateIncomeModal from "@/components/CreateIncomeModal";

export default function GanhosPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ganhos, setGanhos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const fetchGanhos = useCallback(async () => {
    setLoading(true);
    try {
      // Buscamos todas as transações do tipo INCOME
      const res = await api.get("/transactions?type=INCOME");
      setGanhos(res.data);
    } catch (error) {
      console.error("Erro ao carregar ganhos:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGanhos();
  }, [fetchGanhos]);

  // Filtro local por mês e ano
  const ganhosDoMes = ganhos.filter((g: any) => {
    const data = new Date(g.date);
    return data.getMonth() + 1 === selectedMonth && data.getFullYear() === selectedYear;
  });

  const totalMensal = ganhosDoMes.reduce((acc, curr: any) => acc + Number(curr.amount), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 p-4 md:p-12">
      {/* Header com Resumo Rápido */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/30">
              <Wallet className="text-emerald-500" size={32} />
            </div>
            Meus <span className="text-emerald-500 text-glow">Ganhos</span>
          </h1>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.4em] mt-3 ml-1">
            Gestão de Fluxo de Caixa / Receitas {selectedYear}
          </p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="bg-[#111] border border-zinc-800 px-6 py-3 rounded-2xl flex flex-col items-end">
            <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Total no Mês</span>
            <span className="text-xl font-black text-emerald-400">{formatCurrency(totalMensal)}</span>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-95"
          >
            <Plus size={18} /> Novo Ganho
          </button>
        </div>
      </header>

      {/* Seletor de Meses - Estilo Horizontal Scroller */}
      <div className="flex gap-3 mb-10 overflow-x-auto pb-4 scrollbar-hide border-b border-zinc-900">
        {months.map((month, index) => (
          <button
            key={month}
            onClick={() => setSelectedMonth(index + 1)}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap border ${
              selectedMonth === index + 1 
              ? "bg-zinc-800 text-white border-emerald-500 shadow-lg shadow-emerald-500/10" 
              : "text-zinc-600 border-transparent hover:text-zinc-400 hover:bg-zinc-900/50"
            }`}
          >
            {month}
          </button>
        ))}
      </div>

      {/* Listagem de Ganhos */}
      <div className="bg-[#111] border border-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-900 bg-zinc-900/40">
                <th className="p-6 text-[10px] font-black uppercase text-zinc-500 tracking-widest">Atividade / Fonte</th>
                <th className="p-6 text-[10px] font-black uppercase text-zinc-500 tracking-widest">Data Recebimento</th>
                <th className="p-6 text-[10px] font-black uppercase text-zinc-500 tracking-widest text-center">Status</th>
                <th className="p-6 text-[10px] font-black uppercase text-zinc-500 tracking-widest text-right">Valor Bruto</th>
                <th className="p-6 text-[10px] font-black uppercase text-zinc-500 tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/50">
              {ganhosDoMes.map((ganho: any) => (
                <tr key={ganho.id} className="hover:bg-zinc-900/30 transition-all group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 text-emerald-500 group-hover:border-emerald-500/50 transition-all">
                        <ArrowUpCircle size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{ganho.description}</p>
                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">
                          {ganho.category?.name || "Receita"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2 text-zinc-500">
                      <CalendarDays size={14} />
                      <span className="text-xs font-bold">{new Date(ganho.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex justify-center">
                      <span className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        ganho.isPaid 
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                        : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      }`}>
                        {ganho.isPaid ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                        {ganho.isPaid ? "Liquidado" : "A Receber"}
                      </span>
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <span className="font-black text-white text-md tracking-tighter">
                      {formatCurrency(Number(ganho.amount))}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <button className="text-zinc-700 hover:text-white transition-colors p-2">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {ganhosDoMes.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-700">
             <DollarSign size={48} className="mb-4 opacity-10" />
             <p className="font-black uppercase text-xs tracking-[0.4em]">Sem entradas registradas em {months[selectedMonth-1]}</p>
          </div>
        )}
      </div>

      {/* MODAL DE CRIAÇÃO */}
      <CreateIncomeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRefresh={fetchGanhos}
      />
    </div>
  );
}