'use client';
interface FamilyMember {
  id: string;
  name: string;
  avatar?: string;
}
import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import { PaymentCard } from '@/components/forms/PaymentCard';
import { 
  Plus, X, Pencil, Trash2, User as UserIcon, 
  Loader2, CheckCircle2, CreditCard 
} from 'lucide-react';

const ICON_SUGGESTIONS = ['💳', '💵', '💰', '🏦', '💜', '🧡', '💚', '💙', '🖤', '🚀', '🏠', '🚗'];

export default function PaymentsPage() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const initialFormState = {
    name: '', type: 'CREDIT_CARD', color: '#8A05BE', icon: '💳',
    limit: 0, closingDay: 1, dueDay: 10, description: '', ownerId: '' 
  };

  const [formData, setFormData] = useState(initialFormState);

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
      fetchData();
    } catch (error) {
      alert("Erro ao salvar. Verifique os dados.");
    } finally { setLoading(false); }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 text-white">
      <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">Carteira</h1>
          <p className="text-zinc-500 text-xs">Cartões e contas da família</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setFormData(initialFormState); setShowForm(!showForm); }}
          className="bg-white text-black px-4 py-2 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-zinc-200 transition-all"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Fechar' : 'Novo Método'}
        </button>
      </header>

      {showForm && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-[24px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 shadow-2xl">
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* COLUNA ESQUERDA: CAMPOS (8 colunas) */}
            <div className="lg:col-span-7 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Nome</label>
                  <input 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm font-bold outline-none focus:border-zinc-600"
                    placeholder="Ex: Nubank Black"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Tipo</label>
                    <select 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-[10px] font-black uppercase outline-none appearance-none"
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value})}
                    >
                      <option value="CREDIT_CARD">CRÉDITO</option>
                      <option value="CASH">DINHEIRO</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Cor</label>
                    <input 
                      type="color"
                      className="w-full h-[46px] bg-zinc-950 border border-zinc-800 rounded-xl p-1 cursor-pointer"
                      value={formData.color}
                      onChange={e => setFormData({...formData, color: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {formData.type === 'CREDIT_CARD' && (
                <div className="grid grid-cols-3 gap-3 bg-zinc-950/50 p-3 rounded-2xl border border-zinc-800/50 animate-in zoom-in-95">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-zinc-600 uppercase">Limite (R$)</span>
                    <input type="number" className="w-full bg-transparent font-bold text-sm outline-none" value={formData.limit} onChange={e => setFormData({...formData, limit: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1 border-x border-zinc-800 px-3">
                    <span className="text-[9px] font-black text-zinc-600 uppercase">Fechamento</span>
                    <input type="number" className="w-full bg-transparent font-bold text-sm outline-none" value={formData.closingDay} onChange={e => setFormData({...formData, closingDay: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1 pl-2">
                    <span className="text-[9px] font-black text-zinc-600 uppercase">Vencimento</span>
                    <input type="number" className="w-full bg-transparent font-bold text-sm outline-none" value={formData.dueDay} onChange={e => setFormData({...formData, dueDay: Number(e.target.value)})} />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 ml-1 italic">Dono do Cartão</label>
                <div className="flex flex-wrap gap-2">
                  {familyMembers.length > 0 ? familyMembers.map((member: any) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setFormData({...formData, ownerId: member.id})}
                      className={`px-3 py-2 rounded-lg border text-[9px] font-black uppercase transition-all ${formData.ownerId === member.id ? 'bg-white text-black border-white' : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}
                    >
                      {member.name}
                    </button>
                  )) : (
                    <div className="text-[9px] text-zinc-600 font-bold uppercase p-2 border border-zinc-800 rounded-lg w-full text-center">Aguardando membros da família...</div>
                  )}
                </div>
              </div>

              <button 
                disabled={loading}
                className="w-full bg-white text-black py-4 rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <><CheckCircle2 size={16} /> {editingId ? 'Salvar Alterações' : 'Finalizar Configuração'}</>}
              </button>
            </div>

            {/* COLUNA DIREITA: PREVIEW (5 colunas) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center bg-zinc-950/30 rounded-2xl border border-zinc-800/50 p-4 space-y-4">
              <div className="scale-90 origin-center">
                <PaymentCard {...formData as any} owner={familyMembers.find(m => m.id === formData.ownerId)} />
              </div>
              <div className="grid grid-cols-6 gap-2">
                {ICON_SUGGESTIONS.map(emoji => (
                  <button 
                    key={emoji} 
                    type="button" 
                    onClick={() => setFormData({...formData, icon: emoji})}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-all ${formData.icon === emoji ? 'bg-white scale-110 shadow-lg' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Grid de Cartões Existentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card: any) => (
          <div key={card.id} className="relative group">
            <PaymentCard {...card} owner={card.owner} />
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
              <button onClick={() => { setEditingId(card.id); setFormData({...card}); setShowForm(true); window.scrollTo(0,0); }} className="bg-black/60 backdrop-blur-md p-2 rounded-lg text-blue-400 border border-white/10 hover:bg-white hover:text-black">
                <Pencil size={14} />
              </button>
              <button onClick={async () => { if(confirm('Excluir?')) { await api.delete(`/payment-methods/${card.id}`); fetchData(); } }} className="bg-black/60 backdrop-blur-md p-2 rounded-lg text-red-400 border border-white/10 hover:bg-red-500 hover:text-white">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}