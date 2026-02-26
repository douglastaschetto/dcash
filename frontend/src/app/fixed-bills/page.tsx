"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/services/api";
import { 
  Plus, Trash2, Edit3, Search, Filter, 
  CreditCard, Receipt, Loader2, X, Calendar, AlertCircle,
  ChevronLeft, ChevronRight, RefreshCw 
} from "lucide-react";
import { format, addMonths, subMonths, isBefore, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

// --- COMPONENTE: MODAL DE NOVA DESPESA FIXA ---
function NewFixedBillModal({ isOpen, onClose, onSave }: any) {
  const [categories, setCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    dayOfMonth: "10",
    categoryId: "",
    paymentMethodType: "PIX",
    endDate: "" // Usado apenas localmente para lógica de interface
  });

  useEffect(() => {
    if (isOpen) {
      api.get("/categories").then(res => {
        setCategories(res.data);
        if (res.data.length > 0 && !formData.categoryId) {
          setFormData(prev => ({ ...prev, categoryId: res.data[0].id }));
        }
      });
    }
  }, [isOpen, formData.categoryId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);

    // PAYLOAD RIGOROSO: Apenas campos da tabela fixed_bills
    const payload = {
      description: formData.description,
      amount: Number(formData.amount),
      dayOfMonth: Number(formData.dayOfMonth),
      categoryId: formData.categoryId,
      paymentMethodType: formData.paymentMethodType
    };

    try {
      // Passamos o formData completo para o onSave caso você queira 
      // usar o endDate para disparar outras rotas de transação no futuro
      await onSave(payload, formData.endDate); 
      
      setFormData({ description: "", amount: "", dayOfMonth: "10", categoryId: "", paymentMethodType: "PIX", endDate: "" });
      setIsRecurring(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="bg-[#111] border border-zinc-800 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-200">
        <div className="p-8 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/20">
          <div>
            <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Configurar Modelo</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">A conta será gerada mensalmente</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div>
            <label className="text-[10px] font-black uppercase text-zinc-600 mb-2 block tracking-widest">Descrição</label>
            <input required className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-orange-500 text-sm font-bold"
              placeholder="Ex: Internet Fixa" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-zinc-600 mb-2 block tracking-widest">Valor</label>
              <input type="number" step="0.01" required className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-emerald-500 text-sm font-black"
                value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-zinc-600 mb-2 block tracking-widest">Dia Vencimento</label>
              <select className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-blue-500 text-sm font-bold"
                value={formData.dayOfMonth} onChange={e => setFormData({...formData, dayOfMonth: e.target.value})}>
                {[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
              </select>
            </div>
          </div>

          {/* CONTROLE DE RECORRÊNCIA (VISUAL) */}
          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                 <RefreshCw size={14} className={isRecurring ? "text-orange-500 animate-spin" : ""} />
                 Até quando exibir?
               </span>
               <button 
                type="button"
                onClick={() => setIsRecurring(!isRecurring)}
                className={`w-10 h-5 rounded-full transition-all relative ${isRecurring ? "bg-orange-500" : "bg-zinc-700"}`}
               >
                 <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isRecurring ? "left-6" : "left-1"}`} />
               </button>
            </div>

            {isRecurring && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <input 
                  type="month" 
                  required={isRecurring}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white text-xs font-bold outline-none focus:border-orange-500"
                  value={formData.endDate}
                  onChange={e => setFormData({...formData, endDate: e.target.value})}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onClose} className="py-4 bg-zinc-900 text-zinc-500 text-[10px] font-black uppercase rounded-2xl">Sair</button>
            <button type="submit" disabled={isSubmitting} className="py-4 bg-white text-black hover:bg-orange-500 hover:text-white text-[10px] font-black uppercase rounded-2xl transition-all flex items-center justify-center gap-2">
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : "Salvar Modelo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- PÁGINA PRINCIPAL ---
export default function FixedBillsPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      // Passamos o mês atual para o backend. 
      // Se o seu backend respeitar a data final, ele já deve vir filtrado.
      const res = await api.get("/fixed-bills", {
        params: { 
          month: currentMonth.getMonth() + 1, 
          year: currentMonth.getFullYear() 
        }
      });
      setBills(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  const handleSave = async (payload: any, endDate: string) => {
    try {
      // 1. Grava o modelo na fixed_bills (sem endDate e sem isRecurring)
      await api.post("/fixed-bills", payload);
      
      // 2. Se houver um endDate, você pode disparar aqui o processo que gera as parcelas
      // ex: await api.post("/generate-transactions", { ...payload, endDate });

      await fetchBills();
      setIsModalOpen(false);
    } catch (error) {
      alert("Erro ao salvar.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir modelo?")) return;
    await api.delete(`/fixed-bills/${id}`);
    fetchBills();
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-zinc-300 p-8">
      <div className="max-w-[1200px] mx-auto">
        
        <header className="mb-10 flex items-center justify-between">
          <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">
            Contas <span className="text-orange-500">Fixas</span>
          </h1>

          {/* SELETOR DE MÊS */}
          <div className="flex items-center gap-3 bg-[#161616] border border-zinc-800 p-2 rounded-2xl">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-zinc-800 rounded-xl transition-all">
              <ChevronLeft size={20} />
            </button>
            <span className="text-white text-xs font-black uppercase tracking-widest min-w-[120px] text-center">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-zinc-800 rounded-xl transition-all">
              <ChevronRight size={20} />
            </button>
          </div>
        </header>

        <div className="bg-[#161616] border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-900/40 border-b border-zinc-800 text-[10px] uppercase font-black text-zinc-500 tracking-widest italic">
                  <th className="px-8 py-6">Descrição</th>
                  <th className="px-6 py-6">Vencimento</th>
                  <th className="px-6 py-6 text-right">Valor</th>
                  <th className="px-8 py-6 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50">
                {bills.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center opacity-20 font-black uppercase italic text-xs">
                      Nenhuma conta fixa para este período
                    </td>
                  </tr>
                ) : (
                  bills.map((bill: any) => (
                    <tr key={bill.id} className="hover:bg-white/[0.01] transition-all group">
                      <td className="px-8 py-5 font-black text-white text-sm uppercase italic tracking-tighter">
                        {bill.description}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-blue-400 font-bold text-xs bg-blue-400/5 px-3 py-1.5 rounded-lg w-fit">
                          Todo dia {bill.dayOfMonth}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right font-black text-white text-base italic tracking-tighter">
                        R$ {Number(bill.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-8 py-5 flex justify-center">
                        <button onClick={() => handleDelete(bill.id)} className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-red-500/50 rounded-xl text-zinc-500 hover:text-red-500 transition-all">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-8 flex justify-end">
          <button onClick={() => setIsModalOpen(true)} className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-orange-600 transition-all">
            + Adicionar Nova
          </button>
        </div>
      </div>

      <NewFixedBillModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} />
    </div>
  );
}