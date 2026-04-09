'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import { PaymentCard } from '@/components/forms/PaymentCard';
import { 
  Plus, X, Pencil, Trash2, User as UserIcon, 
  Loader2, CheckCircle2, CreditCard 
} from 'lucide-react';

interface FamilyMember {
  id: string;
  name: string;
  avatar?: string;
}

const ICON_SUGGESTIONS = ['💳', '💵', '💰', '🏦', '💜', '🧡', '💚', '💙', '🖤', '🚀', '🏠', '🚗'];

export default function PaymentsPage() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const initialFormState = {
    name: '', 
    type: 'CREDIT_CARD', 
    color: '#8A05BE', 
    icon: '💳',
    limit: 0, 
    closingDay: 1, 
    dueDay: 10, 
    description: '', 
    ownerId: '' 
  };

  const [formData, setFormData] = useState(initialFormState);
  const [displayLimit, setDisplayLimit] = useState("0,00");

  // MÁSCARA CENTESIMAL (LIMITE)
  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    const numericValue = Number(rawValue) / 100;
    setFormData(prev => ({ ...prev, limit: numericValue }));
    setDisplayLimit(new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue));
  };

  // MÁSCARA DE 2 DÍGITOS (DIAS)
  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'closingDay' | 'dueDay') => {
    let value = e.target.value.replace(/\D/g, ""); // Apenas números
    
    // Pega os últimos 2 dígitos digitados
    if (value.length > 2) {
      value = value.slice(-2);
    }

    let numericDay = Number(value);

    // Trava para não passar de 31 dias
    if (numericDay > 31) numericDay = 31;
    if (numericDay === 0 && value.length === 2) numericDay = 1;

    setFormData(prev => ({ ...prev, [field]: numericDay }));
  };

  // Formatador para exibir sempre 2 dígitos (ex: 01, 05, 15)
  const formatDay = (day: number) => day.toString().padStart(2, '0');

  const fetchData = useCallback(async () => {
    try {
      const [cardsRes, membersRes] = await Promise.all([
        api.get('/payment-methods').catch(() => ({ data: [] })),
        api.get('/family/members').catch(() => ({ data: [] }))
      ]);
      setCards(cardsRes.data || []);
      setFamilyMembers(membersRes.data || []);
      
      if (membersRes.data?.length > 0 && !formData.ownerId) {
        setFormData(prev => ({ ...prev, ownerId: membersRes.data[0].id }));
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  }, [formData.ownerId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (editingId) {
      setDisplayLimit(new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(formData.limit));
    }
  }, [editingId, formData.limit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        limit: Number(formData.limit),
        closingDay: Number(formData.closingDay),
        dueDay: Number(formData.dueDay)
      };
      
      editingId 
        ? await api.patch(`/payment-methods/${editingId}`, payload)
        : await api.post('/payment-methods', payload);

      setShowForm(false);
      setEditingId(null);
      setFormData(initialFormState);
      setDisplayLimit("0,00");
      fetchData();
    } catch (error) {
      alert("Erro ao salvar.");
    } finally { setLoading(false); }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 text-white">
      <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">Carteira</h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Métodos de Pagamento</p>
        </div>
        <button 
          onClick={() => { 
            setEditingId(null); 
            setFormData(initialFormState); 
            setDisplayLimit("0,00");
            setShowForm(!showForm); 
          }}
          className="bg-white text-black px-5 py-2.5 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-blue-500 hover:text-white transition-all shadow-lg"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancelar' : 'Novo Método'}
        </button>
      </header>

      {showForm && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500 shadow-2xl">
          <form onSubmit={handleSubmit} className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            <div className="lg:col-span-7 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-600 ml-1 italic">Identificação</label>
                  <input 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 text-white"
                    placeholder="Ex: Nubank Principal"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-600 ml-1 italic">Tipo</label>
                    <select 
                      className="w-full h-[54px] bg-zinc-950 border border-zinc-800 rounded-2xl px-4 text-[10px] font-black uppercase outline-none text-white cursor-pointer appearance-none focus:border-blue-500"
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value})}
                    >
                      <option value="CREDIT_CARD">CRÉDITO</option>
                      <option value="CASH">DÉBITO / DINHEIRO</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-600 ml-1 italic">Cor</label>
                    <input 
                      type="color"
                      className="w-full h-[54px] bg-zinc-950 border border-zinc-800 rounded-2xl p-2 cursor-pointer"
                      value={formData.color}
                      onChange={e => setFormData({...formData, color: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {formData.type === 'CREDIT_CARD' && (
                <div className="grid grid-cols-3 gap-4 bg-zinc-950/80 p-5 rounded-[24px] border border-zinc-800 shadow-inner">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-zinc-600 uppercase italic">Limite</span>
                    <div className="flex items-center gap-1 text-white">
                      <span className="text-[10px] font-black text-zinc-500">R$</span>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        className="w-full bg-transparent font-black text-sm outline-none focus:text-blue-400" 
                        value={displayLimit} 
                        onChange={handleLimitChange} 
                      />
                    </div>
                  </div>
                  <div className="space-y-1 border-x border-zinc-800 px-4">
                    <span className="text-[9px] font-black text-zinc-600 uppercase italic">Fecha Dia</span>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      className="w-full bg-transparent font-black text-sm outline-none text-white focus:text-blue-400" 
                      value={formatDay(formData.closingDay)} 
                      onChange={e => handleDayChange(e, 'closingDay')} 
                    />
                  </div>
                  <div className="space-y-1 pl-2">
                    <span className="text-[9px] font-black text-zinc-600 uppercase italic">Vence Dia</span>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      className="w-full bg-transparent font-black text-sm outline-none text-white focus:text-blue-400" 
                      value={formatDay(formData.dueDay)} 
                      onChange={e => handleDayChange(e, 'dueDay')} 
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-zinc-600 ml-1 italic tracking-widest">Proprietário</label>
                <div className="flex flex-wrap gap-2">
                  {familyMembers.map((member: any) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setFormData({...formData, ownerId: member.id})}
                      className={`px-4 py-2.5 rounded-xl border text-[9px] font-black uppercase transition-all flex items-center gap-2 ${
                        formData.ownerId === member.id 
                        ? 'bg-blue-600 text-white border-blue-500 shadow-lg scale-105' 
                        : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <UserIcon size={10} />
                      {member.name}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                disabled={loading}
                className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl hover:bg-blue-600 hover:text-white disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    <CheckCircle2 size={18} /> 
                    {editingId ? 'Confirmar Alterações' : 'Finalizar Cadastro'}
                  </>
                )}
              </button>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center justify-center bg-zinc-950/40 rounded-3xl border border-zinc-800/50 p-6 space-y-8">
              <div className="scale-110 md:scale-125">
                <PaymentCard {...formData as any} owner={familyMembers.find(m => m.id === formData.ownerId)} />
              </div>
              <div className="grid grid-cols-6 gap-3">
                {ICON_SUGGESTIONS.map(emoji => (
                  <button 
                    key={emoji} 
                    type="button" 
                    onClick={() => setFormData({...formData, icon: emoji})}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-all ${
                      formData.icon === emoji 
                      ? 'bg-white scale-125 shadow-2xl rotate-6 text-black' 
                      : 'bg-zinc-900 hover:bg-zinc-800 hover:scale-110'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
        {cards.map((card: any) => (
          <div key={card.id} className="relative group">
            <PaymentCard {...card} owner={card.owner} />
            <div className="absolute top-4 right-4 flex gap-2 md:opacity-0 md:group-hover:opacity-100 transition-all">
              <button 
                onClick={() => { setEditingId(card.id); setFormData({...card}); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                className="bg-black/80 backdrop-blur-xl p-3 rounded-xl text-blue-400 border border-white/10 hover:bg-white hover:text-black"
              >
                <Pencil size={14} />
              </button>
              <button 
                onClick={async () => { if(confirm('Excluir?')) { await api.delete(`/payment-methods/${card.id}`); fetchData(); } }} 
                className="bg-black/80 backdrop-blur-xl p-3 rounded-xl text-red-400 border border-white/10 hover:bg-red-600 hover:text-white"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}