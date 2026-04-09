"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/services/api";
import { 
  Plus, Search, X, ArrowLeft, 
  CreditCard, Calendar as CalendarIcon, CheckCheck,
  Edit3, Trash2, Loader2
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
  paymentMethodId?: string;
  categoryId?: string;
  paymentMethod?: { name: string };
  category?: { name: string };
}

function TransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [localDateFilter, setLocalDateFilter] = useState(dateParam || "");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/transactions");
      setTransactions(res.data);
    } catch (error) {
      console.error("Erro ao buscar transações", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const handleDateChange = (newDate: string) => {
    setLocalDateFilter(newDate);
    const params = new URLSearchParams(searchParams.toString());
    if (newDate) params.set("date", newDate);
    else params.delete("date");
    router.push(`?${params.toString()}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este registro?")) return;
    try {
      await api.delete(`/transactions/${id}`);
      fetchData();
    } catch (error) {
      alert("Erro ao excluir transação.");
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

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

  const uniqueMethods = useMemo(() => {
    const methods = transactions.map(t => t.paymentMethod?.name).filter(Boolean);
    return Array.from(new Set(methods));
  }, [transactions]);

  return (
    <div className="h-screen bg-[#050505] text-zinc-400 p-4 md:p-8 flex flex-col overflow-hidden font-sans">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/calendar" className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-white">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-white text-2xl md:text-3xl font-black uppercase italic tracking-tighter leading-none">
              Extrato <span className="text-blue-500">Detalhado</span>
            </h1>
          </div>
        </div>

        <button 
          onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
          className="w-full md:w-auto bg-white text-black px-6 py-4 rounded-2xl font-black uppercase italic text-[11px] flex items-center justify-center gap-2 shadow-xl hover:bg-blue-500 hover:text-white transition-all"
        >
          <Plus size={16} /> Novo Lançamento
        </button>
      </header>

      {/* FILTROS COM SCROLL LATERAL NO MOBILE */}
      <div className="flex overflow-x-auto gap-3 mb-6 shrink-0 pb-2 no-scrollbar">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
          <input 
            type="text" 
            placeholder="BUSCAR DESCRIÇÃO..."
            className="bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-9 pr-4 text-[10px] text-white outline-none w-full focus:border-blue-500 font-bold uppercase"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <input 
          type="date" 
          className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 text-[10px] font-black text-zinc-400 outline-none focus:border-blue-500"
          value={localDateFilter}
          onChange={(e) => handleDateChange(e.target.value)}
        />
        <select 
          value={statusFilter}
          onChange={(e: any) => setStatusFilter(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 text-[10px] font-black text-zinc-400 outline-none"
        >
          <option value="ALL">STATUS</option>
          <option value="PAID">LIQUIDADO</option>
          <option value="PENDING">PENDENTE</option>
        </select>
        
        {/* Botão Limpar Filtros rápido */}
        {(searchTerm || localDateFilter || statusFilter !== 'ALL') && (
          <button 
            onClick={() => { setSearchTerm(""); handleDateChange(""); setStatusFilter("ALL"); }}
            className="p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <main className="flex-1 bg-[#0f0f0f] border border-zinc-800/50 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl relative">
        {loading && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-20 flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        )}

        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="sticky top-0 bg-[#0f0f0f] z-10 border-b border-zinc-800/50">
              <tr className="text-[9px] font-black uppercase text-zinc-600 italic tracking-[0.2em]">
                <th className="px-6 py-5">Informações</th>
                <th className="px-6 py-5 text-right">Valor</th>
                <th className="px-6 py-5 text-center">Status</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/10">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-zinc-200 uppercase tracking-tight leading-none mb-1.5">
                          {t.description}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-[8px] font-bold text-zinc-500 uppercase italic">
                            {format(parseISO(t.date), 'dd MMM yy', { locale: ptBR })}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-zinc-800" />
                          <span className="text-[8px] font-black text-blue-500/60 uppercase">
                            {t.paymentMethod?.name || "Geral"}
                          </span>
                          {t.category && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-zinc-800" />
                              <span className="text-[8px] font-bold text-zinc-600 uppercase italic">
                                {t.category.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-right font-black text-xs italic ${t.type === 'INCOME' ? 'text-emerald-500' : 'text-white'}`}>
                      {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase border ${
                        t.isPaid 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse'
                      }`}>
                        {t.isPaid ? 'OK' : 'PENDENTE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* Botões sempre visíveis para facilitar touch no mobile */}
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(t)}
                          className="p-2.5 bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-blue-500 hover:border-blue-500/30 rounded-xl transition-all active:scale-90"
                          title="Editar"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(t.id)}
                          className="p-2.5 bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-red-500 hover:border-red-500/30 rounded-xl transition-all active:scale-90"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-24 text-zinc-700 text-[10px] font-black uppercase italic tracking-[0.3em]">
                    Nenhum registro encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* MODAL - Ajustado para mobile com backdrop mais escuro */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
          <div 
            className="absolute inset-0 bg-black/95 backdrop-blur-md" 
            onClick={() => setIsModalOpen(false)} 
          />
          <div className="relative w-full max-w-xl bg-[#0f0f0f] border-t md:border border-zinc-800 rounded-t-[2.5rem] md:rounded-[3rem] p-8 md:p-12 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom duration-300">
            {/* Indicador de "puxar" para fechar no mobile */}
            <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-6 md:hidden" />
            
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-6 right-6 text-zinc-600 hover:text-white transition-colors p-2"
            >
              <X size={20} />
            </button>
            
            <TransactionForm 
              initialData={editingTransaction}
              onSuccess={() => {
                setIsModalOpen(false);
                fetchData();
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-[#050505] flex items-center justify-center text-zinc-600 font-black uppercase italic text-[10px] tracking-widest">
        Carregando Extrato...
      </div>
    }>
      <TransactionsContent />
    </Suspense>
  );
}