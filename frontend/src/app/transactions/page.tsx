"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/services/api";
import { 
  Plus, Search, CheckCircle2, X, ArrowLeft, 
  CreditCard, Calendar as CalendarIcon, CheckCheck 
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import TransactionForm from '@/components/forms/TransactionForm';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  isPaid: boolean;
  paymentMethod?: { name: string };
  category?: { name: string };
}

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const dateParam = searchParams.get("date");
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // ESTADOS DOS FILTROS
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [localDateFilter, setLocalDateFilter] = useState(dateParam || "");

  const fetchData = async () => {
    try {
      const res = await api.get("/transactions");
      setTransactions(res.data);
    } catch (error) {
      console.error("Erro ao buscar transações", error);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  useEffect(() => {
    if (dateParam) setLocalDateFilter(dateParam);
  }, [dateParam]);

  const handleDateChange = (newDate: string) => {
    setLocalDateFilter(newDate);
    const params = new URLSearchParams(searchParams.toString());
    if (newDate) {
      params.set("date", newDate);
    } else {
      params.delete("date");
    }
    router.push(`?${params.toString()}`);
  };

  // LÓGICA DE FILTRAGEM MULTI-CRITÉRIO
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDate = localDateFilter ? t.date.startsWith(localDateFilter) : true;
      const matchType = typeFilter === 'ALL' || t.type === typeFilter;
      const matchStatus = statusFilter === 'ALL' || (statusFilter === 'PAID' ? t.isPaid : !t.isPaid);
      const matchMethod = methodFilter === 'ALL' || t.paymentMethod?.name === methodFilter;
      
      return matchSearch && matchDate && matchType && matchStatus && matchMethod;
    });
  }, [transactions, searchTerm, localDateFilter, typeFilter, statusFilter, methodFilter]);

  // Identifica se há algo pendente para liquidar na visualização atual
  const hasPending = useMemo(() => 
    filteredTransactions.some(t => !t.isPaid), 
  [filteredTransactions]);

  // Função para liquidar tudo o que está filtrado na tela
  const handlePayAllFiltered = async () => {
    const toPay = filteredTransactions.filter(t => !t.isPaid);
    if (toPay.length === 0) return;

    const confirmMsg = localDateFilter 
      ? `Liquidar todas as ${toPay.length} transações do dia ${format(parseISO(localDateFilter), 'dd/MM')}?`
      : `Liquidar as ${toPay.length} transações pendentes mostradas na lista?`;

    if (window.confirm(confirmMsg)) {
      try {
        // Loop de atualização (ajuste para endpoint bulk se seu backend suportar)
        await Promise.all(
          toPay.map(t => api.patch(`/transactions/${t.id}`, { isPaid: true }))
        );
        fetchData();
      } catch (error) {
        console.error("Erro ao liquidar transações:", error);
        alert("Erro ao atualizar algumas transações.");
      }
    }
  };

  const uniqueMethods = useMemo(() => {
    const methods = transactions.map(t => t.paymentMethod?.name).filter(Boolean);
    return Array.from(new Set(methods));
  }, [transactions]);

  return (
    <div className="h-screen bg-[#050505] text-zinc-400 p-4 lg:p-8 flex flex-col overflow-hidden font-sans">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/calendar" className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-white">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-white text-3xl font-black uppercase italic tracking-tighter">
              Extrato <span className="text-blue-500">Detalhado</span>
            </h1>
            {localDateFilter && (
              <p className="text-[10px] font-black text-blue-500 uppercase italic">
                Filtro Ativo: {format(parseISO(localDateFilter), "dd 'de' MMMM", { locale: ptBR })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* BOTÃO LIQUIDAR TUDO FILTRADO */}
          {hasPending && (
            <button 
              onClick={handlePayAllFiltered}
              className="flex-1 md:flex-none bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-5 py-3 rounded-xl font-black uppercase italic text-[11px] flex items-center justify-center gap-2 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/5"
            >
              <CheckCheck size={16} /> Liquidar Dia
            </button>
          )}

          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 md:flex-none bg-white text-black px-6 py-3 rounded-xl font-black uppercase italic text-[11px] flex items-center justify-center gap-2 hover:bg-blue-500 hover:text-white transition-all shadow-xl shadow-white/5"
          >
            <Plus size={16} /> Novo Lançamento
          </button>
        </div>
      </header>

      {/* BARRA DE FILTROS */}
      <div className="flex flex-wrap items-center gap-3 mb-6 shrink-0 bg-[#0f0f0f] border border-zinc-800/50 p-3 rounded-2xl">
        <div className="relative flex-1 min-w-[150  px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
          <input 
            type="text" 
            placeholder="Buscar descrição..."
            className="bg-white border border-zinc-800 rounded-lg py-2.5 pl-9 pr-4 text-[10px] text-black outline-none w-full focus:border-blue-500/50 transition-all uppercase font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="relative">
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
          <input 
            type="date" 
            className="bg-white rounded-lg py-2 pl-9 pr-3 text-[10px] font-black cursor-pointer"
            value={localDateFilter}
            onChange={(e) => handleDateChange(e.target.value)}
          />
        </div>

        <select 
          value={typeFilter}
          onChange={(e: any) => setTypeFilter(e.target.value)}
          className="bg-white rounded-lg py-2 pl-9 pr-3 text-[10px] font-black cursor-pointer"
        >
          <option value="ALL">Todos os Tipos</option>
          <option value="INCOME">Entradas (+)</option>
          <option value="EXPENSE">Saídas (-)</option>
        </select>

        <select 
          value={statusFilter}
          onChange={(e: any) => setStatusFilter(e.target.value)}
          className="bg-white rounded-lg py-2 pl-9 pr-3 text-[10px] font-black cursor-pointer"
        >
          <option value="ALL">Todos Status</option>
          <option value="PAID">Liquidado</option>
          <option value="PENDING">Pendente</option>
        </select>

        <select 
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="bg-white rounded-lg py-2 pl-9 pr-3 text-[10px] font-black cursor-pointer"
        >
          <option value="ALL">Todas as Contas</option>
          {uniqueMethods.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {(searchTerm || localDateFilter || typeFilter !== 'ALL' || statusFilter !== 'ALL' || methodFilter !== 'ALL') && (
          <button 
            onClick={() => {
              setSearchTerm("");
              handleDateChange("");
              setTypeFilter('ALL');
              setStatusFilter('ALL');
              setMethodFilter('ALL');
            }}
            className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
            title="Limpar filtros"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* TABELA */}
      <main className="flex-1 bg-[#0f0f0f] border border-zinc-800/50 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl">
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#0f0f0f] z-10 border-b border-zinc-800/50">
              <tr className="text-[9px] font-black uppercase text-zinc-600 italic tracking-[0.2em]">
                <th className="px-8 py-5">Data</th>
                <th className="px-8 py-5">Descrição</th>
                <th className="px-8 py-5">Conta / Forma</th>
                <th className="px-8 py-5 text-right">Valor</th>
                <th className="px-8 py-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/20">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="group hover:bg-white/[0.01] transition-colors">
                    <td className="px-8 py-4 text-[10px] font-bold text-zinc-500 uppercase italic">
                      {format(parseISO(t.date), 'dd/MM/yy', { locale: ptBR })}
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-zinc-200 uppercase tracking-tight">{t.description}</span>
                        <span className="text-[8px] font-bold text-zinc-700 uppercase italic">{t.category?.name || 'Sem Categoria'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-2">
                        <CreditCard size={12} className="text-zinc-600" />
                        <span className="text-[9px] font-black text-zinc-400 uppercase">{t.paymentMethod?.name || "Geral"}</span>
                      </div>
                    </td>
                    <td className={`px-8 py-4 text-right font-black text-xs italic ${t.type === 'INCOME' ? 'text-emerald-500' : 'text-white'}`}>
                      {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-8 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${
                        t.isPaid 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse'
                      }`}>
                        {t.isPaid ? 'OK' : 'PENDENTE'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-20 text-zinc-600 text-[10px] font-black uppercase italic tracking-widest">
                    Nenhum lançamento encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-xl bg-[#0f0f0f] border border-zinc-800 rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors p-2 z-10"
            >
              <X size={20} />
            </button>
            <div className="mt-4">
              <TransactionForm 
                onSuccess={() => {
                  setIsModalOpen(false);
                  fetchData();
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}