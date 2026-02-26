'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/services/api';
import { 
  ShoppingBag, Plus, Trash2, Camera, Edit3, Search, 
  X, Link as LinkIcon, CheckCircle2, AlertCircle, Loader2 ,
  Clock
} from 'lucide-react';
import { PriceHuntingModal } from '@/components/forms/PriceHuntingModal';

export default function WishlistPage() {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    product: '',
    priority: '2 - Médio',
    link: '',
    imageUrl: '',
    bought: false
  });

  const fetchWishlist = async () => {
    try {
      const { data } = await api.get('/wishlist');
      setItems(data);
    } catch (err) {
      console.error('Erro ao buscar lista:', err);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  // Função para lidar com o upload do arquivo físico
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      setLoading(true);
      // Envia para o novo endpoint de upload que configuramos no backend
      const { data } = await api.post('/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData({ ...formData, imageUrl: data.url });
    } catch (err) {
      alert('Falha ao subir imagem para o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/wishlist/${editingId}`, formData);
      } else {
        await api.post('/wishlist', formData);
      }
      resetForm();
      fetchWishlist();
    } catch (err) {
      alert('Erro ao salvar produto.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setFormData({ product: '', priority: '2 - Médio', link: '', imageUrl: '', bought: false });
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({
      product: item.product,
      priority: item.priority,
      link: item.link || '',
      imageUrl: item.imageUrl || '',
      bought: item.bought
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    try {
      await api.delete(`/wishlist/${id}`);
      fetchWishlist();
    } catch (err) {
      alert('Erro ao excluir item.');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto text-white min-h-screen pb-20">
      {/* Header Estilo Notion */}
      <div className="flex justify-between items-end mb-12 border-b border-zinc-800 pb-8">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-white flex items-center gap-4">
            <ShoppingBag size={48} className="text-orange-500" /> Desejos de Compras
          </h1>
          <p className="text-zinc-500 mt-2 font-medium">Lista de desejos e monitoramento de preços do dCash.</p>
        </div>
        <button 
          onClick={() => { editingId ? resetForm() : setShowForm(!showForm) }}
          className={`${showForm ? 'bg-zinc-800 text-zinc-400' : 'bg-orange-600 text-white shadow-lg shadow-orange-900/20'} px-8 py-4 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-2`}
        >
          {showForm ? <X size={20} /> : <Plus size={20} />}
          {showForm ? 'Cancelar' : 'Novo Desejo'}
        </button>
      </div>

      {/* Formulário de Cadastro/Edição */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] mb-12 animate-in fade-in slide-in-from-top-4 shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-500">
              <Edit3 size={24} />
            </div>
            <h2 className="text-xl font-bold">{editingId ? 'Editar Detalhes' : 'O que você está planejando comprar?'}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Area de Imagem */}
            <div className="flex flex-col gap-4">
              <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Imagem do Produto</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:border-orange-500/50 transition-all overflow-hidden group relative"
              >
                {formData.imageUrl ? (
                  <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <div className="flex flex-col items-center text-zinc-700 group-hover:text-zinc-400 transition-colors">
                    <Camera size={40} strokeWidth={1.5} />
                    <span className="text-[10px] font-bold mt-2">UPLOAD ARQUIVO</span>
                  </div>
                )}
                {loading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="animate-spin text-orange-500" />
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
              <input 
                placeholder="Ou cole a URL da imagem" 
                className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs outline-none focus:border-orange-500 transition-colors"
                value={formData.imageUrl.startsWith('http') ? formData.imageUrl : ''}
                onChange={e => setFormData({...formData, imageUrl: e.target.value})}
              />
            </div>

            {/* Inputs de Dados */}
            <div className="md:col-span-3 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Nome do Item</label>
                  <input required className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 outline-none focus:border-orange-500"
                    value={formData.product} onChange={e => setFormData({...formData, product: e.target.value})} placeholder="Ex: iPad Air M2" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Prioridade</label>
                  <select className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 outline-none focus:border-orange-500"
                    value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                    <option>1 - Essencial</option>
                    <option>2 - Médio</option>
                    <option>3 - Baixo</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Link de Referência</label>
                <input className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 outline-none focus:border-orange-500"
                  value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} placeholder="https://amazon.com.br/..." />
              </div>

              <div className="flex items-center gap-4 bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800 w-fit">
                <span className="text-xs font-black text-zinc-500 uppercase">Status de Compra:</span>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, bought: !formData.bought})}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all ${formData.bought ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}
                >
                  {formData.bought ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                  {formData.bought ? 'JÁ COMPREI' : 'AINDA NÃO COMPREI'}
                </button>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-orange-600 p-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-orange-500 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-orange-900/10">
                {loading ? <Loader2 className="animate-spin" /> : editingId ? 'Salvar Alterações' : 'Adicionar ao dCash'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Grid de Itens */}
      <div className="grid grid-cols-1 gap-6">
        {items.length === 0 && !loading && (
          <div className="py-20 flex flex-col items-center text-zinc-600 border-2 border-dashed border-zinc-900 rounded-[40px]">
            <AlertCircle size={48} className="mb-4" />
            <p className="font-bold">Sua lista está vazia.</p>
          </div>
        )}

        <div className="bg-zinc-900/30 border border-zinc-800 rounded-[40px] overflow-hidden backdrop-blur-sm">
          <table className="w-full text-left">
            <thead className="bg-zinc-800/30 text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] border-b border-zinc-800">
              <tr>
                <th className="p-8">Produto</th>
                <th className="p-8">Prioridade</th>
                <th className="p-8 text-center">Caça Preços</th>
                <th className="p-8 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {items.map((item: any) => (
                <tr key={item.id} className="group hover:bg-zinc-800/20 transition-all">
                  <td className="p-8">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-zinc-950 rounded-3xl overflow-hidden border border-zinc-800 flex-shrink-0 group-hover:scale-105 transition-transform shadow-2xl">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.product} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-800"><ShoppingBag /></div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xl font-bold ${item.bought ? 'line-through text-zinc-600' : 'text-zinc-100'}`}>{item.product}</span>
                          {item.bought && <CheckCircle2 className="text-emerald-500" size={18} />}
                        </div>
                        {item.link && (
                          <a href={item.link} target="_blank" className="text-[10px] text-blue-500/60 hover:text-blue-400 flex items-center gap-1 mt-1 transition-colors">
                            <LinkIcon size={10} /> Ver referência externa
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-8">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border ${
                      item.priority.includes('1') ? 'bg-orange-500/5 border-orange-500/20 text-orange-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                    }`}>
                      {item.priority.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-8 text-center">
                    <button 
                      onClick={() => setSelectedItem(item)}
                      className="bg-zinc-950 border border-zinc-800 px-6 py-2.5 rounded-2xl text-[10px] font-black hover:bg-orange-600 hover:border-orange-500 hover:text-white transition-all inline-flex items-center gap-2 group"
                    >
                      <Search size={14} className="group-hover:scale-125 transition-transform" />
                      {item.prices?.length || 0} OPÇÕES
                    </button>
                  </td>
                  <td className="p-8 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(item)} className="p-3 bg-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all">
                        <Edit3 size={18} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-3 bg-red-500/10 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modais */}
      {selectedItem && (
        <PriceHuntingModal 
          item={selectedItem} 
          onClose={() => { setSelectedItem(null); fetchWishlist(); }} 
        />
      )}
    </div>
  );
}