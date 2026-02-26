'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';
import { 
  X, Target, Calendar, Image as ImageIcon, 
  DollarSign, TrendingUp, Save, Wand2, Loader2 
} from 'lucide-react';

interface PiggyBankModalProps {
  bank?: any;
  onClose: () => void;
  onRefresh: () => void;
}

export function PiggyBankModal({ bank, onClose, onRefresh }: PiggyBankModalProps) {
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    imageUrl: '',
    monthlyGoal: '',
    yearlyGoal: '',
    targetDate: ''
  });

  useEffect(() => {
    if (bank) {
      setFormData({
        name: bank.name || '',
        imageUrl: bank.imageUrl || '',
        monthlyGoal: bank.monthlyGoal?.toString() || '',
        yearlyGoal: bank.yearlyGoal?.toString() || '',
        targetDate: bank.targetDate ? new Date(bank.targetDate).toISOString().substring(0, 7) : ''
      });
    }
  }, [bank]);

  // A "MÁGICA": Busca uma imagem estável baseada no nome usando LoremFlickr
  const handleGenerateImage = () => {
    const keyword = formData.name.trim() || 'money';
    setImageLoading(true);
    
    // LoremFlickr é mais estável que o Unsplash para este tipo de busca dinâmica sem API Key
    const randomId = Math.floor(Math.random() * 1000);
    const autoUrl = `https://loremflickr.com/800/400/${encodeURIComponent(keyword)}?lock=${randomId}`;
    
    setFormData({ ...formData, imageUrl: autoUrl });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        targetDate: formData.targetDate ? `${formData.targetDate}-01T12:00:00.000Z` : null,
        monthlyGoal: parseFloat(formData.monthlyGoal),
        yearlyGoal: parseFloat(formData.yearlyGoal)
      };

      if (bank?.id) {
        await api.patch(`/piggy-banks/${bank.id}`, payload);
      } else {
        await api.post('/piggy-banks', payload);
      }

      onRefresh();
      onClose();
    } catch (err) {
      console.error("Erro ao salvar:", err);
      alert("Erro ao processar a requisição.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="p-8 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/20">
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
              <Target className="text-emerald-500" size={28} />
              {bank ? 'Editar Meta' : 'Novo Objetivo'}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-zinc-900 text-zinc-500 hover:text-white rounded-full transition-all border border-zinc-800"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          
          {/* Preview da Imagem */}
          <div className="relative h-40 w-full bg-zinc-900 rounded-[24px] overflow-hidden border border-zinc-800 flex items-center justify-center">
            {formData.imageUrl ? (
              <>
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-10">
                    <Loader2 className="text-emerald-500 animate-spin" size={32} />
                  </div>
                )}
                <img 
                  key={formData.imageUrl} 
                  src={formData.imageUrl} 
                  alt="Preview" 
                  className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                  onLoad={() => setImageLoading(false)}
                  onError={(e) => {
                    setImageLoading(false);
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=800';
                  }}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-700">
                <ImageIcon size={32} />
                <span className="text-[10px] uppercase font-black mt-2 tracking-widest">Sem Imagem</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-transparent" />
            <span className="absolute bottom-4 left-5 text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em]">Visualização da Capa</span>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1 italic">Título do Objetivo</label>
            <input 
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-5 text-white focus:border-emerald-500 outline-none transition-all font-bold"
              placeholder="Ex: Viagem para o Euro"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          {/* URL e Mágica */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1 italic">Link da Imagem</label>
            <div className="flex gap-2">
              <input 
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-5 text-white focus:border-emerald-500 outline-none transition-all font-bold text-xs"
                placeholder="https://..."
                value={formData.imageUrl}
                onChange={e => setFormData({...formData, imageUrl: e.target.value})}
              />
              <button 
                type="button"
                onClick={handleGenerateImage}
                className="bg-emerald-600/10 border border-emerald-500/20 px-5 rounded-2xl text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2"
              >
                <Wand2 size={20} />
                <span className="font-black text-[10px] uppercase hidden sm:block">Mágica</span>
              </button>
            </div>
          </div>

          {/* Metas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1 italic">Aporte Mensal</label>
              <input 
                type="number" step="0.01" required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-5 text-white focus:border-emerald-500 outline-none transition-all font-bold"
                value={formData.monthlyGoal}
                onChange={e => setFormData({...formData, monthlyGoal: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1 italic">Meta Total</label>
              <input 
                type="number" step="0.01" required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-5 text-emerald-500 focus:border-emerald-500 outline-none transition-all font-black text-lg"
                value={formData.yearlyGoal}
                onChange={e => setFormData({...formData, yearlyGoal: e.target.value})}
              />
            </div>
          </div>

          {/* Data */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1 italic">Alcançar até</label>
            <input 
              type="month" required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-5 text-white focus:border-emerald-500 outline-none transition-all font-bold scheme-dark"
              value={formData.targetDate}
              onChange={e => setFormData({...formData, targetDate: e.target.value})}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : <Save size={20} />}
            {bank ? 'Salvar Alterações' : 'Confirmar Cofrinho'}
          </button>
        </form>
      </div>
    </div>
  );
}