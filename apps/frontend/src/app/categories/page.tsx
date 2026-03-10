"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { Tag, X, Trash2, Check, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
  type: "EXPENSE" | "INCOME";
  icon: string;
  color: string;
}

const EMOJI_LIST = [
  { group: "Gastos", items: ["🍕", "🛒", "🏠", "🚗", "👕", "💊", "🎮", "✈️", "🍿", "⛽", "🍔"] },
  { group: "Ganhos", items: ["💰", "🏦", "📈", "💵", "💎", "🏢", "🧧", "💼", "💸", "🪙", "🚀"] },
  { group: "Outros", items: ["📂", "🎁", "🐾", "📚", "🔧", "🔋", "🛡️", "🎯", "🌟", "🔥", "🌈"] }
];

export default function CategoriesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Controle de interface
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // States do formulário
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [icone, setIcone] = useState("📂");
  const [cor, setCor] = useState("#3b82f6");

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/categories");
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Erro ao carregar categorias:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchCategories(); 
  }, [fetchCategories]);

  const handleCreate = async () => {
    if (!nome.trim()) return;
    
    setActionLoading(true);
    setErrorMsg(null);
    
    try {
      // O seu backend extrai o familyGroupId automaticamente via userId do token
      await api.post("/categories", { 
        name: nome, 
        type: tipo, 
        color: cor, 
        icon: icone 
      });
      
      setNome("");
      setIcone("📂");
      setCor("#3b82f6");
      await fetchCategories();
    } catch (e: any) { 
      const msg = e.response?.data?.message || "Erro ao salvar categoria.";
      setErrorMsg(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta categoria?")) return;
    try {
      await api.delete(`/categories/${id}`);
      await fetchCategories();
    } catch (e) {
      alert("Erro ao excluir. Verifique se existem transações vinculadas.");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-400 p-4 lg:p-8 font-sans pb-24">
      <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 shadow-lg shadow-black">
              <Tag size={20} className="text-emerald-500" />
            </div>
            <div>
              <h1 className="text-xl font-black text-zinc-100 tracking-tight italic uppercase leading-none">Categorias</h1>
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] mt-1">Personalização do Sistema</p>
            </div>
          </div>
          <button 
            onClick={() => router.back()}
            className="text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors flex items-center gap-2 bg-zinc-900/50 px-4 py-2 rounded-xl border border-white/5"
          >
            <X size={14} /> Voltar
          </button>
        </header>

        {/* Card de Cadastro (REMOVIDO overflow-hidden para o picker funcionar) */}
        <section className="bg-[#0f0f0f] border border-zinc-800/50 rounded-[2.5rem] p-8 mb-12 shadow-2xl relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full pointer-events-none" />
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end relative z-20">
            
            {/* Ícone e Cor */}
            <div className="md:col-span-3">
              <p className="text-[9px] font-black uppercase text-zinc-600 mb-2 tracking-widest ml-1">Estética</p>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <button 
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-full h-14 bg-black border border-zinc-800 rounded-2xl text-2xl flex items-center justify-center hover:border-zinc-500 transition-all active:scale-95 shadow-inner"
                  >
                    {icone}
                  </button>

                  {showEmojiPicker && (
                    <>
                      {/* Overlay para fechar ao clicar fora */}
                      <div className="fixed inset-0 z-[60]" onClick={() => setShowEmojiPicker(false)} />
                      <div className="absolute top-full mt-2 left-0 w-72 bg-[#141414] border border-zinc-800 rounded-2xl p-4 z-[70] shadow-[0_20px_50px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-200">
                        <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                          {EMOJI_LIST.map(group => (
                            <div key={group.group} className="mb-3 last:mb-0">
                              <p className="text-[9px] font-black uppercase text-zinc-500 mb-2 border-b border-zinc-800/50 pb-1">{group.group}</p>
                              <div className="grid grid-cols-5 gap-2">
                                {group.items.map(e => (
                                  <button 
                                    key={e} 
                                    type="button"
                                    onClick={() => { setIcone(e); setShowEmojiPicker(false); }} 
                                    className="text-xl p-2 hover:bg-zinc-800 rounded-xl transition-all hover:scale-110 active:scale-90 flex items-center justify-center"
                                  >
                                    {e}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="relative w-14 h-14 bg-black border border-zinc-800 rounded-2xl p-1 overflow-hidden group hover:border-zinc-500 transition-all">
                  <input 
                    type="color" 
                    value={cor} 
                    onChange={(e) => setCor(e.target.value)}
                    className="absolute inset-0 w-full h-full cursor-pointer opacity-0 z-10"
                  />
                  <div className="w-full h-full rounded-xl border border-white/5" style={{ backgroundColor: cor }} />
                </div>
              </div>
            </div>

            {/* Nome */}
            <div className="md:col-span-5">
              <p className="text-[9px] font-black uppercase text-zinc-600 mb-2 tracking-widest ml-1">Nome da Categoria</p>
              <input 
                value={nome} 
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Lazer, Alimentação..."
                className="w-full h-14 bg-black border border-zinc-800 rounded-2xl px-6 text-zinc-100 font-bold outline-none focus:border-emerald-500/50 transition-all text-sm"
              />
            </div>

            {/* Tipo */}
            <div className="md:col-span-4">
              <p className="text-[9px] font-black uppercase text-zinc-600 mb-2 tracking-widest ml-1">Fluxo</p>
              <div className="flex bg-black p-1.5 rounded-2xl border border-zinc-800">
                <button 
                  type="button"
                  onClick={() => setTipo("EXPENSE")} 
                  className={`flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tipo === "EXPENSE" ? "bg-zinc-900 text-red-500 shadow-lg" : "text-zinc-700"}`}
                >
                  Despesa
                </button>
                <button 
                  type="button"
                  onClick={() => setTipo("INCOME")} 
                  className={`flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tipo === "INCOME" ? "bg-zinc-900 text-emerald-500 shadow-lg" : "text-zinc-700"}`}
                >
                  Receita
                </button>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-[10px] font-black uppercase italic animate-bounce">
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button 
              onClick={handleCreate}
              disabled={!nome || actionLoading}
              className="h-12 px-10 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl transition-all flex items-center gap-3 shadow-lg active:scale-95 shadow-emerald-500/10"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
              Confirmar Categoria
            </button>
          </div>
        </section>

        {/* Lista */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-full flex justify-center py-20 text-zinc-800"><Loader2 className="animate-spin" size={32} /></div>
          ) : (
            categories.map((cat) => (
              <div 
                key={cat.id} 
                className="group bg-[#0f0f0f] border border-zinc-800/40 p-4 rounded-3xl flex items-center justify-between hover:border-zinc-700 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border border-zinc-800/50 shadow-inner" 
                    style={{ backgroundColor: `${cat.color}15` }}
                  >
                    {cat.icon}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-zinc-100 text-sm tracking-tight uppercase italic">{cat.name}</span>
                    <span className={`text-[8px] font-bold uppercase tracking-widest ${cat.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {cat.type === 'INCOME' ? 'Receita' : 'Despesa'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(cat.id)} 
                  className="p-3 text-zinc-800 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}