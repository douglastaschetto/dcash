'use client';

import { useState, useEffect } from 'react';
import { X, Receipt, Loader2, CreditCard, Landmark, CalendarDays, Info } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { CurrencyInput } from '@/lib/currency-input';
import api from '@/services/api';

type PaymentMethod = { id: string; name: string; type?: string };
type Category = { id: string; name: string; color?: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: any, id?: string) => Promise<void>;
  initialData: any | null;
  paymentMethods: PaymentMethod[];
};

type PayType = 'OTHER' | 'CREDIT_CARD';

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function FixedBillModal({ isOpen, onClose, onSave, initialData, paymentMethods }: Props) {
  const isEdit = !!initialData?.id && initialData.type === 'transaction';

  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [payType, setPayType] = useState<PayType>('OTHER');

  const [form, setForm] = useState({
    description: '',
    amount: 0,
    dayOfMonth: 5,
    categoryId: '',
    paymentMethodId: '',
    endDate: '',
    generateTransactions: true,
  });

  const f = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  /* ── Load categories (only for regular bills) ─────────────────── */
  useEffect(() => {
    if (!isOpen || payType === 'CREDIT_CARD') return;
    api.get('/categories').then(({ data }) => setCategories(data ?? [])).catch(() => {});
  }, [isOpen, payType]);

  /* ── Pre-fill on edit ────────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      const pt = initialData.paymentMethodType === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'OTHER';
      setPayType(pt);
      setForm({
        description: initialData.title ?? '',
        amount: Number(initialData.value ?? 0),
        dayOfMonth: initialData.dayOfMonth ?? 5,
        categoryId: initialData.categoryId ?? '',
        paymentMethodId: initialData.paymentMethodId ?? '',
        endDate: '',
        generateTransactions: true,
      });
    } else {
      setPayType('OTHER');
      setForm({
        description: '',
        amount: 0,
        dayOfMonth: 5,
        categoryId: '',
        paymentMethodId: '',
        endDate: '',
        generateTransactions: true,
      });
    }
  }, [initialData, isOpen]);

  /* ── Submit ──────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let payload: any;

      if (payType === 'CREDIT_CARD') {
        // Credit card: no amount, no category, no end date, perpetual rule
        payload = {
          description: form.description,
          amount: 0,
          dayOfMonth: form.dayOfMonth,
          paymentMethodType: 'CREDIT_CARD',
          paymentMethodId: form.paymentMethodId || null,
          generateTransactions: false,
        };
      } else {
        // Regular bill: has amount, category, end date, generates transactions
        payload = {
          description: form.description,
          amount: form.amount,
          paymentMethodType: 'OTHER',
          paymentMethodId: null,
          categoryId: form.categoryId || undefined,
        };
        if (!isEdit) {
          payload.dayOfMonth = form.dayOfMonth;
          payload.endDate = form.endDate || undefined;
          payload.generateTransactions = form.generateTransactions;
        }
      }

      await onSave(payload, isEdit ? initialData.id : undefined);
      onClose();
    } catch { alert('Erro ao salvar conta fixa.'); } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isCreditCard = payType === 'CREDIT_CARD';
  const creditCards = paymentMethods.filter(
    (p) => p.type === 'CREDIT_CARD' || p.type === 'credit_card',
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-card dark:bg-surface shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — color adapts to type */}
        <div
          className={cn(
            'px-5 pt-5 pb-3.5 flex items-center justify-between border-b-2 shrink-0 transition-colors',
            isCreditCard ? 'border-info/20' : 'border-warning/20',
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2.5 rounded-xl transition-colors',
                isCreditCard ? 'bg-info-soft' : 'bg-warning-soft',
              )}
            >
              {isCreditCard
                ? <CreditCard size={20} className="text-info" />
                : <Receipt size={20} className="text-warning" />}
            </div>
            <div>
              <p className="text-[11px] font-semibold text-fg-muted">
                {isEdit ? 'Editar Lançamento' : isCreditCard ? 'Vincular Cartão' : 'Nova Conta Fixa'}
              </p>
              <h2 className="text-lg font-semibold tracking-tight text-fg leading-none mt-0.5">
                {isEdit ? initialData?.title : isCreditCard ? 'Fatura Recorrente' : 'Criar Regra'}
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

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-3">

          {/* ── Type selector (only on create) ────────────────────── */}
          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-fg-muted ml-1">
                Tipo de Conta
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'OTHER', label: 'Conta Comum', sub: 'Luz, água, internet...', Icon: Landmark, color: 'orange' },
                  { id: 'CREDIT_CARD', label: 'Cartão de Crédito', sub: 'Fatura mensal', Icon: CreditCard, color: 'purple' },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPayType(t.id)}
                    className={cn(
                      'py-2.5 px-3 rounded-xl border-2 flex flex-col items-start gap-1 transition-all text-left',
                      payType === t.id && t.color === 'orange'
                        ? 'border-warning bg-warning-soft text-warning'
                        : payType === t.id && t.color === 'purple'
                          ? 'border-info bg-info-soft text-info'
                          : 'border-border text-fg-muted hover:border-border-hover',
                    )}
                  >
                    <t.Icon size={16} />
                    <span className="text-[11px] font-semibold leading-none">{t.label}</span>
                    <span className="text-[11px] font-medium opacity-60 leading-none">{t.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Description ─────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-fg-muted ml-1">
              {isCreditCard ? 'Nome do Cartão *' : 'Descrição *'}
            </label>
            <input
              required
              value={form.description}
              onChange={(e) => f('description', e.target.value)}
              placeholder={isCreditCard ? 'Ex: Nubank, Itaú, Bradesco...' : 'Ex: Conta de Luz, Internet, IPTU...'}
              className={cn(
                'w-full bg-surface-2 dark:bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none transition',
                isCreditCard ? 'focus:border-info' : 'focus:border-primary',
              )}
            />
          </div>

          {/* ══ CREDIT CARD FLOW ══════════════════════════════════════ */}
          {isCreditCard && (
            <>
              {/* Info banner */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-info-soft border border-info/20">
                <Info size={14} className="text-info mt-0.5 shrink-0" />
                <p className="text-[11px] font-medium text-fg-muted dark:text-fg-2 leading-relaxed">
                  O valor da fatura é calculado automaticamente com base nas
                  transações realizadas neste cartão no período selecionado.
                  Não há data de encerramento — o vínculo é permanente.
                </p>
              </div>

              {/* Card selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-fg-muted ml-1">
                  Cartão de Crédito *
                </label>
                <select
                  required
                  value={form.paymentMethodId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const pm = (creditCards.length > 0 ? creditCards : paymentMethods).find(
                      (p) => p.id === id,
                    ) as any;
                    f('paymentMethodId', id);
                    if (pm?.dueDay) f('dayOfMonth', Number(pm.dueDay));
                  }}
                  className="w-full bg-surface-2 dark:bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-info transition appearance-none"
                >
                  <option value="">Selecione o cartão...</option>
                  {(creditCards.length > 0 ? creditCards : paymentMethods).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Due day — auto-filled from the payment method, read-only */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-fg-muted ml-1">
                  Dia de Vencimento da Fatura
                </label>
                <div className="relative">
                  <input
                    readOnly
                    value={form.dayOfMonth || '—'}
                    className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-fg-muted dark:text-fg-2 cursor-default select-none"
                  />
                  {!form.paymentMethodId && (
                    <p className="text-[11px] text-fg-muted mt-1 ml-1">
                      Selecione o cartão para preencher automaticamente
                    </p>
                  )}
                </div>
              </div>

              {/* Credit card summary preview */}
              {form.paymentMethodId && (
                <div className="p-3 rounded-xl bg-info-soft border border-info/20 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-fg-muted">Cobrança</p>
                    <p className="text-sm font-semibold text-info leading-none mt-0.5">
                      Automática por transações
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-fg-muted">Vencimento</p>
                    <p className="text-xl font-semibold text-fg">
                      {form.dayOfMonth ? `Dia ${form.dayOfMonth}` : '—'}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ══ REGULAR BILL FLOW ══════════════════════════════════════ */}
          {!isCreditCard && (
            <>
              {/* Amount + Day */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-fg-muted ml-1">
                    Valor Base *
                  </label>
                  <CurrencyInput
                    value={form.amount}
                    onChange={(v) => f('amount', v)}
                    placeholder="0,00"
                    className="w-full bg-surface-2 dark:bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-primary transition"
                  />
                </div>
                {!isEdit && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-fg-muted ml-1">
                      Dia do Vencimento *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      required
                      value={form.dayOfMonth}
                      onChange={(e) => f('dayOfMonth', Number(e.target.value))}
                      className="w-full bg-surface-2 dark:bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-primary transition"
                    />
                  </div>
                )}
              </div>

              {/* Category */}
              {categories.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-fg-muted ml-1">
                    Categoria
                  </label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => f('categoryId', e.target.value)}
                    className="w-full bg-surface-2 dark:bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-primary transition appearance-none"
                  >
                    <option value="">Selecione...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* End date + toggle (create only) */}
              {!isEdit && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-fg-muted ml-1 flex items-center gap-1.5">
                      <CalendarDays size={11} /> Gerar parcelas até (opcional)
                    </label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => f('endDate', e.target.value)}
                      className="w-full bg-surface-2 dark:bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-primary transition"
                    />
                    <p className="text-[11px] text-fg-muted ml-1">
                      Sem data: gera lançamentos nos próximos 12 meses automaticamente
                    </p>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div
                      onClick={() => f('generateTransactions', !form.generateTransactions)}
                      className={cn(
                        'relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0',
                        form.generateTransactions ? 'bg-primary' : 'bg-track',
                      )}
                    >
                      <div
                        className={cn(
                          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
                          form.generateTransactions ? 'translate-x-5' : 'translate-x-0.5',
                        )}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-fg-2">
                        {form.generateTransactions ? 'Gerar lançamentos automáticos' : 'Apenas como regra'}
                      </p>
                      <p className="text-[11px] text-fg-muted mt-0.5">
                        {form.generateTransactions
                          ? 'Cria uma transação por mês no dia do vencimento'
                          : 'Nenhuma transação será criada'}
                      </p>
                    </div>
                  </label>
                </>
              )}

              {/* Preview */}
              {form.amount > 0 && (
                <div className="p-3 rounded-xl bg-warning-soft border border-warning/20 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-fg-muted">Valor mensal</p>
                    <p className="text-lg font-semibold text-warning leading-none mt-0.5">
                      {fmt(form.amount)}
                    </p>
                  </div>
                  {!isEdit && (
                    <div className="text-right">
                      <p className="text-[11px] font-semibold text-fg-muted">Vence dia</p>
                      <p className="text-xl font-semibold text-fg">{form.dayOfMonth}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={saving}
            className={cn(
              'btn btn-primary w-full !h-10',
            )}
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {isEdit ? 'Salvar Lançamento' : isCreditCard ? 'Vincular Cartão' : 'Criar Conta Fixa'}
          </button>
        </form>
      </div>
    </div>
  );
}
