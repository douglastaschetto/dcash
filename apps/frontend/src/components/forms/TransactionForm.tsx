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
  Edit3
} from "lucide-react";

interface TransactionFormProps {
  onSuccess: () => void;
  initialData?: any; 
}

export default function TransactionForm({ onSuccess, initialData }: TransactionFormProps) {
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [piggyBanks, setPiggyBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [installments, setInstallments] = useState(1);
  const [isCreditSelected, setIsCreditSelected] = useState(false);
  const [displayAmount, setDisplayAmount] = useState("0,00");

  const [formData, setFormData] = useState({
    description: "",
    amount: 0,
    view: "EXPENSE",
    categoryId: "",
    paymentMethodId: "",
    piggyBankId: "",
    date: new Date().toISOString().split('T')[0]
  });

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    const numericValue = Number(value) / 100;
    
    const formatted = new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);

    setDisplayAmount(formatted);
    setFormData({ ...formData, amount: numericValue });
  };

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
        console.error("Erro ao carregar dados:", error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (initialData) {
      const val = initialData.amount || 0;
      setFormData({
        description: initialData.description || "",
        amount: val,
        view: initialData.piggyBankId ? "PIGGY" : initialData.type,
        categoryId: initialData.categoryId || "",
        paymentMethodId: initialData.paymentMethodId || "",
        piggyBankId: initialData.piggyBankId || "",
        date: initialData.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0]
      });

      setDisplayAmount(new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
      }).format(val));

      if (initialData.paymentMethod?.type?.includes("CREDIT")) setIsCreditSelected(true);
    }
  }, [initialData]);

  const handleMethodSelect = (method: any) => {
    setFormData({ ...formData, paymentMethodId: method.id, piggyBankId: "" });
    const isCredit = method.type?.includes("CREDIT");
    setIsCreditSelected(isCredit);
    if (!isCredit) setInstallments(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0) {
      alert("Insira um valor maior que zero.");
      return;
    }
    setLoading(true);

    try {
      // CONSTRUÇÃO DO PAYLOAD LIMPO (Correção do Erro)
      const payload = {
        description: formData.description,
        amount: formData.amount,
        date: formData.date,
        categoryId: formData.categoryId,
        type: formData.view === "PIGGY" ? "EXPENSE" : formData.view,
        // Garante null em vez de string vazia para as FKs do banco
        paymentMethodId: formData.view === "PIGGY" ? null : (formData.paymentMethodId || null),
        piggyBankId: formData.view === "PIGGY" ? (formData.piggyBankId || null) : null,
        installments: (isCreditSelected && formData.view === "EXPENSE") ? installments : 1,
      };

      if (initialData?.id) {
        await api.patch(`/transactions/${initialData.id}`, payload);
      } else {
        await api.post("/transactions", payload);
      }
      onSuccess();
    } catch (error: any) {
      console.error("Erro no envio:", error.response?.data || error.message);
      alert(error.response?.data?.message || "Erro ao salvar transação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
      <div className="mb-2">
        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
          {initialData ? <Edit3 size={20} className="text-blue-500" /> : <Plus size={20} className="text-emerald-500" />}
          {initialData ? "Editar Lançamento" : "Novo Lançamento"}
        </h2>
      </div>

      {/* SELETOR DE TIPO */}
      <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800 shadow-inner">
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

      <div className="space-y-4">
        <input
          placeholder="O que foi esse lançamento?"
          className="w-full h-14 bg-zinc-950 border border-zinc-800 rounded-2xl px-6 text-white outline-none focus:border-emerald-500 transition-all font-medium"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-600 italic">R$</span>
            <input
              type="text"
              inputMode="numeric"
              className="w-full h-14 bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-6 text-white font-black outline-none focus:border-emerald-500 text-lg"
              value={displayAmount}
              onChange={handleAmountChange}
              required
            />
          </div>
          <input
            type="date"
            className="bg-zinc-950 border border-zinc-800 rounded-2xl px-6 text-white text-[10px] font-black outline-none focus:border-emerald-500 uppercase"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />
        </div>
      </div>

      {/* SELEÇÃO DINÂMICA */}
      <div className="space-y-3">
        <label className="text-[10px] font-black uppercase text-zinc-600 ml-2 italic tracking-widest">
          {formData.view === "PIGGY" ? "Destino" : "Pagamento / Recebimento"}
        </label>
        
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
          {formData.view === "PIGGY" ? (
            piggyBanks.map((p: any) => (
              <button 
                key={p.id} type="button" 
                onClick={() => setFormData({ ...formData, piggyBankId: p.id })}
                className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                  formData.piggyBankId === p.id ? "border-pink-500 bg-pink-500/10 text-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.1)]" : "border-zinc-800 bg-zinc-950 text-zinc-600"
                }`}
              >
                <PiggyBank size={16} />
                <span className="text-[9px] font-black uppercase truncate">{p.name}</span>
              </button>
            ))
          ) : (
            paymentMethods.map((m: any) => (
              <button 
                key={m.id} type="button" 
                onClick={() => handleMethodSelect(m)}
                className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                  formData.paymentMethodId === m.id ? "border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "border-zinc-800 bg-zinc-950 text-zinc-600"
                }`}
              >
                <div className="flex justify-between items-center">
                  <CreditCard size={16} />
                  {m.type?.includes("CREDIT") && <span className="text-[7px] bg-blue-600 text-white px-1 rounded font-black tracking-tighter">CRED</span>}
                </div>
                <span className="text-[9px] font-black uppercase truncate">{m.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* PARCELAMENTO */}
      {isCreditSelected && formData.view === "EXPENSE" && !initialData && (
        <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-3xl flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-zinc-300">
            <CalendarDays size={16} className="text-blue-500" />
            <span className="text-[10px] font-black uppercase italic">Parcelar</span>
          </div>
          <input 
            type="number"
            min="1"
            className="w-14 h-9 bg-zinc-900 border border-zinc-700 rounded-xl text-center text-white font-black outline-none focus:border-blue-500"
            value={installments}
            onChange={(e) => setInstallments(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>
      )}

      {/* CATEGORIA */}
      <div className="space-y-3">
        <label className="text-[10px] font-black uppercase text-zinc-600 ml-2 italic tracking-widest">Categoria</label>
        <select 
          className="w-full h-14 bg-zinc-950 border border-zinc-800 rounded-2xl px-6 text-xs text-white outline-none focus:border-emerald-500 appearance-none font-bold uppercase"
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

      <button 
        disabled={loading}
        className="w-full py-5 bg-white text-black rounded-3xl font-black uppercase text-[11px] hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle2 size={18}/> Salvar Lançamento</>}
      </button>
    </form>
  );
}