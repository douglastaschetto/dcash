'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';
import { X, Check, Target, Loader2, AlertCircle } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface CategoryLimitModalProps {
  limit?: any;
  onClose: () => void;
  onRefresh: () => void;
  // Opcional: passar mês e ano atual via props caso queira sincronizar com o filtro da página
  selectedMonth?: number;
  selectedYear?: number;
}

export function CategoryLimitModal({ limit, onClose, onRefresh, selectedMonth, selectedYear }: CategoryLimitModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCategories, setFetchingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fallbacks de data
  const defaultMonth = selectedMonth || new Date().getMonth() + 1;
  const defaultYear = selectedYear || new Date().getFullYear();

  const [formData, setFormData] = useState({
    categoryId: '',
    amount: 0,
    month: defaultMonth,
    year: defaultYear,
  });

  useEffect(() => {
    async function loadCategories() {
      try {
        setFetchingCategories(true);
        const { data } = await api.get('/categories');
        setCategories(data);

        if (limit) {
          // EDITANDO: Mapeia exatamente o que vem do backend
          setFormData({
            categoryId: limit.categoryId || limit.category?.id || '',
            amount: limit.amount || 0,
            month: limit.month || defaultMonth,
            year: limit.year || defaultYear,
          });
        } else if (data.length > 0) {
          // NOVO: Previne string vazia selecionando a primeira categoria
          setFormData(prev => ({
            ...prev,
            categoryId: data[0].id,
            month: defaultMonth,
            year: defaultYear
          }));
        }
      } catch (err: any) {
        console.error("Erro ao carregar categorias:", err);
        setError("Não foi possível carregar as categorias.");
      } finally {
        setFetchingCategories(false);
      }
    }

    loadCategories();
  }, [limit, defaultMonth, defaultYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação extra no client antes de enviar
    if (!formData.categoryId) {
      setError("Selecione uma categoria.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post('/category-limits', {
        categoryId: formData.categoryId,
        amount: Number(formData.amount),
        month: Number(formData.month),
        year: Number(formData.year),
      });
      
      onRefresh();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : "Erro ao salvar limite.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                <Target className="text-emerald-500" /> {limit ? 'Ajustar Teto' : 'Novo Limite'}
              </h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                Referente a {formData.month}/{formData.year}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-xl transition-colors text-zinc-500 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold uppercase italic">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-zinc-500 ml-1 tracking-widest">Selecione a Categoria</label>
              
              {fetchingCategories ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-emerald-500" />
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, categoryId: cat.id });
                        setError(null);
                      }}
                      className={`flex flex-col items-center p-3 rounded-2xl border transition-all duration-300 ${
                        formData.categoryId === cat.id 
                        ? 'bg-emerald-500 border-emerald-500 text-black' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      <span className="text-xl mb-1">{cat.icon}</span>
                      <span className="text-[7px] font-black uppercase truncate w-full text-center">
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 ml-1 tracking-widest">Valor do Teto (R$)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-black italic">R$</span>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 pl-12 text-2xl font-black outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-white"
                  placeholder="0,00"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                />
              </div>
            </div>

            <button
              disabled={loading || fetchingCategories || !formData.categoryId}
              className="w-full bg-white text-black py-5 rounded-[24px] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-emerald-500 hover:text-white transition-all duration-500 disabled:opacity-30 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Check size={18} className="group-hover:scale-125 transition-transform" /> 
                  {limit ? 'Atualizar Meta' : 'Confirmar Meta'}
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
      `}</style>
    </div>
  );
}