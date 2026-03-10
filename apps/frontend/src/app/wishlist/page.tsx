'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/services/api';
import { 
  ShoppingBag, Plus, Trash2, Camera, Edit3, Search, 
  X, Link as LinkIcon, CheckCircle2, AlertCircle, Loader2,
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

  // Atualizado para plural '/wishlists' para bater com o Controller
  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/wishlists');
      setItems(data);
    } catch (err) {
      console.error('Erro ao buscar lista:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      setLoading(true);
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
      // Limpeza de payload: removemos o ID do corpo para evitar erro 500 no Prisma
      const payload = {
        product: formData.product,
        priority: formData.priority,
        link: formData.link || null,
        imageUrl: formData.imageUrl || null,
        bought: formData.bought
      };

      if (editingId) {
        await api.put(`/wishlists/${editingId}`, payload);
      } else {
        await api.post('/wishlists', payload);
      }
      resetForm();
      fetchWishlist();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Erro ao salvar produto.');
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
      await api.delete(`/wishlists/${id}`);
      fetchWishlist();
    } catch (err) {
      alert('Erro ao excluir item.');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto text-white min-h-screen pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-zinc-800 pb-8 gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-white flex items-center gap-4 italic">
            WISH<span className="text-orange-500">LIST</span>
          </h1>
          <p className="text-zinc-500 mt-2 font-bold uppercase text-[10px] tracking-[0.3em]">Curadoria de desejos e monitoramento dCash</p>
        </div>
        <button 
          onClick={() => { editingId ? resetForm() : setShowForm(!showForm) }}
          className={`${showForm ? 'bg-zinc-800 text-zinc-400' : 'bg-orange-600 text-white shadow-lg shadow-orange-900/20'} px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2`}
        >
          {showForm ? <X size={18} /> : <Plus size={18} strokeWidth={3} />}
          {showForm ? 'Cancelar' : 'Projetar Desejo'}
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] mb-12 animate-in fade-in slide-in-from-top-4 shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-500">
              <Edit3 size={24} />
            </div>
            <h2 className="text-xl font-black uppercase italic tracking-tight">{editingId ? 'Refinar Desejo' : 'O que vamos buscar hoje?'}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="flex flex-col gap-4">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Thumbnail</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:border-orange-500/50 transition-all overflow-hidden group relative"
              >
                {formData.imageUrl ? (
                  <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <div className="flex flex-col items-center text-zinc-700 group-hover:text-zinc-400 transition-colors">
                    <Camera size={40} strokeWidth={1.5} />
                    <span className="text-[10px] font-black mt-2">UPLOAD</span>
                  </div>
                )}
                {loading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="animate-spin text-orange-500" />
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
            </div>

            <div className="md:col-span-3 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Produto</label>
                  <input required className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 outline-none focus:border-orange-500 text-sm font-bold"
                    value={formData.product} onChange={e => setFormData({...formData, product: e.target.value})} placeholder="Ex: iPhone 15 Pro Max" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Urgência</label>
                  <select className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 outline-none focus:border-orange-500 text-sm font-bold"
                    value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                    <option>1 - Essencial</option>
                    <option>2 - Médio</option>
                    <option>3 - Baixo</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Link de Referência</label>
                <input className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 outline-none focus:border-orange-500 text-sm"
                  value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} placeholder="URL da loja ou fabricante..." />
              </div>

              <div className="flex items-center gap-6 bg-zinc-950/50 p-5 rounded-3xl border border-zinc-800 w-fit">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Estado:</span>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, bought: !formData.bought})}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black transition-all ${formData.bought ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}
                >
                  {formData.bought ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                  {formData.bought ? 'COMPRADO' : 'PLANEJADO'}
                </button>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-orange-600 p-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-orange-500 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl">
                {loading ? <Loader2 className="animate-spin" /> : editingId ? 'Atualizar Desejo' : 'Salvar na Lista'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tabela de Itens */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-[40px] overflow-hidden backdrop-blur-sm shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-zinc-800/30 text-[9px] text-zinc-500 uppercase font-black tracking-[0.3em] border-b border-zinc-800">
            <tr>
              <th className="p-8">Item</th>
              <th className="p-8 text-center">Prioridade</th>
              <th className="p-8 text-center">Cotações</th>
              <th className="p-8 text-right">Controles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {items.map((item: any) => (
              <tr key={item.id} className="group hover:bg-zinc-800/20 transition-all">
                <td className="p-8">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 flex-shrink-0 group-hover:scale-110 transition-transform">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.product} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-800"><ShoppingBag size={24}/></div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-black uppercase italic tracking-tight ${item.bought ? 'line-through text-zinc-600' : 'text-zinc-100'}`}>{item.product}</span>
                        {item.bought && <CheckCircle2 className="text-emerald-500" size={16} />}
                      </div>
                      {item.link && (
                        <a href={item.link} target="_blank" className="text-[10px] text-blue-500/60 hover:text-blue-400 font-bold flex items-center gap-1 mt-1">
                          <LinkIcon size={10} /> LINK EXTERNO
                        </a>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-8 text-center">
                  <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black tracking-widest border ${
                    item.priority.includes('1') ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  }`}>
                    {item.priority.toUpperCase()}
                  </span>
                </td>
                <td className="p-8 text-center">
                  <button 
                    onClick={() => setSelectedItem(item)}
                    className="bg-zinc-950 border border-zinc-800 px-5 py-2.5 rounded-xl text-[10px] font-black hover:border-orange-500 transition-all inline-flex items-center gap-2 group/btn"
                  >
                    <Search size={14} className="group-hover/btn:scale-125 transition-transform" />
                    {item.prices?.length || 0} OPÇÕES
                  </button>
                </td>
                <td className="p-8 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(item)} className="p-3 bg-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-3 bg-red-500/10 rounded-xl text-red-500 hover:bg-red-600 hover:text-white transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && !loading && (
          <div className="py-24 flex flex-col items-center text-zinc-700">
            <AlertCircle size={40} strokeWidth={1} className="mb-4" />
            <p className="font-black uppercase tracking-widest text-xs">A lista de curadoria está vazia</p>
          </div>
        )}
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