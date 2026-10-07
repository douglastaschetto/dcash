'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, ShieldCheck, Zap, Crown,
  Check, Loader2, CreditCard, ArrowLeft,
} from '@/components/ui/icons';

/** Same 20% discount already advertised on /plans — kept in sync with the backend's YEARLY_DISCOUNT. */
const YEARLY_DISCOUNT = 0.8;

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dcash:token') : null;
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

const PLANS: Record<string, {
  label: string;
  price: number;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  perks: string[];
}> = {
  basico: {
    label: 'Básico',
    price: 9.90,
    icon: Zap,
    color: 'text-info',
    bg: 'bg-info-soft',
    border: 'border-info/30',
    perks: [
      'Tudo do plano Gratuito',
      'Categorias ilimitadas',
      'Contas fixas mensais',
      'Exportar relatórios',
      'Desafios financeiros',
    ],
  },
  intermediario: {
    label: 'Intermediário',
    price: 19.90,
    icon: Crown,
    color: 'text-accent',
    bg: 'bg-primary-soft',
    border: 'border-primary',
    perks: [
      'Tudo do plano Básico',
      'Grupo familiar (até 5 membros)',
      'Metas, sonhos e cofrinhos',
      'Google Agenda integrado',
      'Cartões ilimitados',
    ],
  },
  pro: {
    label: 'Pro',
    price: 34.90,
    icon: Crown,
    color: 'text-warning',
    bg: 'bg-warning-soft',
    border: 'border-warning',
    perks: [
      'Tudo do plano Intermediário',
      'Alertas via WhatsApp',
      'Suporte prioritário',
      'Acesso antecipado a novas funções',
    ],
  },
};

export function PaymentCheckout({ planKey, billing = 'monthly' }: { planKey: string; billing?: 'monthly' | 'yearly' }) {
  const router = useRouter();
  const plan = PLANS[planKey?.toLowerCase()];
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(billing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!plan) {
    return (
      <div className="min-h-screen bg-primary-soft dark:bg-surface flex items-center justify-center p-6">
        <div className="rounded-2xl border border-primary-border dark:border-border bg-card p-10 shadow-xl text-center space-y-4 max-w-sm w-full">
          <ShieldCheck className="mx-auto h-12 w-12 text-fg-disabled dark:text-fg-muted" />
          <h1 className="text-xl font-semibold text-fg dark:text-accent">Plano não encontrado</h1>
          <p className="text-sm text-fg-muted dark:text-fg-2">Acesse a página de perfil para escolher um plano.</p>
          <button
            onClick={() => router.push('/profile')}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover transition"
          >
            Ver planos <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const PlanIcon = plan.icon;

  const handlePayStripe = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/payment/stripe/create-session`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ plan: planKey.toLowerCase(), billingCycle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao criar sessão de pagamento Stripe');
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      setError(err.message ?? 'Erro ao processar. Tente novamente.');
      setLoading(false);
    }
  };

  const displayPrice = billingCycle === 'yearly' ? plan.price * YEARLY_DISCOUNT : plan.price;
  const priceStr = displayPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-emerald-300 hover:text-white mb-6 text-sm transition"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="rounded-2xl bg-card shadow-2xl overflow-hidden">

          {/* Plan header */}
          <div className={`${plan.bg} dark:bg-surface-2 ${plan.border} dark:border-border border-b px-8 py-6`}>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-card shadow-sm shrink-0">
                <PlanIcon className={`h-5 w-5 ${plan.color}`} />
              </div>
              <div>
                <p className="text-xs text-fg-muted dark:text-fg-2">Você está assinando</p>
                <p className={`text-lg font-semibold ${plan.color}`}>DCash {plan.label}</p>
              </div>
            </div>
            <div className="flex items-baseline gap-1 mt-4">
              <span className="text-2xl font-semibold text-fg">{priceStr}</span>
              <span className="text-fg-muted text-sm">{billingCycle === 'yearly' ? '/ano' : '/mês'}</span>
            </div>
          </div>

          {/* Billing cycle toggle */}
          <div className="px-8 py-4 border-b border-border flex items-center justify-center gap-3">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition border ${
                billingCycle === 'monthly'
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-card text-fg-2 border-border'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition border flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-card text-fg-2 border-border'
              }`}
            >
              Anual
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                billingCycle === 'yearly' ? 'bg-white/25 text-white' : 'bg-primary-soft text-accent'
              }`}>
                -20%
              </span>
            </button>
          </div>

          {/* Perks */}
          <div className="px-8 py-5 border-b border-border">
            <p className="text-xs font-semibold text-fg-muted tracking-wide mb-3">Incluído no plano</p>
            <ul className="space-y-2">
              {plan.perks.map(p => (
                <li key={p} className="flex items-start gap-2.5 text-sm text-fg-2">
                  <Check className={`h-4 w-4 shrink-0 mt-0.5 ${plan.color}`} />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Payment method */}
          <div className="px-8 py-4 bg-surface-2 border-b border-border">
            <span className="flex items-center gap-1.5 text-xs text-fg-2"><CreditCard className="h-3.5 w-3.5 text-info" /> Cartão de crédito, via Stripe</span>
          </div>

          {/* CTA */}
          <div className="px-8 py-6 space-y-3">
            {error && (
              <p className="rounded-xl bg-danger-soft border border-danger/30 px-4 py-3 text-sm text-danger">{error}</p>
            )}
            <button
              onClick={handlePayStripe}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-inverse hover:opacity-90 py-4 text-sm font-semibold text-white disabled:opacity-60 transition shadow-lg"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Preparando checkout...</>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                    <rect width="32" height="32" rx="6" fill="#635bff"/>
                    <path d="M14.6 13.2c0-.7.6-1 1.5-1 1.4 0 3.1.4 4.4 1.2v-4.2c-1.5-.6-2.9-.8-4.4-.8-3.6 0-6 1.9-6 5 0 4.9 6.7 4.1 6.7 6.2 0 .8-.7 1.1-1.7 1.1-1.5 0-3.4-.6-4.9-1.4v4.3c1.7.7 3.4 1 4.9 1 3.7 0 6.2-1.8 6.2-5 0-5.3-6.7-4.3-6.7-6.4Z" fill="#fff"/>
                  </svg>
                  Pagar com Stripe
                </>
              )}
            </button>
            <p className="text-center text-xs text-fg-muted">
              O plano é ativado automaticamente após confirmação do pagamento.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-emerald-400/50 mt-5">Cancele a qualquer momento no seu perfil.</p>
      </div>
    </div>
  );
}
