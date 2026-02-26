'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/services/api';
import { 
  Cloud, Plus, Target, Camera, Loader2, X, 
  Trash2, Wallet, Percent
} from 'lucide-react';

export default function DreamsPage() {
  const [goals, setGoals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    targetValue: '',
    savedValue: '0',
    deadline: '',
    imageUrl: '',
    description: '',
    linkedAccountId: '' 
  });

  const fetchGoals = async () => {
    try {
      const { data } = await api.get('/dreams');
      setGoals(data);
    } catch (err) {
      console.error("Erro ao buscar metas:", err);
    }
  };

  const fetchAccounts = async () => {
    try {
      // Ajustado para o nome padrão do seu recurso no Prisma
      const { data } = await api.get('/piggy-banks');
      setAccounts(data);
    } catch (err) {
      console.log("Aguardando implementação de cofrinhos ou rota não encontrada.");
      console.error("Erro ao carregar cofrinhos para vínculo:", err);
    }
  };

  useEffect(() => { 
    fetchGoals(); 
    fetchAccounts();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      setUploading(true);
      const { data } = await api.post('/upload', uploadData);
      
      // O segredo do preview está aqui: atualizar o estado com a URL do servidor
      setFormData(prev => ({ ...prev, imageUrl: data.url }));
    } catch (err) {
      alert("Erro no upload da imagem. Verifique se a pasta 'uploads' existe no backend.");
    } finally { 
      setUploading(false); 
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        ...formData,
        targetValue: Number(formData.targetValue),
        savedValue: Number(formData.savedValue || 0),
        // Envia null se a string estiver vazia para evitar erro de validação URL
        imageUrl: formData.imageUrl.trim() === "" ? null : formData.imageUrl,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        // Garante que o ID do cofrinho seja enviado se selecionado
        piggyBankId: formData.linkedAccountId || null 
      };

      await api.post('/dreams', payload);
      
      setShowForm(false);
      setFormData({ 
        title: '', targetValue: '', savedValue: '0', 
        deadline: '', imageUrl: '', description: '', linkedAccountId: '' 
      });
      fetchGoals();
    } catch (err: any) {
      console.error("Erro ao salvar sonho:", err.response?.data);
      const errorMsg = err.response?.data?.message;
      alert(`Erro ao salvar: ${Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg || "Verifique os dados"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Deseja remover este sonho do seu mural?")) return;
    try {
      await api.delete(`/dreams/${id}`);
      fetchGoals();
    } catch (err) {
      alert("Erro ao excluir");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto text-white min-h-screen pb-20">
      {/* Header */}
      <div className="flex justify-between items-end mb-12 border-b border-zinc-800 pb-8">
        <div>
          <h1 className="text-5xl font-black tracking-tighter flex items-center gap-4">
            <Cloud size={48} className="text-orange-500" /> Mural dos Sonhos
          </h1>
          <p className="text-zinc-500 mt-2 font-medium uppercase tracking-widest text-[10px]">
            Visualize suas metas e monitore seu progresso real
          </p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className={`${showForm ? 'bg-zinc-800' : 'bg-orange-600'} px-8 py-4 rounded-2xl font-bold transition-all hover:scale-105 flex items-center gap-2 shadow-lg`}
        >
          {showForm ? <X size={20} /> : <Plus size={20} />} 
          {showForm ? 'Cancelar' : 'Novo Sonho'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] mb-12 animate-in zoom-in-95 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Foto do Sonho com Preview Corrigido */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Inspiração Visual</label>
               <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-[32px] flex flex-col items-center justify-center cursor-pointer overflow-hidden group relative hover:border-orange-500/50 transition-all"
              >
                {formData.imageUrl ? (
                  <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <div className="flex flex-col items-center text-zinc-700">
                    <Camera size={40} strokeWidth={1.5} />
                    <span className="text-[9px] font-black mt-2">UPLOAD FOTO</span>
                  </div>
                )}
                {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>}
              </div>
              <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileUpload} />
            </div>

            {/* Campos do Formulário */}
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 flex flex-col gap-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">O que você quer conquistar?</label>
                <input required placeholder="Ex: Viagem para as Maldivas" className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 outline-none focus:border-orange-500 transition-all text-white"
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Valor Total (Meta)</label>
                <div className="relative">
                  <span className="absolute left-4 top-4 text-zinc-600 font-bold">R$</span>
                  <input type="number" required placeholder="0,00" className="w-full bg-zinc-950 p-4 pl-12 rounded-2xl border border-zinc-800 outline-none focus:border-orange-500 text-white"
                    value={formData.targetValue} onChange={e => setFormData({...formData, targetValue: e.target.value})} />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Vincular Cofrinho</label>
                <select 
                  className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 outline-none focus:border-orange-500 text-zinc-400 h-[58px]"
                  value={formData.linkedAccountId}
                  onChange={e => setFormData({...formData, linkedAccountId: e.target.value})}
                >
                  <option value="">Acompanhamento Manual</option>
                  {accounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id} className="bg-zinc-900">
                      {acc.name} (R$ {acc.balance?.toLocaleString('pt-BR')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Prazo Estimado</label>
                <input type="date" className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 outline-none focus:border-orange-500 text-zinc-500"
                  value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
              </div>

              <button type="submit" disabled={loading || uploading} className="md:col-span-1 mt-auto bg-orange-600 p-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-orange-900/20 hover:bg-orange-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" /> : <Target size={20} />}
                Fixar no Mural
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {goals.map((goal: any) => {
          const percent = goal.targetValue > 0 ? Math.min(Math.round((goal.savedValue / goal.targetValue) * 100), 100) : 0;
          
          return (
            <div key={goal.id} className="bg-zinc-900/40 border border-zinc-800 rounded-[40px] p-6 hover:bg-zinc-800/40 transition-all group relative shadow-xl">
              <div className="h-56 bg-zinc-950 rounded-[32px] mb-6 overflow-hidden border border-zinc-800 relative">
                <img 
                  src={goal.imageUrl || 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=500'} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-60 group-hover:opacity-100" 
                  alt={goal.title}
                />
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2">
                  <Percent size={12} className="text-orange-500" />
                  <span className="text-sm font-black">{percent}%</span>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-black tracking-tighter text-zinc-100">{goal.title}</h3>
                  <div className="flex items-center gap-2 text-zinc-500 mt-1">
                    <Wallet size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {goal.piggyBankId ? 'Vínculo Automático' : 'Controle Manual'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="h-3 bg-zinc-950 rounded-full border border-zinc-800 overflow-hidden p-[2px]">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full transition-all duration-1000"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-tighter">
                    <span className="text-orange-500">R$ {goal.savedValue?.toLocaleString('pt-BR')}</span>
                    <span className="text-zinc-600">Alvo: R$ {goal.targetValue?.toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                <div className="pt-2 flex gap-3 border-t border-zinc-800/50">
                   <button className="flex-1 bg-zinc-950 border border-zinc-800 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all">
                     Atualizar Saldo
                   </button>
                   <button 
                    onClick={() => handleDelete(goal.id)}
                    className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-zinc-700 hover:text-red-500 hover:border-red-500/30 transition-all"
                   >
                     <Trash2 size={18} />
                   </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}