'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/services/api';
import { X, PiggyBank, Loader2, Target, Upload, Link, Camera } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { CurrencyInput } from '@/lib/currency-input';
import { ColorPicker } from '@/lib/color-picker';

type Bank = {
  id: string;
  name: string;
  balance: number;
  monthlyGoal?: number;
  yearlyGoal?: number;
  targetDate?: string;
  imageUrl?: string;
  color?: string;
};

type Props = {
  bank: Bank | null;
  onClose: () => void;
  onRefresh: () => void;
};

type ImageMode = 'url' | 'upload';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function PiggyBankModal({ bank, onClose, onRefresh }: Props) {
  const isEdit = !!bank;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageMode, setImageMode] = useState<ImageMode>('url');

  const [form, setForm] = useState({
    name: '',
    color: '#10b981',
    imageUrl: '',
    monthlyGoal: 0,
    yearlyGoal: 0,
    targetDate: '',
  });

  useEffect(() => {
    if (bank) {
      setForm({
        name: bank.name ?? '',
        color: bank.color ?? '#10b981',
        imageUrl: bank.imageUrl ?? '',
        monthlyGoal: bank.monthlyGoal ?? 0,
        yearlyGoal: bank.yearlyGoal ?? 0,
        targetDate: bank.targetDate ? bank.targetDate.split('T')[0] : '',
      });
    }
  }, [bank]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  /* ── Image upload ──────────────────────────────────────────────── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Imagem deve ter menos de 2MB.'); return; }
    const fd = new FormData();
    fd.append('file', file);
    try {
      setUploading(true);
      const { data } = await api.post('/upload', fd);
      set('imageUrl', data.url);
    } catch { alert('Falha ao enviar imagem.'); } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  /* ── Save ──────────────────────────────────────────────────────── */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        color: form.color,
        imageUrl: form.imageUrl || null,
        monthlyGoal: form.monthlyGoal,
        yearlyGoal: form.yearlyGoal,
        targetDate: form.targetDate || null,
      };
      if (isEdit) {
        await api.put(`/piggy-banks/${bank!.id}`, payload);
      } else {
        await api.post('/piggy-banks', payload);
      }
      onRefresh();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Erro ao salvar cofrinho.');
    } finally {
      setSaving(false);
    }
  };

  const goal = form.yearlyGoal || form.monthlyGoal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-card dark:bg-surface shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div
          className="px-5 pt-5 pb-3.5 flex items-center justify-between shrink-0"
          style={{ borderBottom: `3px solid ${form.color}25` }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${form.color}20` }}>
              <PiggyBank size={20} style={{ color: form.color }} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-fg-muted">
                {isEdit ? 'Editar Cofrinho' : 'Novo Cofrinho'}
              </p>
              <h2 className="text-lg font-semibold tracking-tight text-fg leading-none mt-0.5">
                {isEdit ? bank!.name : 'Definir Meta'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-surface-2 dark:bg-card hover:bg-hover transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable form */}
        <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-5 space-y-3">

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-fg-muted ml-1">
              Nome do Cofrinho *
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ex: Viagem Europa, Carro Novo..."
              className="w-full bg-surface-2 dark:bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-primary transition"
            />
          </div>

          {/* Color picker */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-fg-muted ml-1">Cor</label>
            <ColorPicker selected={form.color} onSelect={(c) => set('color', c)} />
          </div>

          {/* Image */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-fg-muted ml-1">
              Imagem
            </label>

            {/* Preview */}
            {form.imageUrl && (
              <div className="relative rounded-xl overflow-hidden h-24">
                <img
                  src={form.imageUrl}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => set('imageUrl', '')}
                  className="absolute top-2 right-2 p-1.5 bg-overlay rounded-lg text-white hover:bg-overlay transition"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Mode tabs */}
            <div className="flex rounded-xl overflow-hidden border border-border">
              {(['url', 'upload'] as ImageMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setImageMode(mode)}
                  className={cn(
                    'flex-1 py-2 flex items-center justify-center gap-2 text-[11px] font-semibold transition',
                    imageMode === mode
                      ? 'bg-primary text-on-primary'
                      : 'bg-card text-fg-muted hover:text-fg-2',
                  )}
                >
                  {mode === 'url' ? <Link size={12} /> : <Upload size={12} />}
                  {mode === 'url' ? 'Link Web' : 'Upload'}
                </button>
              ))}
            </div>

            {/* URL input */}
            {imageMode === 'url' && (
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) => set('imageUrl', e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
                className="w-full bg-surface-2 dark:bg-card border border-border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-primary transition"
              />
            )}

            {/* Upload area */}
            {imageMode === 'upload' && (
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-3 flex flex-col items-center gap-1.5 cursor-pointer transition',
                  uploading
                    ? 'border-border'
                    : 'border-border hover:border-primary',
                )}
              >
                {uploading ? (
                  <>
                    <Loader2 size={20} className="animate-spin text-accent" />
                    <span className="text-[11px] font-semibold text-fg-muted">
                      Enviando...
                    </span>
                  </>
                ) : (
                  <>
                    <Camera size={20} className="text-fg-disabled" />
                    <div className="text-center">
                      <p className="text-[11px] font-semibold text-fg-muted">
                        Clique para selecionar
                      </p>
                      <p className="text-[11px] text-fg-muted mt-0.5">PNG, JPG até 2MB</p>
                    </div>
                  </>
                )}
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              hidden
              accept="image/*"
              onChange={handleFileUpload}
            />
          </div>

          {/* Goals */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-fg-muted ml-1">
                Meta Mensal
              </label>
              <CurrencyInput
                value={form.monthlyGoal}
                onChange={(v) => set('monthlyGoal', v)}
                placeholder="0,00"
                className="w-full bg-surface-2 dark:bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-primary transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-fg-muted ml-1">
                Meta Total
              </label>
              <CurrencyInput
                value={form.yearlyGoal}
                onChange={(v) => set('yearlyGoal', v)}
                placeholder="0,00"
                className="w-full bg-surface-2 dark:bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-primary transition"
              />
            </div>
          </div>

          {/* Target date */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-fg-muted ml-1 flex items-center gap-1.5">
              <Target size={11} /> Data Alvo
            </label>
            <input
              type="date"
              value={form.targetDate}
              onChange={(e) => set('targetDate', e.target.value)}
              className="w-full bg-surface-2 dark:bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-primary transition"
            />
          </div>

          {/* Preview strip */}
          {goal > 0 && (
            <div
              className="p-3 rounded-xl border flex items-center justify-between"
              style={{ backgroundColor: `${form.color}10`, borderColor: `${form.color}30` }}
            >
              <div>
                <p className="text-[11px] font-semibold text-fg-muted">Meta definida</p>
                <p className="text-lg font-semibold" style={{ color: form.color }}>
                  {fmt(goal)}
                </p>
              </div>
              {form.targetDate && (
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-fg-muted">Prazo</p>
                  <p className="text-sm font-semibold text-fg-2">
                    {new Date(form.targetDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-2xl font-semibold text-[11px] text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: form.color }}
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {isEdit ? 'Salvar Alterações' : 'Criar Cofrinho'}
          </button>
        </form>
      </div>
    </div>
  );
}
