'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { cn, parseDateOnly, todayISO } from '@/lib/utils';

export type TransactionMode = 'EXPENSE' | 'INCOME' | 'PIGGY' | 'RESERVE';

interface Category      { id: string; name: string; type: string; color?: string; }
interface PaymentMethod { id: string; name: string; type: string; closingDay?: number; dueDay?: number; }
interface PiggyBank     { id: string; name: string; balance: number; }
interface Dream         { id: string; title: string; targetValue: number; savedValue: number; piggyBankId?: string; }
interface FixedBill     { id: string; title: string; value: number; }

const INSTALLABLE = ['credit_card', 'financing', 'installment'];

const MODE_CAT_TYPE: Record<TransactionMode, string> = {
  INCOME:  'income',
  EXPENSE: 'expense',
  PIGGY:   'reserve',
  RESERVE: 'reserve',
};

interface Props {
  mode: TransactionMode;
  initialData?: any;
  onSuccess: () => void;
}

export default function TransactionForm({ mode, initialData, onSuccess }: Props) {
  const isEditing = !!initialData?.id;

  /* ── form state ─────────────────────────────── */
  const [description, setDescription]         = useState(initialData?.description ?? '');
  const [amount, setAmount] = useState(() => {
    if (!initialData?.amount) return '';
    return Number(initialData.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  });
  const [date, setDate]                       = useState(
    initialData?.date?.slice(0, 10) ?? todayISO(),
  );
  const [categoryId, setCategoryId]           = useState(initialData?.category?.id ?? '');
  const [paymentMethodId, setPaymentMethodId] = useState(initialData?.paymentMethod?.id ?? '');
  const [fixedBillId, setFixedBillId]         = useState(initialData?.fixedBillId ?? '');

  /* ── income recurring (create only) ─────────── */
  const [recurring, setRecurring]       = useState(false);
  const [recurrence, setRecurrence]     = useState<'monthly' | 'weekly' | 'biweekly'>('monthly');
  const [recurEndDate, setRecurEndDate] = useState('');

  /* ── expense installments (create only) ──────── */
  const [installMode, setInstallMode]   = useState<'count' | 'enddate' | null>(null);
  const [installCount, setInstallCount] = useState('');
  const [installEnd, setInstallEnd]     = useState('');

  /* ── investment target ───────────────────────── */
  const [investTarget, setInvestTarget] = useState<'piggy' | 'dream'>('piggy');
  const [piggyBankId, setPiggyBankId]   = useState(initialData?.piggyBankId ?? '');
  const [dreamId, setDreamId]           = useState('');

  /* ── remote data ─────────────────────────────── */
  const [categories, setCategories]         = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [piggyBanks, setPiggyBanks]         = useState<PiggyBank[]>([]);
  const [dreams, setDreams]                 = useState<Dream[]>([]);
  const [fixedBills, setFixedBills]         = useState<FixedBill[]>([]);
  const [loading, setLoading]               = useState(true);

  /* ── submit state ────────────────────────────── */
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState('');

  /* ── load reference data ─────────────────────── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [catRes, pmRes, fbRes] = await Promise.all([
          api.get('/categories'),
          api.get('/payment-methods'),
          api.get('/fixed-bills/options'),
        ]);
        setCategories(catRes.data || []);
        setPaymentMethods(pmRes.data || []);
        setFixedBills(fbRes.data || []);

        if (mode === 'PIGGY' || mode === 'RESERVE') {
          const [pbRes, drRes] = await Promise.all([
            api.get('/piggy-banks'),
            api.get('/dreams'),
          ]);
          setPiggyBanks(pbRes.data || []);
          setDreams(drRes.data || []);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [mode]);

  /* ── derived ─────────────────────────────────── */
  const filteredCats  = categories.filter((c) => c.type === MODE_CAT_TYPE[mode]);
  const selectedPM    = paymentMethods.find((p) => p.id === paymentMethodId);
  const canInstall    = selectedPM && INSTALLABLE.includes(selectedPM.type.toLowerCase());
  const selectedDream = dreams.find((d) => d.id === dreamId);

  const calcInstallments = () => {
    if (!installEnd || !date) return 1;
    const s = parseDateOnly(date);
    const e = parseDateOnly(installEnd);
    const m = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
    return Math.max(1, m);
  };

  /* ── submit ──────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');

    const num = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
    if (!description.trim() || isNaN(num) || num <= 0) {
      setError('Preencha descrição e valor.');
      return;
    }

    setSubmitting(true);
    try {
      const base = {
        description: description.trim(),
        amount: num,
        date,
        categoryId:        categoryId        || undefined,
        paymentMethodId:   paymentMethodId   || undefined,
        paymentMethodType: selectedPM?.type  || 'OTHER',
        fixedBillId:       fixedBillId       || undefined,
      };

      /* ── EDIT MODE ─── use PATCH ─────────────────────────────────── */
      if (isEditing) {
        await api.patch(`/transactions/${initialData.id}`, base);

      /* ── CREATE: INCOME ──────────────────────────────────────────── */
      } else if (mode === 'INCOME') {
        if (recurring && recurEndDate) {
          await api.post('/transactions/recurring', {
            ...base, type: 'INCOME', recurrence, endDate: recurEndDate,
          });
        } else {
          await api.post('/transactions', { ...base, type: 'INCOME' });
        }

      /* ── CREATE: EXPENSE ─────────────────────────────────────────── */
      } else if (mode === 'EXPENSE') {
        const count =
          installMode === 'count'   ? (parseInt(installCount) || 1) :
          installMode === 'enddate' ? calcInstallments() : 1;
        await api.post('/transactions', {
          ...base,
          type: 'EXPENSE',
          ...(count > 1 ? { installments: count } : {}),
        });

      /* ── CREATE: PIGGY / RESERVE ─────────────────────────────────── */
      } else if (mode === 'PIGGY') {
        if (investTarget === 'dream' && selectedDream) {
          if (selectedDream.piggyBankId) {
            await api.post('/transactions', {
              ...base, type: 'EXPENSE', piggyBankId: selectedDream.piggyBankId,
            });
          } else {
            await api.patch(`/dreams/${dreamId}/progress`, {
              savedValue: (selectedDream.savedValue ?? 0) + num,
            });
          }
        } else {
          if (!piggyBankId) { setError('Selecione o cofrinho.'); setSubmitting(false); return; }
          await api.post('/transactions', { ...base, type: 'EXPENSE', piggyBankId });
        }

      } else {
        await api.post('/transactions', { ...base, type: 'EXPENSE' });
      }

      setSuccess(true);
      setTimeout(() => { setSuccess(false); onSuccess(); }, 700);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erro ao salvar.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── styles ──────────────────────────────────── */
  const input = 'w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none focus:ring-2 ring-emerald-500/30 text-zinc-900 dark:text-zinc-100 transition';
  const label = 'block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const submitLabel = () => {
    if (isEditing) return 'Salvar alterações';
    if (mode === 'INCOME') {
      return recurring
        ? `Gerar recorrências (${recurrence === 'monthly' ? 'mensal' : recurrence === 'weekly' ? 'semanal' : 'quinzenal'})`
        : 'Registrar receita';
    }
    if (mode === 'EXPENSE') {
      const count = installMode === 'count'
        ? (parseInt(installCount) || 1)
        : installMode === 'enddate' ? calcInstallments() : 1;
      return count > 1 ? `Parcelar em ${count}x` : 'Registrar despesa';
    }
    if (mode === 'PIGGY') return 'Confirmar investimento';
    return 'Registrar reserva';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">

      {/* Edição — info das parcelas (somente leitura) */}
      {isEditing && initialData?.totalInstallments > 1 && (
        <div className="flex items-center gap-2 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 px-4 py-2">
          <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">
            Parcela {initialData.installmentNumber}/{initialData.totalInstallments}
          </span>
          <span className="text-[10px] text-orange-400 ml-auto">Editando apenas esta parcela</span>
        </div>
      )}

      {/* Descrição */}
      <div>
        <label className={label} htmlFor="tx-description">Descrição</label>
        <input
          id="tx-description"
          type="text"
          placeholder={
            mode === 'INCOME'  ? 'Ex: Salário, Freelance...' :
            mode === 'EXPENSE' ? 'Ex: Supermercado, Aluguel...' :
            'Ex: Reserva de emergência...'
          }
          className={input}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      {/* Valor + Data */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="tx-amount">Valor (R$)</label>
          <input
            id="tx-amount"
            type="text"
            inputMode="numeric"
            placeholder="0,00"
            className={input}
            value={amount}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '');
              const cents = parseInt(digits || '0', 10);
              setAmount(
                cents === 0
                  ? ''
                  : (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              );
            }}
            required
          />
        </div>
        <div>
          <label className={label} htmlFor="tx-date">Data</label>
          <input
            id="tx-date"
            type="date"
            className={input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Categoria + Forma de pagamento */}
      {(filteredCats.length > 0 || !(mode === 'PIGGY' && investTarget === 'dream')) && (
        <div className={cn('grid gap-3', filteredCats.length > 0 && !(mode === 'PIGGY' && investTarget === 'dream') ? 'grid-cols-2' : 'grid-cols-1')}>
          {filteredCats.length > 0 && (
            <div>
              <label className={label} htmlFor="tx-category">Categoria</label>
              <select id="tx-category" className={input} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Sem categoria</option>
                {filteredCats.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {!(mode === 'PIGGY' && investTarget === 'dream') && (
            <div>
              <label className={label} htmlFor="tx-payment-method">Forma de Pagamento</label>
              <select
                id="tx-payment-method"
                className={input}
                value={paymentMethodId}
                onChange={(e) => { setPaymentMethodId(e.target.value); if (!isEditing) setInstallMode(null); }}
              >
                <option value="">Nenhuma</option>
                {paymentMethods.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Conta fixa (INCOME e EXPENSE) */}
      {(mode === 'INCOME' || mode === 'EXPENSE') && fixedBills.length > 0 && (
        <div>
          <label className={label} htmlFor="tx-fixed-bill">Conta Fixa vinculada</label>
          <select id="tx-fixed-bill" className={input} value={fixedBillId} onChange={(e) => setFixedBillId(e.target.value)}>
            <option value="">Nenhuma</option>
            {fixedBills.map((f) => (
              <option key={f.id} value={f.id}>
                {f.title} — R$ {Number(f.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── INCOME: Recorrência (apenas criação) ───────────────────────── */}
      {mode === 'INCOME' && !isEditing && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-widest text-zinc-500">
              Receita Recorrente
            </span>
            <button
              type="button"
              onClick={() => setRecurring(!recurring)}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors',
                recurring ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600',
              )}
            >
              <span className={cn(
                'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                recurring ? 'translate-x-6' : 'translate-x-1',
              )} />
            </button>
          </div>
          {recurring && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Frequência</label>
                <select className={input} value={recurrence} onChange={(e) => setRecurrence(e.target.value as any)}>
                  <option value="monthly">Mensal</option>
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quinzenal</option>
                </select>
              </div>
              <div>
                <label className={label}>Gerar até</label>
                <input
                  type="date" min={date}
                  className={input}
                  value={recurEndDate}
                  onChange={(e) => setRecurEndDate(e.target.value)}
                  required={recurring}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── EXPENSE: Parcelamento (apenas criação) ─────────────────────── */}
      {mode === 'EXPENSE' && !isEditing && canInstall && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 p-3 space-y-2">
          <span className="block text-[11px] font-black uppercase tracking-widest text-zinc-500">
            Parcelamento
          </span>
          <div className="flex gap-2">
            {([
              { v: null,      txt: 'À vista' },
              { v: 'count',   txt: 'Nº parcelas' },
              { v: 'enddate', txt: 'Data final' },
            ] as const).map(({ v, txt }) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setInstallMode(v as any)}
                className={cn(
                  'flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all',
                  installMode === v
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-emerald-400',
                )}
              >
                {txt}
              </button>
            ))}
          </div>

          {installMode === 'count' && (
            <div>
              <label className={label}>Número de parcelas</label>
              <input
                type="number" min="2" max="240"
                placeholder="Ex: 12"
                className={input}
                value={installCount}
                onChange={(e) => setInstallCount(e.target.value)}
              />
            </div>
          )}

          {installMode === 'enddate' && (
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className={label}>Até a data</label>
                <input
                  type="date" min={date}
                  className={input}
                  value={installEnd}
                  onChange={(e) => setInstallEnd(e.target.value)}
                />
              </div>
              {installEnd && (
                <div>
                  <span className="block text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Total calculado</span>
                  <span className="text-3xl font-black text-emerald-500">{calcInstallments()}x</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── PIGGY: Destino (apenas criação) ───────────────────────────── */}
      {mode === 'PIGGY' && !isEditing && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 p-3 space-y-2">
          <span className="block text-[11px] font-black uppercase tracking-widest text-zinc-500">
            Destino
          </span>
          <div className="flex gap-2">
            {[{ v: 'piggy', txt: 'Cofrinho' }, { v: 'dream', txt: 'Sonho' }].map(({ v, txt }) => (
              <button
                key={v}
                type="button"
                onClick={() => { setInvestTarget(v as any); setPiggyBankId(''); setDreamId(''); }}
                className={cn(
                  'flex-1 py-2 rounded-xl text-[10px] font-black uppercase border transition-all',
                  investTarget === v
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-500',
                )}
              >
                {txt}
              </button>
            ))}
          </div>

          {investTarget === 'piggy' ? (
            <div>
              <label className={label}>Cofrinho</label>
              <select className={input} value={piggyBankId} onChange={(e) => setPiggyBankId(e.target.value)} required>
                <option value="">Selecione...</option>
                {piggyBanks.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — R$ {Number(p.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className={label}>Sonho</label>
              <select className={input} value={dreamId} onChange={(e) => setDreamId(e.target.value)} required>
                <option value="">Selecione...</option>
                {dreams.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} — R$ {Number(d.savedValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {Number(d.targetValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </option>
                ))}
              </select>
              {selectedDream && !selectedDream.piggyBankId && (
                <p className="text-[10px] text-amber-500 mt-1.5">
                  Sonho sem cofrinho vinculado — valor adicionado diretamente ao progresso.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Erro */}
      {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className={cn(
          'w-full py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center',
          success
            ? 'bg-emerald-500 text-white'
            : isEditing
            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
            : mode === 'EXPENSE'
            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-100'
            : 'bg-emerald-600 text-white hover:bg-emerald-700',
        )}
      >
        {submitting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : success ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          submitLabel()
        )}
      </button>
    </form>
  );
}
