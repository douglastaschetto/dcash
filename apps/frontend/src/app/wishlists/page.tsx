'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppLayout } from '@/components/app-layout';
import api from '@/services/api';
import {
  ShoppingBag, Plus, Trash2, Camera, Edit3, Search,
  X, CheckCircle2, Clock, ArrowUpRight, Target, Loader2,
} from 'lucide-react';
import { PriceHuntingModal } from '@/components/forms/PriceHuntingModal';
import { cn } from '@/lib/utils';

type WishItem = {
  id: string;
  product: string;
  imageUrl: string | null;
  categoryId: string | null;
  priority: string;
  link: string | null;
  bought: boolean;
  prices: any[];
};

const PRIORITIES = ['1 - Essencial', '2 - Médio', '3 - Baixo'];

export default function WishlistPage() {
  const [items, setItems] = useState<WishItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<WishItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    product: '', priority: '2 - Médio', link: '', imageUrl: '', bought: false,
  });

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/wishlists');
      setItems(data ?? []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('A imagem deve ter menos de 2MB.'); return; }
    const fd = new FormData();
    fd.append('file', file);
    try {
      setUploading(true);
      const { data } = await api.post('/upload', fd);
      setForm((prev) => ({ ...prev, imageUrl: data.url }));
    } catch { alert('Falha ao enviar imagem.'); } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, link: form.link || null, imageUrl: form.imageUrl || null };
      if (editingId) {
        await api.put(`/wishlists/${editingId}`, payload);
      } else {
        await api.post('/wishlists', payload);
      }
      resetForm();
      fetch_();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Erro ao salvar produto.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este item da lista?')) return;
    try {
      await api.delete(`/wishlists/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch { /* ignore */ }
  };

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setForm({ product: '', priority: '2 - Médio', link: '', imageUrl: '', bought: false });
  };

  const startEdit = (item: WishItem) => {
    setEditingId(item.id);
    setForm({
      product: item.product, priority: item.priority,
      link: item.link ?? '', imageUrl: item.imageUrl ?? '', bought: item.bought,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pending = items.filter((i) => !i.bought);
  const acquired = items.filter((i) => i.bought);

  const headerButton = (
    <button
      onClick={() => (editingId ? resetForm() : setShowForm(!showForm))}
      className={cn(
        'px-5 py-3 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all active:scale-95 flex items-center gap-2',
        showForm
          ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400'
          : 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-xl',
      )}
    >
      {showForm ? <X size={16} /> : <Plus size={16} strokeWidth={4} />}
      {showForm ? 'Cancelar' : 'Novo Desejo'}
    </button>
  );

  return (
    <AppLayout title="Lista de Desejos" subtitle="Seus objetivos de compra" actions={headerButton}>
      <div className="max-w-7xl mx-auto space-y-6 font-sans">

        {/* Summary label */}
        <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] tracking-[0.3em] uppercase italic">
          <Target size={13} />
          {pending.length} pendentes
          {acquired.length > 0 && <span className="text-zinc-400"> · {acquired.length} adquiridos</span>}
        </div>

        {/* Form */}
        {showForm && (
          <form
            onSubmit={handleSave}
            className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl animate-in fade-in zoom-in duration-300"
          >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Image */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic ml-1">
                  Imagem
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square bg-white dark:bg-zinc-950 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 transition-all overflow-hidden relative group"
                >
                  {form.imageUrl ? (
                    <img
                      src={form.imageUrl}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      alt="Preview"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-zinc-300 dark:text-zinc-700 group-hover:text-emerald-500 transition-colors">
                      <Camera size={26} strokeWidth={1} />
                      <span className="text-[9px] font-black mt-1.5 tracking-[0.3em]">
                        {uploading ? 'Enviando...' : 'UPLOAD'}
                      </span>
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="animate-spin text-emerald-500" size={24} />
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
                <input
                  type="url"
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:border-emerald-500 outline-none transition"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="Ou cole uma URL..."
                />
              </div>

              {/* Fields */}
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                    Produto *
                  </label>
                  <input
                    required
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-black italic tracking-tighter focus:border-emerald-500 outline-none transition"
                    value={form.product}
                    onChange={(e) => setForm({ ...form, product: e.target.value })}
                    placeholder="Ex: Sony A7IV"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                    Prioridade
                  </label>
                  <select
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-widest focus:border-emerald-500 outline-none transition cursor-pointer appearance-none"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                    Link de Referência
                  </label>
                  <input
                    type="url"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition"
                    value={form.link}
                    onChange={(e) => setForm({ ...form, link: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="md:col-span-2 flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, bought: !form.bought })}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all border',
                      form.bought
                        ? 'bg-emerald-500 border-transparent text-white'
                        : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400',
                    )}
                  >
                    {form.bought ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                    {form.bought ? 'Já Adquirido' : 'Em Planejamento'}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 md:flex-none px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-zinc-900 dark:hover:bg-white dark:hover:text-black transition-all shadow-xl disabled:opacity-50"
                  >
                    {editingId ? 'Atualizar' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Loading */}
        {loading && items.length === 0 && (
          <div className="py-20 flex items-center justify-center">
            <Loader2 size={40} className="animate-spin text-emerald-500" />
          </div>
        )}

        {/* Pending items */}
        {pending.length > 0 && (
          <section>
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-3">
              Pendentes — {pending.length}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {pending.map((item) => <WishCard key={item.id} item={item} onEdit={startEdit} onDelete={handleDelete} onHunt={setSelectedItem} />)}
            </div>
          </section>
        )}

        {/* Acquired items */}
        {acquired.length > 0 && (
          <section>
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-3">
              Adquiridos — {acquired.length}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 opacity-60">
              {acquired.map((item) => <WishCard key={item.id} item={item} onEdit={startEdit} onDelete={handleDelete} onHunt={setSelectedItem} />)}
            </div>
          </section>
        )}

        {/* Empty */}
        {items.length === 0 && !loading && (
          <div className="py-40 flex flex-col items-center justify-center">
            <ShoppingBag size={80} strokeWidth={0.7} className="text-zinc-200 dark:text-zinc-800" />
            <p className="font-black uppercase tracking-[0.4em] text-[10px] mt-6 italic text-zinc-400">
              Sua lista de desejos está vazia
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-6 px-8 py-3 bg-emerald-500 text-white rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 transition"
            >
              Adicionar primeiro desejo
            </button>
          </div>
        )}
      </div>

      {selectedItem && (
        <PriceHuntingModal
          item={selectedItem}
          onClose={() => { setSelectedItem(null); fetch_(); }}
        />
      )}
    </AppLayout>
  );
}

function WishCard({
  item, onEdit, onDelete, onHunt,
}: {
  item: WishItem;
  onEdit: (i: WishItem) => void;
  onDelete: (id: string) => void;
  onHunt: (i: WishItem) => void;
}) {
  const bestPrice = item.prices?.length
    ? Math.min(...item.prices.map((p) => p.cashPrice + p.shipping))
    : null;

  const priorityColor = item.priority.startsWith('1')
    ? 'bg-emerald-500 text-white border-transparent'
    : 'bg-white/80 dark:bg-black/80 text-zinc-500 border-zinc-200 dark:border-zinc-800';

  return (
    <div className="group relative bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[1.5rem] p-3 transition-all hover:border-emerald-500/50 shadow-sm hover:shadow-xl">
      {/* Priority badge */}
      <div className="absolute top-3 right-3 z-10">
        <span className={cn('px-2.5 py-1 rounded-full text-[7px] font-black tracking-widest uppercase italic border', priorityColor)}>
          {item.priority.split(' - ')[1]}
        </span>
      </div>

      {/* Edit / delete — always visible for mobile */}
      <div className="absolute top-3 left-3 z-10 flex gap-1">
        <button onClick={() => onEdit(item)} className="p-1.5 bg-white/90 dark:bg-black/80 rounded-lg text-zinc-500 hover:text-emerald-500 shadow transition-colors">
          <Edit3 size={12} />
        </button>
        <button onClick={() => onDelete(item.id)} className="p-1.5 bg-white/90 dark:bg-black/80 rounded-lg text-zinc-500 hover:text-red-500 shadow transition-colors">
          <Trash2 size={12} />
        </button>
      </div>

      {/* Image */}
      <div className="relative aspect-square rounded-xl overflow-hidden bg-white dark:bg-black mb-3 shadow-inner">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            className={cn('w-full h-full object-cover transition-all duration-700 group-hover:scale-110', item.bought && 'grayscale opacity-40')}
            alt={item.product}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-100 dark:text-zinc-900">
            <ShoppingBag size={48} strokeWidth={1} />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-zinc-900/60 opacity-0 group-hover:opacity-100 backdrop-blur-sm transition-all duration-500 flex flex-col items-center justify-center gap-3">
          <button
            onClick={() => onHunt(item)}
            className="bg-white text-black p-2.5 rounded-full hover:scale-110 transition-transform shadow-2xl"
          >
            <Search size={16} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className={cn('text-sm font-black italic tracking-tighter uppercase leading-tight text-zinc-900 dark:text-white', item.bought && 'line-through opacity-30')}>
            {item.product}
          </h3>
          {item.link && (
            <a href={item.link} target="_blank" rel="noreferrer" className="p-1.5 bg-white dark:bg-zinc-800 rounded-lg text-zinc-400 hover:text-emerald-500 border border-zinc-100 dark:border-zinc-800 transition-all shrink-0">
              <ArrowUpRight size={13} />
            </a>
          )}
        </div>

        {bestPrice !== null && (
          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
            Melhor oferta: {bestPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        )}

        <button
          onClick={() => onHunt(item)}
          className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black py-2.5 px-3 rounded-xl flex items-center justify-between hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white transition-all shadow-lg active:scale-95"
        >
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Caça Preços</span>
          <span className="bg-emerald-600 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full">
            {item.prices?.length ?? 0}
          </span>
        </button>
      </div>
    </div>
  );
}
