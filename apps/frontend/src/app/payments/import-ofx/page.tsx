'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import {
  Upload, AlertCircle, Loader2, FileUp, CheckCheck, X, Info,
  Sparkles, HelpCircle, ArrowRight, PartyPopper,
} from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { PlanGate } from '@/components/plan-gate';
import { cn } from '@/lib/utils';

const pad2 = (n: number) => String(n).padStart(2, '0');
const apiErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error) {
    const response = (err as Error & { response?: { data?: { message?: string } } }).response;
    return response?.data?.message || err.message || fallback;
  }
  return fallback;
};
const fmtDate = (iso: string) => { const d = new Date(iso); return `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${String(d.getFullYear()).slice(-2)}`; };

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
interface Suggestion {
  id: string;
  categoryId: string | null;
  isInstallment: boolean;
  installmentCurrent?: number;
  installmentTotal?: number;
}

const PM_EMOJI: Record<string, string> = {
  credit_card: '💳',
  cash: '💵',
  pix: '⚡',
  boleto: '🧾',
  financing: '🏦',
};

const STEPS = [
  { n: 1, label: 'Conta', emoji: '🏦' },
  { n: 2, label: 'Arquivo', emoji: '📤' },
  { n: 3, label: 'Revisão', emoji: '🧠' },
  { n: 4, label: 'Pronto', emoji: '🎉' },
];

/* ── Page ──────────────────────────────────────────────────── */
export default function OFXImportWizardPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories]         = useState<Category[]>([]);
  const [staging, setStaging]               = useState<StagingItem[]>([]);
  const [selectedPM, setSelectedPM]         = useState('');
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [categoryMap, setCategoryMap]       = useState<Record<string, string>>({});
  const [suggestions, setSuggestions]       = useState<Record<string, Suggestion>>({});
  const [installmentAccepted, setInstallmentAccepted] = useState<Record<string, boolean>>({});

  const [uploading, setUploading]   = useState(false);
  const [analyzing, setAnalyzing]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError]           = useState('');
  const [importedCount, setImportedCount]         = useState(0);
  const [installmentsCreated, setInstallmentsCreated] = useState(0);

  /* ── load reference data ── */
  useEffect(() => {
    Promise.all([api.get('/payment-methods'), api.get('/categories')]).then(([pm, cat]) => {
      setPaymentMethods(pm.data || []);
      setCategories((cat.data || []).filter((c: Category) => c.type === 'expense'));
    });
  }, []);

  /* ── AI analysis (category suggestion + installment detection) ── */
  const runAnalysis = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    setAnalyzing(true);
    try {
      const res = await api.post('/transactions/import/analyze', { ids });
      const results: Suggestion[] = res.data || [];
      setSuggestions((prev) => {
        const next = { ...prev };
        results.forEach((r) => { next[r.id] = r; });
        return next;
      });
      setCategoryMap((prev) => {
        const next = { ...prev };
        results.forEach((r) => { if (r.categoryId && !next[r.id]) next[r.id] = r.categoryId; });
        return next;
      });
      setInstallmentAccepted((prev) => {
        const next = { ...prev };
        results.forEach((r) => { if (r.isInstallment && next[r.id] === undefined) next[r.id] = true; });
        return next;
      });
    } catch { /* IA indisponível — segue com categorização manual */ }
    setAnalyzing(false);
  }, []);

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
      const newIds = items.filter((i) => !i.is_duplicate).map((i) => i.id);
      setSelectedIds((prev) => new Set([...prev, ...newIds]));
      setStep(3);
      runAnalysis(newIds);
    } catch (err) {
      setError(apiErrorMessage(err, 'Erro ao processar arquivo.'));
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
      let withInstallment = 0;
      const items = Array.from(selectedIds).map((id) => {
        const suggestion = suggestions[id];
        const useInstallment = suggestion?.isInstallment && installmentAccepted[id] !== false;
        if (useInstallment) withInstallment++;
        return {
          id,
          categoryId: categoryMap[id] || undefined,
          installment: useInstallment
            ? { current: suggestion!.installmentCurrent, total: suggestion!.installmentTotal }
            : undefined,
        };
      });
      await api.post('/transactions/import/confirm', { items });
      setImportedCount(items.length);
      setInstallmentsCreated(withInstallment);
      setStep(4);
    } catch (err) {
      setError(apiErrorMessage(err, 'Erro ao confirmar importação.'));
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
  const setItemCategory = (id: string, catId: string) => {
    setCategoryMap((prev) => ({ ...prev, [id]: catId }));
  };
  const toggleInstallmentAccept = (id: string) => {
    setInstallmentAccepted((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

  const resetWizard = () => {
    setStep(1);
    setSelectedPM('');
    setStaging([]);
    setSelectedIds(new Set());
    setCategoryMap({});
    setSuggestions({});
    setInstallmentAccepted({});
    setImportedCount(0);
    setInstallmentsCreated(0);
  };

  const actionableItems = staging.filter((i) => selectedIds.has(i.id) && !i.is_duplicate);
  const missingCategoryCount = actionableItems.filter((i) => !categoryMap[i.id]).length;
  const canConfirm = selectedIds.size > 0 && missingCategoryCount === 0 && !confirming;

  /* ── render ─────────────────────────────────────────────── */
  return (
    <AppLayout title="Importar Extrato" subtitle="OFX · CSV — pré-conciliação com IA 🤖">
      <PlanGate feature="ofx_import">
        <div className="max-w-3xl mx-auto pb-8">

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-3 mb-6">
            {STEPS.map((s, idx) => (
              <div key={s.n} className="flex items-center gap-1.5 sm:gap-3">
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wide transition-all',
                    step === s.n
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : step > s.n
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-zinc-100 dark:bg-white/5 text-zinc-400 dark:text-zinc-500',
                  )}
                >
                  <span>{step > s.n ? '✅' : s.emoji}</span> {s.label}
                </div>
                {idx < STEPS.length - 1 && (
                  <ArrowRight size={13} className="text-zinc-300 dark:text-zinc-600 shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Wizard card — fica dentro da área visível, com scroll interno */}
          <section className="rounded-[2rem] border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900/40 flex flex-col overflow-hidden max-h-[72vh] shadow-sm">

            {/* ── STEP 1 — escolher conta/cartão ── */}
            {step === 1 && (
              <>
                <div className="p-6 md:p-8 border-b border-zinc-200 dark:border-white/10 shrink-0">
                  <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    🏦 Qual conta ou cartão é esse extrato?
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">Isso ajuda a organizar as transações importadas na conta certa.</p>
                </div>
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {paymentMethods.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedPM(p.id); setStep(2); }}
                        className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-zinc-200 dark:border-white/10 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all text-center"
                      >
                        <span className="text-3xl">{PM_EMOJI[p.type] || '💰'}</span>
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 truncate w-full">{p.name}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => { setSelectedPM(''); setStep(2); }}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/5 transition-all text-center"
                    >
                      <span className="text-3xl">🤷</span>
                      <span className="text-xs font-bold text-zinc-500">Pular / não sei</span>
                    </button>
                  </div>
                  {paymentMethods.length === 0 && (
                    <p className="text-xs text-zinc-400 mt-4">Nenhuma conta cadastrada ainda — sem problema, você pode pular esta etapa.</p>
                  )}
                </div>
              </>
            )}

            {/* ── STEP 2 — enviar arquivo ── */}
            {step === 2 && (
              <>
                <div className="p-6 md:p-8 border-b border-zinc-200 dark:border-white/10 shrink-0">
                  <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    📤 Envie o arquivo do extrato
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    Formatos aceitos: <b>.ofx</b> e <b>.csv</b>
                    {selectedPM && <> — conta selecionada: <b>{paymentMethods.find((p) => p.id === selectedPM)?.name}</b></>}
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
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
                      {uploading ? '📡 Processando...' : 'Arraste o arquivo aqui ou clique para selecionar'}
                    </p>
                  </div>

                  <button
                    onClick={() => setStep(1)}
                    className="mt-4 text-xs font-bold text-zinc-500 hover:text-emerald-600 transition"
                  >
                    ← Trocar conta selecionada
                  </button>

                  {error && (
                    <div className="flex items-center gap-2 text-red-500 text-xs font-semibold mt-4">
                      <AlertCircle size={14} /> {error}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── STEP 3 — revisar & categorizar ── */}
            {step === 3 && (
              <>
                <div className="p-5 md:p-6 border-b border-zinc-200 dark:border-white/10 shrink-0">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      🧠 Revisar & categorizar ({staging.length})
                    </h2>
                    <button
                      onClick={() => { setStep(2); }}
                      className="text-[11px] font-black uppercase text-zinc-500 hover:text-emerald-600 transition"
                    >
                      + Enviar outro arquivo
                    </button>
                  </div>
                  <div className="flex items-start gap-2 mt-3 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 text-blue-700 dark:text-blue-400 text-[11px]">
                    <Info size={13} className="mt-0.5 shrink-0" />
                    <span>Toda transação selecionada precisa de uma <b>categoria</b> antes de confirmar. A IA já sugere uma — só confira e ajuste se precisar.</span>
                  </div>
                  {analyzing && (
                    <div className="flex items-center gap-2 mt-2 text-[11px] font-bold text-emerald-600">
                      <Sparkles size={13} className="animate-pulse" /> Analisando com IA — sugerindo categorias e procurando parcelamentos...
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2">
                  {staging.map((item) => {
                    const suggestion = suggestions[item.id];
                    const accepted = installmentAccepted[item.id] ?? true;
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'flex flex-col gap-2 p-3 rounded-xl border transition-all',
                          item.is_duplicate
                            ? 'border-amber-300 dark:border-amber-800/30 bg-amber-50 dark:bg-amber-900/10 opacity-70'
                            : selectedIds.has(item.id)
                            ? 'border-emerald-300 dark:border-emerald-800/30 bg-emerald-50 dark:bg-emerald-900/10'
                            : 'border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/30',
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleItem(item.id)}
                            className="w-4 h-4 rounded accent-emerald-500 shrink-0"
                            disabled={item.is_duplicate}
                          />
                          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 w-16 shrink-0">
                            {fmtDate(item.transaction_date)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate block">
                              {item.description}
                            </span>
                            {item.is_duplicate && (
                              <span className="text-[9px] text-amber-600 font-bold uppercase">Já importado</span>
                            )}
                          </div>
                          {selectedIds.has(item.id) && !item.is_duplicate && (
                            <select
                              className={cn(
                                'text-[10px] bg-white dark:bg-zinc-800 border rounded-lg px-2 py-1.5 font-medium outline-none w-36 shrink-0 text-zinc-800 dark:text-zinc-200 focus:ring-2 ring-emerald-500/30',
                                !categoryMap[item.id] ? 'border-red-300 dark:border-red-800' : 'border-zinc-400 dark:border-zinc-600',
                              )}
                              value={categoryMap[item.id] || ''}
                              onChange={(e) => setItemCategory(item.id, e.target.value)}
                            >
                              <option value="">Categoria...</option>
                              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          )}
                          <span className={cn(
                            'text-sm font-black w-24 text-right shrink-0',
                            item.amount < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-800 dark:text-zinc-200',
                          )}>
                            {item.amount < 0 ? '+' : '-'} R$ {Math.abs(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition shrink-0"
                          >
                            <X size={13} />
                          </button>
                        </div>

                        {suggestion?.isInstallment && !item.is_duplicate && (
                          <label className="flex items-center gap-2 ml-7 text-[11px] font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 rounded-lg px-2.5 py-1.5 w-fit cursor-pointer">
                            <input
                              type="checkbox"
                              checked={accepted}
                              onChange={() => toggleInstallmentAccept(item.id)}
                              className="w-3.5 h-3.5 accent-purple-500"
                            />
                            🧩 Parcela {suggestion.installmentCurrent}/{suggestion.installmentTotal} detectada — gerar as próximas parcelas automaticamente
                          </label>
                        )}
                      </div>
                    );
                  })}

                  {staging.length === 0 && (
                    <div className="flex flex-col items-center py-10 text-zinc-400">
                      <Upload size={40} strokeWidth={1} className="mb-3 opacity-30" />
                      <p className="text-xs font-black uppercase tracking-widest">Nenhuma transação em análise</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-zinc-200 dark:border-white/10 p-4 md:p-6 shrink-0 bg-white dark:bg-zinc-900/60">
                  {error && (
                    <div className="flex items-center gap-2 text-red-500 text-xs font-semibold mb-3">
                      <AlertCircle size={14} /> {error}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      {selectedIds.size} transação(ões) selecionada(s)
                      {missingCategoryCount > 0 && (
                        <span className="block text-red-500 font-black mt-0.5">
                          ⚠️ Falta categoria em {missingCategoryCount} transação(ões)
                        </span>
                      )}
                    </span>
                    <button
                      onClick={confirmImport}
                      disabled={!canConfirm}
                      className={cn(
                        'px-6 py-3 rounded-2xl font-black text-sm uppercase transition-all flex items-center gap-2',
                        canConfirm
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed',
                      )}
                    >
                      {confirming ? (
                        <><Loader2 size={16} className="animate-spin" /> Importando...</>
                      ) : (
                        <><CheckCheck size={16} /> Confirmar importação</>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 4 — concluído ── */}
            {step === 4 && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 text-center">
                <PartyPopper className="h-14 w-14 text-emerald-500" />
                <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">Tudo importado! 🎉</h2>
                <p className="text-sm text-zinc-500">
                  {importedCount} transação(ões) importada(s)
                  {installmentsCreated > 0 && <> · {installmentsCreated} parcelamento(s) criado(s) automaticamente 🧩</>}
                </p>
                <div className="flex gap-3 flex-wrap justify-center mt-2">
                  <button
                    onClick={() => router.push('/transactions')}
                    className="px-5 py-2.5 rounded-xl font-black text-xs uppercase bg-emerald-600 hover:bg-emerald-700 text-white transition"
                  >
                    Ver transações
                  </button>
                  {installmentsCreated > 0 && (
                    <button
                      onClick={() => router.push('/installments')}
                      className="px-5 py-2.5 rounded-xl font-black text-xs uppercase bg-purple-600 hover:bg-purple-700 text-white transition"
                    >
                      Ver parcelamentos
                    </button>
                  )}
                  <button
                    onClick={resetWizard}
                    className="px-5 py-2.5 rounded-xl font-black text-xs uppercase border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:border-emerald-400 hover:text-emerald-600 transition"
                  >
                    Importar outro arquivo
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Tips */}
          <div className="rounded-2xl bg-zinc-100 dark:bg-white/[0.02] border border-zinc-300 dark:border-white/10 p-5 space-y-2 mt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <HelpCircle size={13} /> Como funciona
            </p>
            <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
              <li>Exporte o extrato OFX ou CSV do seu banco/cartão</li>
              <li>Escolha a conta, envie o arquivo — duplicatas são detectadas automaticamente</li>
              <li>A IA sugere a categoria de cada transação e identifica parcelamentos pela descrição</li>
              <li>Ao aceitar um parcelamento detectado, as parcelas futuras são criadas automaticamente</li>
            </ul>
          </div>
        </div>
      </PlanGate>
    </AppLayout>
  );
}
