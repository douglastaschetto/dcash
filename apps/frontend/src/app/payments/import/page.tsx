'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import {
  ArrowLeft, Upload, CheckCircle2, AlertCircle,
  Loader2, FileUp, CheckCheck, X, Info,
} from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
const pad2 = (n: number) => String(n).padStart(2, '0');
const fmtDate = (iso: string) => { const d = new Date(iso); return `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${String(d.getFullYear()).slice(-2)}`; };
import { cn } from '@/lib/utils';

/* ── Types ─────────────────────────────────────────────────── */
interface StagingItem {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  import_hash: string;
  status: string;
  is_duplicate: boolean;
}
interface Category      { id: string; name: string; type: string; }
interface PaymentMethod { id: string; name: string; type: string; }

/* ── Page ──────────────────────────────────────────────────── */
export default function OFXImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories]         = useState<Category[]>([]);
  const [staging, setStaging]               = useState<StagingItem[]>([]);
  const [selectedPM, setSelectedPM]         = useState('');
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [categoryMap, setCategoryMap]       = useState<Record<string, string>>({});

  const [uploading, setUploading]   = useState(false);
  const [loading, setLoading]       = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState('');
  const [step, setStep]             = useState<'upload' | 'review'>('upload');

  /* ── load reference data ── */
  useEffect(() => {
    Promise.all([api.get('/payment-methods'), api.get('/categories')]).then(([pm, cat]) => {
      setPaymentMethods(pm.data || []);
      setCategories((cat.data || []).filter((c: Category) => c.type === 'expense'));
    });
  }, []);

  /* ── load existing staging ── */
  const loadStaging = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/transactions/import/staging');
      const items: StagingItem[] = res.data || [];
      setStaging(items);
      // Pre-select all non-duplicate items
      const ids = new Set(items.filter((i) => !i.is_duplicate).map((i) => i.id));
      setSelectedIds(ids);
      if (items.length > 0) setStep('review');
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadStaging(); }, [loadStaging]);

  /* ── upload file ── */
  const handleUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = selectedPM
        ? `/transactions/import/staging?paymentMethodId=${selectedPM}`
        : '/transactions/import/staging';
      const res = await api.post(url, formData);
      const items: StagingItem[] = res.data || [];
      setStaging((prev) => {
        const map = new Map(prev.map((i) => [i.import_hash, i]));
        items.forEach((i) => map.set(i.import_hash, i));
        return Array.from(map.values());
      });
      const ids = new Set(items.filter((i) => !i.is_duplicate).map((i) => i.id));
      setSelectedIds((prev) => new Set([...prev, ...ids]));
      setStep('review');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao processar arquivo.');
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  /* ── remove from staging ── */
  const removeItem = async (id: string) => {
    try {
      await api.delete(`/transactions/import/staging/${id}`);
      setStaging((prev) => prev.filter((i) => i.id !== id));
      setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    } catch {}
  };

  /* ── confirm import ── */
  const confirmImport = async () => {
    if (selectedIds.size === 0) return;
    setConfirming(true);
    setError('');
    try {
      const items = Array.from(selectedIds).map((id) => ({
        id,
        categoryId: categoryMap[id] || undefined,
      }));
      await api.post('/transactions/import/confirm', { items });
      setDone(true);
      await loadStaging();
      setTimeout(() => setDone(false), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao confirmar importação.');
    }
    setConfirming(false);
  };

  /* ── select helpers ── */
  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };
  const selAll  = () => setSelectedIds(new Set(staging.filter((i) => !i.is_duplicate).map((i) => i.id)));
  const clrAll  = () => setSelectedIds(new Set());

  /* ── category change ── */
  const setItemCategory = (id: string, catId: string) => {
    setCategoryMap((prev) => ({ ...prev, [id]: catId }));
  };

  const nonDupCount = staging.filter((i) => !i.is_duplicate).length;

  /* ── render ─────────────────────────────────────────────── */
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-8">

        {/* Page title */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2.5 bg-zinc-100 dark:bg-white/5 hover:bg-emerald-500 hover:text-white rounded-xl transition-all text-zinc-600 dark:text-zinc-300"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-900 dark:text-zinc-100">
              Importar <span className="text-emerald-600">Extrato</span>
            </h1>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mt-0.5">
              OFX · CSV — Pré-conciliação automática
            </p>
          </div>
        </div>

        {/* Step 1 — Upload */}
        <section className="rounded-[2rem] border border-zinc-300 dark:border-white/10 p-8 space-y-5 bg-white dark:bg-zinc-900/40">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
            1. Selecionar arquivo
          </h2>

          {/* Payment method selector */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 mb-2">
              Conta / Cartão (opcional)
            </label>
            <select
              className="w-full bg-white dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-600 rounded-xl px-4 py-3 text-sm font-medium outline-none text-zinc-800 dark:text-zinc-200 focus:ring-2 ring-emerald-500/30"
              value={selectedPM}
              onChange={(e) => setSelectedPM(e.target.value)}
            >
              <option value="">Nenhuma conta selecionada</option>
              {paymentMethods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Drop zone */}
          <div
            className={cn(
              'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
              uploading
                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10'
                : 'border-zinc-400 dark:border-zinc-600 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/5',
            )}
            onClick={() => !uploading && fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) handleUpload(f);
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".ofx,.csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
            />
            {uploading ? (
              <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mx-auto mb-3" />
            ) : (
              <FileUp className="h-10 w-10 text-zinc-400 dark:text-zinc-500 mx-auto mb-3" />
            )}
            <p className="font-black text-sm text-zinc-700 dark:text-zinc-300">
              {uploading ? 'Processando...' : 'Arraste o arquivo ou clique para selecionar'}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Formatos aceitos: .ofx, .csv</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-xs font-semibold">
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </section>

        {/* Step 2 — Review */}
        {step === 'review' && (
          <section className="rounded-[2rem] border border-zinc-300 dark:border-white/10 p-8 space-y-5 bg-white dark:bg-zinc-900/40">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                2. Revisar transações ({staging.length} encontradas)
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={selAll}
                  className="px-3 py-1.5 text-[10px] font-black uppercase rounded-xl border border-zinc-400 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:border-emerald-500 hover:text-emerald-600 transition"
                >
                  Selec. novas ({nonDupCount})
                </button>
                <button
                  onClick={clrAll}
                  className="px-3 py-1.5 text-[10px] font-black uppercase rounded-xl border border-zinc-400 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:border-red-400 hover:text-red-500 transition"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 text-blue-700 dark:text-blue-400 text-xs">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>Transações marcadas em <span className="font-bold text-amber-600 dark:text-amber-400">amarelo</span> já existem no seu extrato (duplicatas). Apenas as selecionadas serão importadas.</span>
            </div>

            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {staging.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border transition-all',
                      item.is_duplicate
                        ? 'border-amber-300 dark:border-amber-800/30 bg-amber-50 dark:bg-amber-900/10 opacity-70'
                        : selectedIds.has(item.id)
                        ? 'border-emerald-300 dark:border-emerald-800/30 bg-emerald-50 dark:bg-emerald-900/10'
                        : 'border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/30',
                    )}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleItem(item.id)}
                      className="w-4 h-4 rounded accent-emerald-500"
                      disabled={item.is_duplicate}
                    />

                    {/* Date */}
                    <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 w-16 shrink-0">
                      {fmtDate(item.transaction_date)}
                    </span>

                    {/* Description */}
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate block">
                        {item.description}
                      </span>
                      {item.is_duplicate && (
                        <span className="text-[9px] text-amber-600 font-bold uppercase">Já importado</span>
                      )}
                    </div>

                    {/* Category picker (for selected non-dup items) */}
                    {selectedIds.has(item.id) && !item.is_duplicate && (
                      <select
                        className="text-[10px] bg-white dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-600 rounded-lg px-2 py-1.5 font-medium outline-none w-36 shrink-0 text-zinc-800 dark:text-zinc-200 focus:ring-2 ring-emerald-500/30"
                        value={categoryMap[item.id] || ''}
                        onChange={(e) => setItemCategory(item.id, e.target.value)}
                      >
                        <option value="">Categoria...</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}

                    {/* Amount */}
                    <span className={cn(
                      'text-sm font-black w-24 text-right shrink-0',
                      item.amount < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-800 dark:text-zinc-200',
                    )}>
                      {item.amount < 0 ? '+' : '-'} R$ {Math.abs(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>

                    {/* Remove */}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Confirm bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-white/10 gap-4">
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                  {selectedIds.size} transação(ões) para importar
                </span>
                <button
                  onClick={confirmImport}
                  disabled={confirming}
                  className={cn(
                    'px-6 py-3 rounded-2xl font-black text-sm uppercase transition-all flex items-center gap-2',
                    done
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20',
                  )}
                >
                  {confirming ? (
                    <><Loader2 size={16} className="animate-spin" /> Importando...</>
                  ) : done ? (
                    <><CheckCircle2 size={16} /> Importado!</>
                  ) : (
                    <><CheckCheck size={16} /> Confirmar importação</>
                  )}
                </button>
              </div>
            )}

            {staging.length === 0 && !loading && (
              <div className="flex flex-col items-center py-10 text-zinc-400">
                <Upload size={40} strokeWidth={1} className="mb-3 opacity-30" />
                <p className="text-xs font-black uppercase tracking-widest">Nenhum extrato em análise</p>
              </div>
            )}
          </section>
        )}

        {/* Tips */}
        <div className="rounded-2xl bg-zinc-100 dark:bg-white/[0.02] border border-zinc-300 dark:border-white/10 p-5 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400">Como funciona</p>
          <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
            <li>Exporte o extrato OFX ou CSV do seu banco/cartão</li>
            <li>Faça upload — duplicatas são detectadas automaticamente</li>
            <li>Revise, categorize e confirme as novas transações</li>
            <li>O saldo dos cofrinhos é atualizado automaticamente</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}
