'use client';

import { useState } from 'react';
import { Loader2, Plus } from '@/components/ui/icons';
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

const field = 'field';
const fieldLabel = 'text-xs font-medium text-fg-2 mb-1.5 block';

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
    <Modal onClose={onClose} title={<>Nova <span className="text-info">Categoria</span></>}>
      <div className="space-y-3">
        {error && <p className="text-danger text-xs font-semibold">{error}</p>}

        <div>
          <label className={fieldLabel}>Nome</label>
          <input className={field} placeholder="Ex: Alimentação" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div>
          <label className={fieldLabel}>Tipo</label>
          <div className="grid grid-cols-3 gap-2">
            {CAT_TYPES.map(t => (
              <button key={t.value} type="button" onClick={() => setType(t.value)}
                className={cn('py-2 rounded-xl border text-[11px] font-semibold tracking-tight transition',
                  type === t.value ? 'text-white border-transparent' : 'bg-surface-2 border-border text-fg-2')}
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
            className="flex items-center gap-3 w-full px-3.5 py-2.5 border border-border rounded-xl bg-surface-2 hover:border-primary transition">
            <LucideIcon name={icon} size={18} style={{ color }} />
            <span className="text-xs font-semibold text-fg-2">{icon}</span>
          </button>
          {iconPickerOpen && (
            <div className="mt-2">
              <IconPicker selected={icon} onSelect={v => { setIcon(v); setIconPickerOpen(false); }} />
            </div>
          )}
        </div>

        <button onClick={save} disabled={saving}
          className="w-full h-10 rounded-lg bg-primary hover:bg-primary-hover text-on-primary font-medium text-[13px] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {saving ? 'Salvando...' : 'Criar categoria'}
        </button>
      </div>
    </Modal>
  );
}
