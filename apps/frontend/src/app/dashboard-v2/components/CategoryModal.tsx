'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import api from '@/services/api';
import { cn } from '@/lib/utils';
import { IconPicker, LucideIcon } from '@/lib/icon-picker';
import { ColorPicker } from '@/lib/color-picker';
import { Modal } from './Modal';

type CatType = 'income' | 'expense' | 'reserve';
const CAT_TYPES: { value: CatType; label: string; color: string }[] = [
  { value: 'expense', label: 'Despesa',  color: '#e11d48' },
  { value: 'income',  label: 'Receita',  color: '#059669' },
  { value: 'reserve', label: 'Reserva',  color: '#2563eb' },
];

const field = 'w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-emerald-500';
const fieldLabel = 'text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 block';

/**
 * Fresh state on every mount is exactly the "reset form on open" behavior
 * the dashboard previously did by hand in `openCatModal()` — the parent
 * conditionally renders this (`{catOpen && <CategoryModal .../>}`), so
 * remounting IS the reset.
 */
export function CategoryModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName]   = useState('');
  const [type, setType]   = useState<CatType>('expense');
  const [color, setColor] = useState('#10b981');
  const [icon, setIcon]   = useState('Tag');
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) { setError('Informe o nome.'); return; }
    setSaving(true); setError(null);
    try {
      await api.post('/categories', { name: name.trim(), type, color, icon });
      onSaved();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erro ao criar categoria.');
    } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} title={<>Nova <span className="text-purple-500">Categoria</span></>}>
      <div className="space-y-3">
        {error && <p className="text-red-500 text-xs font-bold">{error}</p>}

        <div>
          <label className={fieldLabel}>Nome</label>
          <input className={field} placeholder="Ex: Alimentação" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div>
          <label className={fieldLabel}>Tipo</label>
          <div className="grid grid-cols-3 gap-2">
            {CAT_TYPES.map(t => (
              <button key={t.value} type="button" onClick={() => setType(t.value)}
                className={cn('py-2 rounded-xl border text-[10px] font-black uppercase tracking-tight transition',
                  type === t.value ? 'text-white border-transparent' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300')}
                style={type === t.value ? { backgroundColor: t.color, borderColor: t.color } : {}}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={fieldLabel}>Cor</label>
          <ColorPicker selected={color} onSelect={setColor} />
        </div>

        <div>
          <label className={fieldLabel}>Ícone</label>
          <button type="button" onClick={() => setIconPickerOpen(v => !v)}
            className="flex items-center gap-3 w-full px-3.5 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:border-emerald-500 transition">
            <LucideIcon name={icon} size={18} style={{ color }} />
            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{icon}</span>
          </button>
          {iconPickerOpen && (
            <div className="mt-2">
              <IconPicker selected={icon} onSelect={v => { setIcon(v); setIconPickerOpen(false); }} />
            </div>
          )}
        </div>

        <button onClick={save} disabled={saving}
          className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black uppercase text-xs tracking-widest transition disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {saving ? 'Salvando...' : 'Criar categoria'}
        </button>
      </div>
    </Modal>
  );
}
