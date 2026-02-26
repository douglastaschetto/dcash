"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import { 
  Plus, 
  PiggyBank, 
  CreditCard, 
  CalendarDays, 
  CheckCircle2, 
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet
} from "lucide-react";

interface TransactionFormProps {
  onSuccess: () => void;
}

export default function TransactionForm({ onSuccess }: TransactionFormProps) {
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [piggyBanks, setPiggyBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Controle de parcelamento
  const [installments, setInstallments] = useState(1);
  const [isCreditSelected, setIsCreditSelected] = useState(false);

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    view: "EXPENSE", // Alterna entre EXPENSE, INCOME, PIGGY na UI
    categoryId: "",
    paymentMethodId: "",
    piggyBankId: "",
    date: new Date().toISOString().split('T')[0]
  });

  // Busca dados iniciais para os selects e botões
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [c, pm, pb] = await Promise.all([
          api.get("/categories"),
          api.get("/payment-methods"),
          api.get("/piggy-banks")
        ]);
        setCategories(c.data);
        setPaymentMethods(pm.data);
        setPiggyBanks(pb.data);
      } catch (error) {
        console.error("Erro ao carregar dados do formulário:", error);
      }
    };
    fetchData();
  }, []);

  const handleMethodSelect = (method: any) => {
    setFormData({ ...formData, paymentMethodId: method.id, piggyBankId: "" });
    // Define se exibe parcelamento: Tipos que contenham 'CREDIT'
    const isCredit = method.type?.includes("CREDIT");
    setIsCreditSelected(isCredit);
    if (!isCredit) setInstallments(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: formData.date,
        categoryId: formData.categoryId,
        // No banco, aporte em cofrinho é registrado como saída (EXPENSE)
        type: formData.view === "PIGGY" ? "EXPENSE" : formData.view,
        paymentMethodId: formData.view === "PIGGY" ? undefined : formData.paymentMethodId,
        piggyBankId: formData.view === "PIGGY" ? formData.piggyBankId : undefined,
        installments: isCreditSelected && formData.view === "EXPENSE" ? installments : 1,
      };

      await api.post("/transactions", payload);
      onSuccess(); // Fecha modal e recarrega dashboard
    } catch (error) {
      console.error(error);
      alert("Erro ao processar transação. Verifique os dados.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
      
      {/* SELETOR DE TIPO (ABAS) */}
      <div className="flex bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-800 shadow-inner">
        {[
          { id: "EXPENSE", label: "Despesa", icon: <ArrowDownCircle size={14}/>, color: "bg-red-500" },
          { id: "INCOME", label: "Receita", icon: <ArrowUpCircle size={14}/>, color: "bg-emerald-500" },
          { id: "PIGGY", label: "Cofrinho", icon: <PiggyBank size={14}/>, color: "bg-pink-600" }
        ].map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => {
              setFormData({ ...formData, view: type.id, paymentMethodId: "", piggyBankId: "" });
              setIsCreditSelected(false);
            }}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${
              formData.view === type.id ? `${type.color} text-white shadow-lg` : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {type.icon} {type.label}
          </button>
        ))}
      </div>

      {/* INPUTS PRINCIPAIS */}
      <div className="space-y-4">
        <div className="relative">
          <input
            placeholder="O que foi esse lançamento?"
            className="w-full h-14 bg-zinc-900 border border-zinc-800 rounded-2xl px-6 text-white outline-none focus:border-zinc-600 transition-all font-medium"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-600">R$</span>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              className="w-full h-14 bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-6 text-white font-bold outline-none focus:border-zinc-600"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>
          <input
            type="date"
            className="bg-zinc-900 border border-zinc-800 rounded-2xl px-6 text-white text-[10px] font-bold outline-none focus:border-zinc-600"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />
        </div>
      </div>

      {/* SELEÇÃO DINÂMICA (MEIO OU COFRINHO) */}
      <div className="space-y-3">
        <label className="text-[10px] font-black uppercase text-zinc-600 ml-2 italic tracking-widest">
          {formData.view === "PIGGY" ? "Qual o cofrinho de destino?" : "Forma de Pagamento / Recebimento"}
        </label>
        
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          {formData.view === "PIGGY" ? (
            piggyBanks.map((p: any) => (
              <button 
                key={p.id} 
                type="button" 
                onClick={() => setFormData({ ...formData, piggyBankId: p.id })}
                className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                  formData.piggyBankId === p.id 
                  ? "border-pink-500 bg-pink-500/10 text-pink-500 shadow-[0_0_15px_rgba(219,39,119,0.1)]" 
                  : "border-zinc-800 bg-zinc-900/40 text-zinc-600 hover:border-zinc-700"
                }`}
              >
                <PiggyBank size={16} />
                <span className="text-[9px] font-black uppercase truncate">{p.name}</span>
              </button>
            ))
          ) : (
            paymentMethods.map((m: any) => (
              <button 
                key={m.id} 
                type="button" 
                onClick={() => handleMethodSelect(m)}
                className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                  formData.paymentMethodId === m.id 
                  ? "border-blue-500 bg-blue-500/10 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                  : "border-zinc-800 bg-zinc-900/40 text-zinc-600 hover:border-zinc-700"
                }`}
              >
                <div className="flex justify-between items-center">
                  <CreditCard size={16} />
                  {m.type?.includes("CREDIT") && <span className="text-[7px] bg-blue-600 text-white px-1 rounded">CRED</span>}
                </div>
                <span className="text-[9px] font-black uppercase truncate">{m.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ÁREA DE PARCELAMENTO (APENAS CRÉDITO + DESPESA) */}
      {isCreditSelected && formData.view === "EXPENSE" && (
        <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-3xl space-y-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-300">
              <CalendarDays size={16} className="text-blue-500" />
              <span className="text-[10px] font-black uppercase italic">Parcelar despesa</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-zinc-600 uppercase">Vezes:</span>
              <input 
                type="number"
                min="1"
                max="72"
                className="w-14 h-9 bg-zinc-800 border border-zinc-700 rounded-xl text-center text-white font-black outline-none focus:border-blue-500"
                value={installments}
                onChange={(e) => setInstallments(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>
          {installments > 1 && formData.amount && (
            <div className="pt-3 border-t border-zinc-800/50 flex justify-between items-center text-[10px]">
              <span className="font-bold text-zinc-600 uppercase">Estimativa mensal:</span>
              <span className="font-black text-white italic tracking-tighter">
                R$ {(Number(formData.amount) / installments).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* CATEGORIA */}
      <div className="space-y-3">
        <label className="text-[10px] font-black uppercase text-zinc-600 ml-2 italic tracking-widest">Categoria</label>
        <select 
          className="w-full h-14 bg-zinc-900 border border-zinc-800 rounded-2xl px-6 text-xs text-white outline-none focus:border-zinc-600 appearance-none"
          value={formData.categoryId} 
          onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })} 
          required
        >
          <option value="">Selecione...</option>
          {categories.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* BOTÃO DE ENVIO */}
      <button 
        disabled={loading}
        className="w-full py-5 bg-white text-black rounded-3xl font-black uppercase text-[11px] hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <><CheckCircle2 size={18}/> Salvar Lançamento</>
        )}
      </button>
    </form>
  );
}