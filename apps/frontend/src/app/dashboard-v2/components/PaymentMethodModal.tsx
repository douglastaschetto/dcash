'use client';

import { useState } from 'react';
import { Loader2, Plus, Wallet, Banknote, CreditCard, Receipt, TrendingUp } from 'lucide-react';
import api from '@/services/api';
import { cn } from '@/lib/utils';
import { ColorPicker } from '@/lib/color-picker';
import { CurrencyInput } from '@/lib/currency-input';
import { Modal } from './Modal';

type PaymentType = 'credit_card' | 'cash' | 'pix' | 'boleto' | 'financing';
const PM_TYPES: { value: PaymentType; label: string; icon: React.ReactNode; hasLimit: boolean }[] = [
  { value: 'cash',        label: 'Dinheiro',           icon: <Wallet size={15} />,      hasLimit: false },
  { value: 'pix',         label: 'PIX',                icon: <Banknote size={15} />,    hasLimit: false },
  { value: 'credit_card', label: 'Cartão de Crédito',  icon: <CreditCard size={15} />,  hasLimit: true  },
  { value: 'boleto',      label: 'Boleto',             icon: <Receipt size={15} />,     hasLimit: false },
  { value: 'financing',   label: 'Financiamento',      icon: <TrendingUp size={15} />,  hasLimit: true  },
];

const field = 'w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-emerald-500';
const fieldLabel = 'text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 block';

/** Same "remount = reset" rationale as CategoryModal — see its comment. */
export function PaymentMethodModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName]       = useState('');
  const [type, setType]       = useState<PaymentType>('cash');
  const [color, setColor]     = useState('#10b981');
  const [limit, setLimit]     = useState(0);
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay]   = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const hasLimit = PM_TYPES.find(t => t.value === type)?.hasLimit ?? false;

  const save = async () => {
    if (!name.trim()) { setError('Informe o nome.'); return; }
    setSaving(true); setError(null);
    try {
      await api.post('/payment-methods', {
        name: name.trim(),
        type,
        color,
        limit: hasLimit ? limit : 0,
        closingDay: hasLimit && closingDay ? parseInt(closingDay) : null,
        dueDay: hasLimit && dueDay ? parseInt(dueDay) : null,
      });
      onSaved();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erro ao criar forma de pagamento.');
    } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} title={<>Nova <span className="text-blue-500">Forma de Pag.</span></>}>
      <div className="space-y-3">
        {error && <p className="text-red-500 text-xs font-bold">{error}</p>}

        <div>
          <label className={fieldLabel}>Nome</label>
          <input className={field} placeholder="Ex: Nubank, Carteira..." value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div>
          <label className={fieldLabel}>Tipo</label>
          <div className="grid grid-cols-2 gap-2">
            {PM_TYPES.map(t => (
              <button key={t.value} type="button" onClick={() => setType(t.value)}
                className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black transition',
                  type === t.value
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300')}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={fieldLabel}>Cor do cartão</label>
          <ColorPicker selected={color} onSelect={setColor} />
        </div>

        {hasLimit && (
          <>
            <div>
              <label className={fieldLabel}>Limite</label>
              <CurrencyInput value={limit} onChange={setLimit} placeholder="0,00" className={field} />
            </div>
            {type === 'credit_card' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={fieldLabel}>Dia fechamento</label>
                  <input type="number" min={1} max={31} className={field} placeholder="Ex: 20"
                    value={closingDay} onChange={e => setClosingDay(e.target.value)} />
                </div>
                <div>
                  <label className={fieldLabel}>Dia vencimento</label>
                  <input type="number" min={1} max={31} className={field} placeholder="Ex: 5"
                    value={dueDay} onChange={e => setDueDay(e.target.value)} />
                </div>
              </div>
            )}
          </>
        )}

        <button onClick={save} disabled={saving}
          className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest transition disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {saving ? 'Salvando...' : 'Criar forma de pagamento'}
        </button>
      </div>
    </Modal>
  );
}
