"use client";

import { useState, useEffect } from "react";
import api  from "@/services/api";
import { Tag, X, Trash2, Search, Plus, Check } from "lucide-react";

// Curadoria de ícones coloridos (Emojis) por temas
const EMOJI_LIST = [
  { group: "Gastos", items: ["🍕", "🛒", "🏠", "🚗", "👕", "💊", "🎮", "✈️", "🍿"] },
  { group: "Ganhos", items: ["💰", "🏦", "📈", "💵", "💎", "🏢", "🧧", "💼", "💸"] },
  { group: "Outros", items: ["📂", "🎁", "🐾", "📚", "🔧", "🔋", "🛡️", "🎯", "🌟"] }
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // States do formulário
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [icone, setIcone] = useState("📂");
  const [cor, setCor] = useState("#3b82f6");

  const fetchCategories = async () => {
    const res = await api.get("/categories");
    setCategories(res.data);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreate = async () => {
    if (!nome) return;
    try {
      await api.post("/categories", { name: nome, type: tipo, color: cor, icon: icone });
      setNome("");
      fetchCategories();
    } catch (e) { alert("Erro ao criar."); }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-400 p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Minimalista */}
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800">
              <Tag size={20} className="text-zinc-100" />
            </div>
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight italic uppercase">Categorias</h1>
          </div>
          <button className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-100 transition-colors flex items-center gap-2">
            <X size={14} /> Fechar
          </button>
        </header>

        {/* Card de Cadastro Clean & Alinhado */}
        <section className="bg-[#0f0f0f] border border-zinc-800/50 rounded-[2rem] p-8 mb-12 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Seletor de Ícone e Cor */}
            <div className="md:col-span-2 flex gap-3">
              <div className="relative flex-1">
                <button 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-full h-14 bg-zinc-900 border border-zinc-800 rounded-2xl text-2xl flex items-center justify-center hover:bg-zinc-800 transition-all"
                >
                  {icone}
                </button>
                {showEmojiPicker && (
                  <div className="absolute top-16 left-0 w-64 bg-[#141414] border border-zinc-800 rounded-2xl p-4 z-50 shadow-2xl">
                    {EMOJI_LIST.map(group => (
                      <div key={group.group} className="mb-3">
                        <p className="text-[9px] font-black uppercase text-zinc-600 mb-2 tracking-widest">{group.group}</p>
                        <div className="grid grid-cols-5 gap-2">
                          {group.items.map(e => (
                            <button key={e} onClick={() => { setIcone(e); setShowEmojiPicker(false); }} className="text-xl p-1 hover:bg-zinc-800 rounded-lg transition-colors">{e}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <input 
                type="color" value={cor} onChange={(e) => setCor(e.target.value)}
                className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl p-1 cursor-pointer appearance-none"
              />
            </div>

            {/* Input de Nome */}
            <div className="md:col-span-6">
              <input 
                value={nome} onChange={(e) => setNome(e.target.value)}
                placeholder="Nome da categoria..."
                className="w-full h-14 bg-zinc-900 border border-zinc-800 rounded-2xl px-6 text-zinc-100 font-medium outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-700"
              />
            </div>

            {/* Seletor de Tipo (Expense/Income) */}
            <div className="md:col-span-4 flex bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800">
              <button 
                onClick={() => setTipo("EXPENSE")}
                className={`flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tipo === "EXPENSE" ? "bg-zinc-800 text-red-500" : "text-zinc-600 hover:text-zinc-400"}`}
              >
                Despesa
              </button>
              <button 
                onClick={() => setTipo("INCOME")}
                className={`flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tipo === "INCOME" ? "bg-zinc-800 text-emerald-500" : "text-zinc-600 hover:text-zinc-400"}`}
              >
                Receita
              </button>
            </div>
          </div>

          {/* Botão de Salvar Minimalista (Canto Inferior) */}
          <div className="mt-8 flex justify-start">
            <button 
              onClick={handleCreate}
              className="h-11 px-8 bg-zinc-100 hover:bg-white text-black font-black uppercase text-[10px] tracking-[0.2em] rounded-xl transition-all flex items-center gap-2"
            >
              <Check size={14} /> Salvar Categoria
            </button>
          </div>
        </section>

        {/* Lista de Categorias - Estilo Notion Table */}
        <div className="space-y-2">
          <div className="px-6 py-2 flex text-[9px] font-black uppercase text-zinc-600 tracking-[0.3em]">
            <span className="flex-1">Identificação</span>
            <span className="w-32 text-center">Tipo</span>
            <span className="w-20 text-right">Ação</span>
          </div>
          
          {categories.map((cat: any) => (
            <div 
              key={cat.id}
              className="group bg-[#0f0f0f] hover:bg-[#141414] border border-zinc-800/40 p-5 rounded-2xl flex items-center transition-all"
            >
              <div className="flex-1 flex items-center gap-4">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm border border-zinc-800/50"
                  style={{ backgroundColor: `${cat.color}10` }}
                >
                  {cat.icon}
                </div>
                <span className="font-bold text-zinc-100 text-sm tracking-tight">{cat.name}</span>
              </div>

              <div className="w-32 flex justify-center">
                <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                  cat.type === "INCOME" ? "border-emerald-500/20 text-emerald-500 bg-emerald-500/5" : "border-red-500/20 text-red-500 bg-red-500/5"
                }`}>
                  {cat.type === "INCOME" ? "Receita" : "Despesa"}
                </span>
              </div>

              <div className="w-20 flex justify-end">
                <button 
                  onClick={() => api.delete(`/categories/${cat.id}`).then(fetchCategories)}
                  className="p-2 text-zinc-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}