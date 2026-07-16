'use client';

import { useState } from 'react';
import Wheel from '@uiw/react-color-wheel';

type Props = {
  selected: string;
  onSelect: (color: string) => void;
};

export function ColorPicker({ selected, onSelect }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="relative inline-block w-full">
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="flex items-center gap-3 w-full px-4 py-3 border rounded-xl shadow-sm transition-all hover:opacity-80"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--foreground)',
        }}
      >
        <div
          className="w-5 h-5 rounded-full border border-white/20 shadow-inner shrink-0"
          style={{ backgroundColor: selected || '#000000' }}
        />
        <span className="font-mono text-sm uppercase">
          {selected || 'Selecionar Cor'}
        </span>
      </button>

      {showPicker && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />

          <div
            className="absolute left-0 mt-2 z-50 p-4 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-100"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <Wheel
              color={selected || '#ffffff'}
              onChange={(color) => onSelect(color.hex)}
              width={200}
              height={200}
            />
          </div>
        </>
      )}
    </div>
  );
}
