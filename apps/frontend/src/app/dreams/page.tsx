"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import { 
  Plus, Trash2, Edit3, Calendar, DollarSign, X, Loader2, 
  Image as ImageIcon, CheckCircle2, Target, Wallet, ListChecks, Settings2 
} from "lucide-react";

interface Dream {
  id: string;
  title: string;
  targetValue: number;
  savedValue: number;
  imageUrl?: string;
  deadline?: string;
  piggyBankId?: string;
  wishlistId?: string;
}

export default function DreamsPage() {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [piggyBanks, setPiggyBanks] = useState<any[]>([]);
  const [wishlists, setWishlists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Define o modo de vínculo: MANUAL (sem link), PIGGY (cofrinho), WISHLIST (desejo)
  const [linkType, setLinkType] = useState<"MANUAL" | "PIGGY" | "WISHLIST">("MANUAL");

  const [formData, setFormData] = useState({
    id: "",
    title: "",
    targetValue: "",
    savedValue: "0",
    deadline: "",
    imageUrl: "",
    linkedAccountId: "", 
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dreamsRes, piggiesRes, wishRes] = await Promise.allSettled([
        api.get("/dreams"),
        api.get("/piggy-banks"),
        api.get("/wishlists")
      ]);

      if (dreamsRes.status === "fulfilled") setDreams(dreamsRes.value.data);
      if (piggiesRes.status === "fulfilled") setPiggyBanks(piggiesRes.value.data);
      if (wishRes.status === "fulfilled") setWishlists(wishRes.value.data);

    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpenCreate = () => {
    setLinkType("MANUAL");
    setFormData({ id: "", title: "", targetValue: "", savedValue: "0", deadline: "", imageUrl: "", linkedAccountId: "" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dream: Dream) => {
    const type = dream.piggyBankId ? "PIGGY" : dream.wishlistId ? "WISHLIST" : "MANUAL";
    setLinkType(type);
    setFormData({
      id: dream.id,
      title: dream.title,
      targetValue: dream.targetValue.toString(),
      savedValue: dream.savedValue.toString(),
      deadline: dream.deadline ? new Date(dream.deadline).toISOString().split('T')[0] : "",
      imageUrl: dream.imageUrl || "",
      linkedAccountId: dream.piggyBankId || dream.wishlistId || ""
    });
    setIsModalOpen(true);
  };

  // Ao selecionar um item da Wishlist, preenchemos o título e o valor automaticamente
  const handleWishlistSelect = (id: string) => {
    const item = wishlists.find(w => w.id === id);
    if (item) {
      setFormData({
        ...formData,
        linkedAccountId: id,
        title: item.product, // Puxa o nome do produto da Wishlist
        targetValue: item.targetValue?.toString() || formData.targetValue
      });
    } else {
      setFormData({ ...formData, linkedAccountId: id });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      // Montagem do payload com limpeza de campos de vínculo
      const payload: any = {
        title: formData.title,
        targetValue: Number(formData.targetValue),
        savedValue: Number(formData.savedValue),
        imageUrl: formData.imageUrl?.trim() || null,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        // Resetamos ambos para null; apenas o selecionado será preenchido
        piggyBankId: null,
        wishlistId: null,
      };

      if (linkType === "PIGGY") {
        payload.piggyBankId = formData.linkedAccountId;
        payload.savedValue = 0; // Se está vinculado a um cofrinho, o valor vem do cofrinho no backend
      } else if (linkType === "WISHLIST") {
        payload.wishlistId = formData.linkedAccountId;
      }

      if (formData.id) {
        await api.put(`/dreams/${formData.id}`, payload);
      } else {
        await api.post("/dreams", payload);
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Erro ao salvar sonho.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este objetivo?")) return;
    try {
      await api.delete(`/dreams/${id}`);
      fetchData();
    } catch (err) { alert("Erro ao excluir."); }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 p-6 lg:p-12 pb-24">
      <div className="max-w-7xl mx-auto">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
          <div>
            <h1 className="text-5xl font-black italic uppercase text-white tracking-tighter flex items-center gap-4">
              <Target className="text-emerald-500" size={40} />
              Mural de <span className="text-emerald-500">Sonhos</span>
            </h1>
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.4em] mt-3">Sincronize suas economias com seus desejos</p>
          </div>
          <button 
            onClick={handleOpenCreate}
            className="bg-white hover:bg-emerald-500 text-black px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center gap-3 active:scale-95 shadow-xl"
          >
            <Plus size={20} strokeWidth={3} /> Projetar Sonho
          </button>
        </header>

        {loading ? (
          <div className="flex flex-col items-center py-40 gap-4">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {dreams.map((dream) => {
              const progress = Math.min((dream.savedValue / dream.targetValue) * 100, 100);
              return (
                <div key={dream.id} className="group bg-[#0a0a0a] border border-zinc-800/50 rounded-[2.5rem] overflow-hidden hover:border-emerald-500/30 transition-all duration-500 shadow-2xl relative">
                  <div className="absolute top-6 right-6 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => handleOpenEdit(dream)} className="p-3 bg-black/80 backdrop-blur-md text-white rounded-xl hover:bg-white hover:text-black transition-all">
                      <Edit3 size={18} />
                    </button>
                    <button onClick={() => handleDelete(dream.id)} className="p-3 bg-red-500/10 backdrop-blur-md text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="h-48 w-full bg-zinc-900 relative">
                    {dream.imageUrl ? (
                      <img src={dream.imageUrl} className="w-full h-full object-cover opacity-60" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-800"><ImageIcon size={40}/></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                  </div>

                  <div className="p-8">
                    <h3 className="text-xl font-black text-white uppercase italic mb-2">{dream.title}</h3>
                    <div className="flex items-center gap-3 mb-6">
                      {dream.piggyBankId ? <Wallet size={14} className="text-emerald-500"/> : dream.wishlistId ? <ListChecks size={14} className="text-blue-500"/> : <Settings2 size={14} className="text-zinc-600"/>}
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        {dream.piggyBankId ? "Cofrinho" : dream.wishlistId ? "Wishlist" : "Manual"}
                      </span>
                    </div>

                    <div className="relative h-2 bg-zinc-900 rounded-full mb-4 overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                      <span className="text-emerald-500">R$ {dream.savedValue.toLocaleString()}</span>
                      <span className="text-zinc-600">R$ {dream.targetValue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[100] p-4 overflow-y-auto">
            <div className="bg-[#0f0f0f] border border-zinc-800 w-full max-w-2xl rounded-[3rem] p-10 relative my-auto">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 text-zinc-500 hover:text-white"><X size={32} /></button>
              
              <h2 className="text-3xl font-black italic uppercase text-white mb-8">Projetar <span className="text-emerald-500">Sonho</span></h2>
              
              {/* SELETOR DE MODO */}
              <div className="grid grid-cols-3 gap-4 mb-10">
                {[
                  { id: "MANUAL", label: "Manual", icon: Settings2 },
                  { id: "PIGGY", label: "Cofrinho", icon: Wallet },
                  { id: "WISHLIST", label: "Desejos", icon: ListChecks },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setLinkType(item.id as any); setFormData({...formData, linkedAccountId: ""}) }}
                    className={`flex flex-col items-center gap-3 p-5 rounded-3xl border-2 transition-all ${linkType === item.id ? "border-emerald-500 bg-emerald-500/5 text-emerald-500" : "border-zinc-800 text-zinc-600 hover:border-zinc-700"}`}
                  >
                    <item.icon size={20} />
                    <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
                  </button>
                ))}
              </div>

              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 ml-2">Título do Sonho</label>
                  <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 ml-2">Valor da Meta (R$)</label>
                  <input required type="number" value={formData.targetValue} onChange={e => setFormData({...formData, targetValue: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500" />
                </div>

                {linkType === "MANUAL" ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-2">Já Guardado (R$)</label>
                    <input type="number" value={formData.savedValue} onChange={e => setFormData({...formData, savedValue: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-2">Vincular Origem</label>
                    <select 
                      required
                      value={formData.linkedAccountId}
                      onChange={e => linkType === "WISHLIST" ? handleWishlistSelect(e.target.value) : setFormData({...formData, linkedAccountId: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500 font-bold"
                    >
                      <option value="">Selecione...</option>
                      {linkType === "PIGGY" ? 
                        piggyBanks.map(pb => <option key={pb.id} value={pb.id}>{pb.name}</option>) :
                        wishlists.map(w => <option key={w.id} value={w.id}>{w.product}</option>)
                      }
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 ml-2">Data Limite</label>
                  <input type="date" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 ml-2">URL da Imagem</label>
                  <input value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500" placeholder="https://..." />
                </div>

                <button disabled={actionLoading} type="submit" className="md:col-span-2 w-full bg-emerald-500 text-black font-black uppercase italic py-6 rounded-2xl mt-4 shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                  {actionLoading ? <Loader2 className="animate-spin" size={20} /> : "Gravar no Mural"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}