'use client';

import { useState } from 'react';
import api from '@/services/api';
import { X, Trophy, Plus, Calculator, Trash2, ExternalLink, Loader2, ShoppingCart } from 'lucide-react';

export function PriceHuntingModal({ item, onClose }: any) {
  const [prices, setPrices] = useState(item.prices || []);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [newPrice, setNewPrice] = useState({
    store: '',
    cashPrice: 0,
    shipping: 0,
    link: ''
  });

  // Lógica para identificar a melhor cotação (Menor soma de Preço + Frete)
  const getBestOptionId = () => {
    if (prices.length < 2) return prices.length === 1 ? prices[0].id : null;
    
    return prices.reduce((prev: any, curr: any) => {
      const totalPrev = Number(prev.cashPrice) + Number(prev.shipping || 0);
      const totalCurr = Number(curr.cashPrice) + Number(curr.shipping || 0);
      return totalCurr < totalPrev ? curr : prev;
    })?.id;
  };

  const bestOptionId = getBestOptionId();

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // O ID do item pai (Wishlist) deve ser passado na URL conforme definido no Controller
      const { data } = await api.post(`/wishlist/${item.id}/prices`, newPrice);
      
      setPrices([...prices, data]);
      setShowAdd(false);
      setNewPrice({ store: '', cashPrice: 0, shipping: 0, link: '' });
    } catch (err: any) {
      console.error("Erro ao salvar cotação:", err.response?.data || err.message);
      alert('Erro ao salvar cotação. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePrice = async (priceId: string) => {
    if (!confirm('Deseja excluir esta cotação?')) return;
    try {
      await api.delete(`/wishlist/prices/${priceId}`);
      setPrices(prices.filter((p: any) => p.id !== priceId));
    } catch (err) {
      alert('Erro ao excluir cotação.');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl max-h-[85vh] rounded-[40px] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header do Modal */}
        <div className="p-8 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
              <Calculator size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight uppercase italic">Caça aos Preços</h2>
              <p className="text-zinc-500 text-xs font-medium">Monitorando: <span className="text-white">{item.product}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Listagem de Preços */}
        <div className="flex-1 overflow-auto p-8 space-y-4">
          {prices.length === 0 && !showAdd && (
            <div className="py-12 text-center border-2 border-dashed border-zinc-900 rounded-3xl">
              <ShoppingCart className="mx-auto text-zinc-800 mb-2" size={32} />
              <p className="text-zinc-600 text-sm font-bold">Nenhuma cotação cadastrada ainda.</p>
            </div>
          )}

          {prices.map((p: any) => {
            const isBest = p.id === bestOptionId;
            const total = Number(p.cashPrice) + Number(p.shipping || 0);

            return (
              <div 
                key={p.id} 
                className={`group relative p-6 rounded-[24px] border transition-all flex justify-between items-center ${
                  isBest 
                  ? 'bg-emerald-500/5 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]' 
                  : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-lg text-zinc-100">{p.store}</span>
                    {isBest && (
                      <span className="bg-emerald-500 text-[9px] text-black font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Trophy size={10} /> MELHOR ESCOLHA
                      </span>
                    )}
                  </div>
                  {p.link && (
                    <a href={p.link} target="_blank" className="text-[10px] text-blue-500 flex items-center gap-1 hover:underline">
                      <ExternalLink size={10} /> Link da Loja
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-8 text-right">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Preço + Frete</span>
                    <span className={`text-xl font-black ${isBest ? 'text-emerald-400' : 'text-white'}`}>
                      R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleDeletePrice(p.id)}
                    className="p-2 text-zinc-800 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Formulário de Adição */}
          {showAdd ? (
            <form onSubmit={handleAddPrice} className="p-8 bg-zinc-900 border border-zinc-800 rounded-[32px] animate-in slide-in-from-bottom-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Loja / Vendedor</label>
                  <input required placeholder="Ex: Amazon" className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 outline-none focus:border-blue-500"
                    value={newPrice.store} onChange={e => setNewPrice({...newPrice, store: e.target.value})} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Preço à Vista</label>
                  <input type="number" step="0.01" required placeholder="0,00" className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 outline-none focus:border-blue-500"
                    onChange={e => setNewPrice({...newPrice, cashPrice: Number(e.target.value)})} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Valor do Frete</label>
                  <input type="number" step="0.01" placeholder="0,00" className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 outline-none focus:border-blue-500"
                    onChange={e => setNewPrice({...newPrice, shipping: Number(e.target.value)})} />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Link do Anúncio (Opcional)</label>
                <input placeholder="https://..." className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 outline-none focus:border-blue-500"
                  value={newPrice.link} onChange={e => setNewPrice({...newPrice, link: e.target.value})} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="flex-1 bg-blue-600 p-4 rounded-xl font-bold hover:bg-blue-500 transition-all flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin" /> : 'Confirmar Cotação'}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="px-8 bg-zinc-800 rounded-xl font-bold hover:bg-zinc-700 transition-all text-zinc-400">
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button 
              onClick={() => setShowAdd(true)} 
              className="w-full py-6 border-2 border-dashed border-zinc-800 rounded-[24px] text-zinc-600 hover:text-blue-500 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex flex-col items-center gap-1 group"
            >
              <Plus className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Cadastrar Novo Preço</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}