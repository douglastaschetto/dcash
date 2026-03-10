"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/services/api";
import { 
  Plus, Trash2, Edit3, X, Loader2, 
  ChevronLeft, ChevronRight, RefreshCw,
  CreditCard, Receipt, Wallet, Banknote, Tag, Calendar, Info
} from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

// --- COMPONENTE: MODAL DE CONTA FIXA ---
function FixedBillModal({ isOpen, onClose, onSave, initialData, paymentMethods, categories }: any) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    dayOfMonth: "10",
    paymentMethodType: "PIX",
    paymentMethodId: "", 
    categoryId: "",
    endDate: "" 
  });

  const creditCards = paymentMethods?.filter((m: any) => m.type === 'CREDIT_CARD') || [];

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          description: initialData.description,
          amount: initialData.amount.toString(),
          dayOfMonth: initialData.dayOfMonth.toString(),
          paymentMethodType: initialData.paymentMethodType || "PIX",
          paymentMethodId: initialData.paymentMethodId || "",
          categoryId: initialData.categoryId || "",
          endDate: initialData.endDate ? initialData.endDate.substring(0, 7) : "" 
        });
      } else {
        // Para novos lançamentos, sugere 12 meses por padrão
        setFormData({ 
          description: "", amount: "", dayOfMonth: "10", 
          paymentMethodType: "PIX", paymentMethodId: "", 
          categoryId: "", endDate: format(addMonths(new Date(), 12), 'yyyy-MM') 
        });
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);

    const isCard = formData.paymentMethodType === 'CREDIT_CARD';
    
    const payload = {
      ...formData,
      amount: Number(formData.amount),
      dayOfMonth: Number(formData.dayOfMonth),
      paymentMethodId: isCard ? formData.paymentMethodId : null,
      // Agora enviamos a data final independente do tipo
      endDate: formData.endDate ? `${formData.endDate}-28` : null 
    };

    try {
      await onSave(payload, initialData?.id); 
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-orange-500 text-sm font-bold appearance-none cursor-pointer";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="bg-[#111] border border-zinc-800 w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-zinc-900 flex justify-between items-center">
          <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">
            {initialData ? "Editar Plano Fixo" : "Novo Lançamento Fixo"}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* SEÇÃO 1: DADOS BÁSICOS */}
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-zinc-600 mb-2 block tracking-widest">O que é este gasto?</label>
              <input required className={inputClass} placeholder="Ex: Financiamento Carro, Netflix..." 
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-600 mb-2 block tracking-widest">Valor (R$)</label>
                <input type="number" step="0.01" required className={inputClass.replace("focus:border-orange-500", "focus:border-emerald-500")}
                  value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-600 mb-2 block tracking-widest">Dia do Venc.</label>
                <select className={inputClass.replace("focus:border-orange-500", "focus:border-blue-500")}
                  value={formData.dayOfMonth} onChange={e => setFormData({...formData, dayOfMonth: e.target.value})}>
                  {[...Array(31)].map((_, i) => <option key={i+1} value={i+1} className="bg-zinc-900">Todo dia {i+1}</option>)}
                </select>
              </div>
            </div>
          </div>

          <hr className="border-zinc-900" />

          {/* SEÇÃO 2: FORMA DE PAGAMENTO */}
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-orange-500 mb-2 block tracking-widest">Forma de Pagamento</label>
              <select className={`${inputClass} border-orange-500/20 bg-orange-500/5`}
                value={formData.paymentMethodType} 
                onChange={e => setFormData({...formData, paymentMethodType: e.target.value, paymentMethodId: ""})}>
                <option value="PIX" className="bg-zinc-900">PIX / TRANSFERÊNCIA</option>
                <option value="BOLETO" className="bg-zinc-900">BOLETO BANCÁRIO</option>
                <option value="CREDIT_CARD" className="bg-zinc-900">CARTÃO DE CRÉDITO</option>
                <option value="DEBIT_CARD" className="bg-zinc-900">DÉBITO AUTOMÁTICO</option>
              </select>
            </div>

            {/* Campos Dinâmicos Baseados na Forma de Pagamento */}
            {formData.paymentMethodType === 'CREDIT_CARD' ? (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-black uppercase text-zinc-600 mb-2 block tracking-widest">Qual Cartão?</label>
                <div className="relative">
                  <select required className={inputClass} value={formData.paymentMethodId} 
                    onChange={e => setFormData({...formData, paymentMethodId: e.target.value})}>
                    <option value="" className="bg-zinc-900">Selecione o cartão...</option>
                    {creditCards.map((card: any) => (
                      <option key={card.id} value={card.id} className="bg-zinc-900 uppercase">{card.name}</option>
                    ))}
                  </select>
                  <CreditCard size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500 pointer-events-none" />
                </div>
              </div>
            ) : (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-black uppercase text-zinc-600 mb-2 block tracking-widest">Categoria</label>
                <div className="relative">
                  <select required className={inputClass} value={formData.categoryId} 
                    onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                    <option value="" className="bg-zinc-900">Vincular Categoria...</option>
                    {categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id} className="bg-zinc-900 uppercase">{cat.name}</option>
                    ))}
                  </select>
                  <Tag size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* SEÇÃO 3: PROJEÇÃO (DATA FINAL) - FIXA PARA AMBOS */}
          <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-[2rem] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.15em] flex items-center gap-2">
                 <Calendar size={14} className="text-orange-500" /> Até quando lançar?
              </label>
            </div>
            <input 
              type="month" 
              className="w-full bg-black/40 border border-zinc-800 rounded-xl p-3 text-white font-bold outline-none focus:border-orange-500 transition-all cursor-pointer"
              value={formData.endDate} 
              onChange={e => setFormData({...formData, endDate: e.target.value})} 
            />
            <div className="flex items-start gap-2 pt-1">
              <Info size={12} className="text-zinc-600 mt-0.5" />
              <p className="text-[9px] text-zinc-600 leading-relaxed italic">
                O Dcash criará automaticamente os lançamentos mensais até o mês selecionado.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <button type="button" onClick={onClose} className="py-4 bg-zinc-900 text-zinc-500 text-[10px] font-black uppercase rounded-2xl hover:text-white transition-all">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="py-4 bg-white text-black hover:bg-orange-500 hover:text-white text-[10px] font-black uppercase rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-white/5">
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : (initialData ? "Atualizar" : "Gerar Lançamentos")}
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
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<{ open: boolean, data: any }>({ open: false, data: null });
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resBills, resMethods, resCats] = await Promise.all([
        api.get("/fixed-bills", { params: { month: currentMonth.getMonth() + 1, year: currentMonth.getFullYear() } }),
        api.get("/payment-methods"),
        api.get("/categories")
      ]);
      setBills(resBills.data);
      setPaymentMethods(resMethods.data);
      setCategories(resCats.data);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [currentMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (payload: any, id?: string) => {
    try {
      if (id) await api.patch(`/fixed-bills/${id}`, payload);
      else await api.post("/fixed-bills", payload);
      fetchData();
    } catch (error: any) { 
      const errorMsg = error.response?.data?.message || "Erro ao processar lançamentos.";
      alert(errorMsg); 
    }
  };

  const handleDelete = async (id: string) => {
    if (id.toString().startsWith('card-')) return;
    if (!confirm("Isso interromperá as projeções futuras não pagas. Confirmar?")) return;
    try {
      await api.delete(`/fixed-bills/${id}`);
      fetchData();
    } catch (error) { alert("Erro ao excluir."); }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-zinc-300 p-8">
      <div className="max-w-[1100px] mx-auto">
        <header className="mb-12 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">
              D<span className="text-orange-500 italic">C</span>ASH <span className="text-zinc-800">FIXED</span>
            </h1>
            <div className="h-1 w-12 bg-orange-500 mt-2 rounded-full" />
          </div>

          <div className="flex items-center gap-4 bg-[#111] border border-zinc-800 p-2 rounded-2xl shadow-2xl">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-zinc-800 rounded-xl transition-all text-zinc-500 hover:text-white"><ChevronLeft size={24} /></button>
            <div className="flex flex-col items-center min-w-[140px]">
               <span className="text-white text-xs font-black uppercase tracking-widest italic">{format(currentMonth, "MMMM", { locale: ptBR })}</span>
               <span className="text-[9px] text-zinc-600 font-bold tracking-[0.2em]">{format(currentMonth, "yyyy")}</span>
            </div>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-zinc-800 rounded-xl transition-all text-zinc-500 hover:text-white"><ChevronRight size={24} /></button>
          </div>
        </header>

        <div className="bg-[#111] border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
          {loading ? (
            <div className="py-40 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-orange-500" size={40} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">Calculando Projeções...</span>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-900/40 border-b border-zinc-800/50 text-[10px] uppercase font-black text-zinc-500 tracking-widest italic">
                  <th className="px-10 py-8">Descrição / Origem</th>
                  <th className="px-6 py-8">Dia</th>
                  <th className="px-6 py-8 text-right">Valor</th>
                  <th className="px-10 py-8 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50">
                {bills.map((bill: any) => (
                  <tr key={bill.id} className={`group transition-all ${bill.isCardAggregation ? 'bg-orange-500/[0.03]' : 'hover:bg-white/[0.01]'}`}>
                    <td className="px-10 py-7">
                      <div className="flex flex-col">
                        <span className="font-black text-white text-sm uppercase italic tracking-tighter group-hover:text-orange-500 transition-colors">
                          {bill.description}
                        </span>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${bill.isCardAggregation ? 'bg-orange-500/10 text-orange-500' : 'bg-zinc-800 text-zinc-500'} uppercase`}>
                            {bill.paymentMethodType}
                          </span>
                          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                            {bill.category?.name || (bill.isCardAggregation ? 'Fatura' : 'Geral')}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-7">
                      <div className="flex flex-col">
                        <span className="text-zinc-400 font-black text-[11px] italic leading-none">{bill.dayOfMonth}</span>
                        <span className="text-[8px] text-zinc-600 uppercase font-bold mt-1">Mensal</span>
                      </div>
                    </td>
                    <td className="px-6 py-7 text-right">
                      <span className="font-black text-white text-lg italic tracking-tighter">
                        R$ {Number(bill.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-10 py-7">
                      <div className="flex justify-center gap-3">
                        <button disabled={bill.isCardAggregation} onClick={() => setModalState({ open: true, data: bill })} 
                          className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-600 hover:text-white hover:border-orange-500 transition-all disabled:opacity-5">
                          <Edit3 size={16} />
                        </button>
                        <button disabled={bill.isCardAggregation} onClick={() => handleDelete(bill.id)} 
                          className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-600 hover:text-red-500 hover:border-red-500 transition-all disabled:opacity-5">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-10 flex justify-end">
          <button onClick={() => setModalState({ open: true, data: null })} 
            className="group bg-white text-black hover:bg-orange-500 hover:text-white px-12 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-4 shadow-2xl active:scale-95">
            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
            Novo Lançamento Fixo
          </button>
        </div>
      </div>

      <FixedBillModal 
        isOpen={modalState.open} 
        onClose={() => setModalState({ open: false, data: null })} 
        onSave={handleSave}
        initialData={modalState.data}
        paymentMethods={paymentMethods}
        categories={categories}
      />
    </div>
  );
}