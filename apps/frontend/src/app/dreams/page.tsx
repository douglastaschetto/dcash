'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppLayout } from '@/components/app-layout';
import { PlanGate } from '@/components/plan-gate';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { CurrencyInput } from '@/lib/currency-input';
import { cn } from '@/lib/utils';
import {
  Plus, Trash2, Edit3, X, Loader2,
  Image as ImageIcon, Target, Wallet, ListChecks, Settings2,
  Trophy, Flame, Calendar, Link, Upload, Camera,
  TrendingUp, Star,
} from 'lucide-react';

interface Dream {
  id: string;
  title: string;
  targetValue: number;
  savedValue: number;
  imageUrl?: string;
  deadline?: string;
  piggyBankId?: string;
  wishlistId?: string;
  piggyBank?: { id: string; name: string; balance: number } | null;
}

type LinkType = 'MANUAL' | 'PIGGY' | 'WISHLIST';
type ImageMode = 'url' | 'upload';

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (d: string) =>
  new Date(d.includes('T') ? d : d + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

const EMPTY_FORM = {
  id: '',
  title: '',
  targetValue: 0,
  savedValue: 0,
  deadline: '',
  imageUrl: '',
  linkedId: '',
};

export default function DreamsPage() {
  useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dreams, setDreams] = useState<Dream[]>([]);
  const [piggyBanks, setPiggyBanks] = useState<any[]>([]);
  const [wishlists, setWishlists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [linkType, setLinkType] = useState<LinkType>('MANUAL');
  const [imageMode, setImageMode] = useState<ImageMode>('url');
  const [form, setForm] = useState(EMPTY_FORM);

  const f = <K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  /* ── Data ──────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [dRes, pRes, wRes] = await Promise.allSettled([
        api.get('/dreams'),
        api.get('/piggy-banks'),
        api.get('/wishlists'),
      ]);
      if (dRes.status === 'fulfilled') setDreams(dRes.value.data ?? []);
      if (pRes.status === 'fulfilled') setPiggyBanks(pRes.value.data ?? []);
      if (wRes.status === 'fulfilled') setWishlists(wRes.value.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Modal ─────────────────────────────────────────────────────── */
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setLinkType('MANUAL');
    setImageMode('url');
    setIsModalOpen(true);
  };

  const openEdit = (d: Dream) => {
    setForm({
      id: d.id,
      title: d.title,
      targetValue: d.targetValue,
      savedValue: d.savedValue,
      deadline: d.deadline ? d.deadline.split('T')[0] : '',
      imageUrl: d.imageUrl ?? '',
      linkedId: d.piggyBankId ?? d.wishlistId ?? '',
    });
    setLinkType(d.piggyBankId ? 'PIGGY' : d.wishlistId ? 'WISHLIST' : 'MANUAL');
    setImageMode(d.imageUrl?.startsWith('http://localhost') ? 'upload' : 'url');
    setIsModalOpen(true);
  };

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
      f('imageUrl', data.url);
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
        title: form.title,
        targetValue: form.targetValue,
        savedValue: linkType === 'MANUAL' ? form.savedValue : 0,
        deadline: form.deadline || null,
        imageUrl: form.imageUrl || null,
        piggyBankId: linkType === 'PIGGY' ? form.linkedId : null,
        wishlistId: linkType === 'WISHLIST' ? form.linkedId : null,
      };
      if (form.id) await api.put(`/dreams/${form.id}`, payload);
      else await api.post('/dreams', payload);
      setIsModalOpen(false);
      load();
    } catch { alert('Erro ao salvar sonho.'); } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Remover o sonho "${title}"?`)) return;
    try { await api.delete(`/dreams/${id}`); load(); } catch { alert('Erro ao remover.'); }
  };

  const totalTarget = dreams.reduce((s, d) => s + d.targetValue, 0);
  const totalSaved = dreams.reduce((s, d) => s + d.savedValue, 0);

  const addButton = (
    <button
      data-tour="dreams-add-btn"
      onClick={openCreate}
      className="group flex items-center gap-2 px-5 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-emerald-500 dark:hover:bg-emerald-500 dark:hover:text-white shadow-xl transition-all active:scale-95"
    >
      <Plus size={16} className="group-hover:rotate-90 transition-transform" />
      Projetar Sonho
    </button>
  );

  return (
    <AppLayout title="Mural de Sonhos" subtitle="Projetos de vida e metas maiores" actions={addButton} noPadding>
      <PlanGate feature="dreams_goals">
      <div className="h-full flex flex-col overflow-hidden">

        {/* Frozen zone: section label + compact KPIs (does not scroll) */}
        <div className="shrink-0 px-6 lg:px-8 pt-6 pb-4 space-y-4">
          <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] tracking-[0.4em] uppercase">
            <Flame size={13} className="animate-pulse" /> Arquitetura de Metas ·{' '}
            {loading ? '...' : `${dreams.length} sonho${dreams.length !== 1 ? 's' : ''}`}
          </div>

          {dreams.length > 0 && (
            <div data-tour="dreams-kpi-cards" className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Sonhos ativos', value: dreams.length.toString() },
                { label: 'Total almejado', value: fmt(totalTarget) },
                { label: 'Total reservado', value: fmt(totalSaved) },
                {
                  label: 'Progresso geral',
                  value: totalTarget > 0 ? `${Math.round((totalSaved / totalTarget) * 100)}%` : '—',
                },
              ].map((s) => (
                <div key={s.label} className="bg-white dark:bg-zinc-900 rounded-xl p-3 border border-zinc-100 dark:border-zinc-800">
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{s.label}</p>
                  <p className="text-base font-black text-zinc-900 dark:text-white mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable zone: dream cards */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-6">

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-[2.5rem]" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && dreams.length === 0 && (
          <div className="py-28 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem]">
            <Star size={56} className="text-zinc-300 dark:text-zinc-700 mb-6" strokeWidth={1} />
            <p className="text-zinc-400 font-black uppercase tracking-[0.3em] text-[10px] italic">
              Nenhum sonho projetado ainda
            </p>
            <button onClick={openCreate} className="mt-5 text-emerald-500 font-black uppercase text-[10px] hover:underline">
              Criar primeiro sonho →
            </button>
          </div>
        )}

        {/* Dream cards grid */}
        {!loading && dreams.length > 0 && (
          <div data-tour="dreams-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dreams.map((dream) => {
              const progress = Math.min((dream.savedValue / (dream.targetValue || 1)) * 100, 100);
              const done = progress >= 100;

              return (
                <div
                  key={dream.id}
                  className="group bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:shadow-2xl flex flex-col"
                >
                  {/* Image */}
                  <div className="relative h-44 overflow-hidden bg-zinc-200 dark:bg-zinc-900">
                    {dream.imageUrl ? (
                      <img
                        src={dream.imageUrl}
                        alt={dream.title}
                        className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon size={56} className="text-zinc-300 dark:text-zinc-700" strokeWidth={1} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 dark:from-zinc-900/90 via-transparent to-transparent" />

                    {/* Actions */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        onClick={() => openEdit(dream)}
                        className="p-3 bg-white dark:bg-black rounded-2xl text-zinc-500 hover:text-emerald-500 transition-all shadow-xl active:scale-90"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(dream.id, dream.title)}
                        className="p-3 bg-white dark:bg-black rounded-2xl text-zinc-500 hover:text-red-500 transition-all shadow-xl active:scale-90"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {done && (
                      <div className="absolute bottom-4 left-8 bg-emerald-500 text-black px-4 py-1.5 rounded-full font-black text-[9px] uppercase flex items-center gap-1.5">
                        <Trophy size={12} /> Meta Alcançada!
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6 pt-4 flex flex-col flex-1 space-y-4">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none text-zinc-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                      {dream.title}
                    </h3>

                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-1000 ease-out',
                            done ? 'bg-emerald-500' : 'bg-emerald-500/60',
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Reservado</p>
                          <p className="text-xl font-black italic text-emerald-600 dark:text-emerald-500 leading-none">
                            {fmt(dream.savedValue)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Objetivo</p>
                          <p className="text-sm font-black text-zinc-500 dark:text-zinc-400 leading-none">
                            {fmt(dream.targetValue)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-2">
                        {dream.piggyBankId ? (
                          <>
                            <Wallet size={13} className="text-emerald-500" />
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                              {dream.piggyBank?.name ?? 'Sincronizado'}
                            </span>
                          </>
                        ) : (
                          <>
                            <Settings2 size={13} className="text-zinc-400" />
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Manual</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {dream.deadline && (
                          <div className="flex items-center gap-1 text-zinc-400">
                            <Calendar size={11} />
                            <span className="text-[9px] font-bold">{fmtDate(dream.deadline)}</span>
                          </div>
                        )}
                        <span className="text-xl font-black italic text-zinc-300 dark:text-zinc-700">
                          {Math.round(progress)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {/* ── Modal ─────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 w-full max-w-xl rounded-[2rem] shadow-2xl overflow-y-auto max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 shrink-0">
              <div>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.35em]">
                  {form.id ? 'Editar Sonho' : 'Novo Sonho'}
                </p>
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-zinc-900 dark:text-white leading-none mt-0.5">
                  Projetar <span className="text-emerald-500">Sonho</span>
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                  Nome do Sonho *
                </label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => f('title', e.target.value)}
                  placeholder="Ex: Apartamento Próprio, Volta ao Mundo..."
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Image */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                  Imagem
                </label>

                {form.imageUrl && (
                  <div className="relative rounded-xl overflow-hidden h-24">
                    <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => f('imageUrl', '')}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-lg text-white hover:bg-black/70 transition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className="flex rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                  {(['url', 'upload'] as ImageMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setImageMode(mode)}
                      className={cn(
                        'flex-1 py-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition',
                        imageMode === mode
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-black'
                          : 'bg-white dark:bg-zinc-900 text-zinc-400 hover:text-zinc-600',
                      )}
                    >
                      {mode === 'url' ? <Link size={12} /> : <Upload size={12} />}
                      {mode === 'url' ? 'Link Web' : 'Upload'}
                    </button>
                  ))}
                </div>

                {imageMode === 'url' && (
                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={(e) => f('imageUrl', e.target.value)}
                    placeholder="https://exemplo.com/imagem.jpg"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-emerald-500 transition"
                  />
                )}

                {imageMode === 'upload' && (
                  <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={cn(
                      'border-2 border-dashed rounded-xl p-3 flex flex-col items-center gap-1.5 cursor-pointer transition',
                      uploading
                        ? 'border-zinc-300 dark:border-zinc-700'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-500',
                    )}
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={20} className="animate-spin text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Camera size={20} className="text-zinc-300 dark:text-zinc-700" />
                        <div className="text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Clique para selecionar</p>
                          <p className="text-[9px] text-zinc-400 mt-0.5">PNG, JPG até 2MB</p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileUpload} />
              </div>

              {/* Link type */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                  Origem do Valor Reservado
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'MANUAL', label: 'Manual', icon: Settings2 },
                    { id: 'PIGGY', label: 'Cofrinho', icon: Wallet },
                    { id: 'WISHLIST', label: 'Wishlist', icon: ListChecks },
                  ] as const).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setLinkType(t.id)}
                      className={cn(
                        'py-2.5 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all text-[9px] font-black uppercase',
                        linkType === t.id
                          ? 'border-emerald-500 bg-emerald-500/5 text-emerald-500'
                          : 'border-zinc-100 dark:border-zinc-900 text-zinc-500 hover:border-zinc-300',
                      )}
                    >
                      <t.icon size={16} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Values */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                    Valor Almejado *
                  </label>
                  <CurrencyInput
                    value={form.targetValue}
                    onChange={(v) => f('targetValue', v)}
                    placeholder="0,00"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                {linkType === 'MANUAL' ? (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                      Valor Já Reservado
                    </label>
                    <CurrencyInput
                      value={form.savedValue}
                      onChange={(v) => f('savedValue', v)}
                      placeholder="0,00"
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                      {linkType === 'PIGGY' ? 'Cofrinho Vinculado' : 'Wishlist Vinculada'}
                    </label>
                    <select
                      value={form.linkedId}
                      onChange={(e) => f('linkedId', e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:border-emerald-500 transition appearance-none"
                    >
                      <option value="">Selecione...</option>
                      {(linkType === 'PIGGY' ? piggyBanks : wishlists).map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Deadline */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1 flex items-center gap-1.5">
                  <Calendar size={11} /> Data Limite
                </label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => f('deadline', e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Preview strip */}
              {form.targetValue > 0 && (
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Meta definida</p>
                    <p className="text-lg font-black italic text-emerald-600 dark:text-emerald-500 leading-none mt-0.5">
                      {fmt(form.targetValue)}
                    </p>
                  </div>
                  {linkType === 'MANUAL' && form.savedValue > 0 && (
                    <div className="text-right">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Já reservado</p>
                      <p className="text-sm font-black text-zinc-700 dark:text-zinc-300">
                        {Math.round((form.savedValue / form.targetValue) * 100)}%
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-black uppercase italic py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Target size={18} />}
                {form.id ? 'Salvar Alterações' : 'Sincronizar Sonho'}
              </button>
            </form>
          </div>
        </div>
      )}
      </PlanGate>
    </AppLayout>
  );
}
