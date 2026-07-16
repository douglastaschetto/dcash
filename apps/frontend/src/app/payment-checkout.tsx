'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, ShieldCheck, Zap, Crown, Star,
  Check, Loader2, QrCode, CreditCard, Barcode, ArrowLeft,
} from 'lucide-react';

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
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-300',
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
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-400',
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
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-400',
    perks: [
      'Tudo do plano Intermediário',
      'Alertas via WhatsApp',
      'Suporte prioritário',
      'Acesso antecipado a novas funções',
    ],
  },
};

export function PaymentCheckout({ planKey }: { planKey: string }) {
  const router = useRouter();
  const plan = PLANS[planKey?.toLowerCase()];
  const [loading, setLoading] = useState<'mercadopago' | 'stripe' | null>(null);
  const [error, setError] = useState('');

  if (!plan) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-6">
        <div className="rounded-[32px] border border-emerald-200 bg-white p-10 shadow-xl text-center space-y-4 max-w-sm w-full">
          <ShieldCheck className="mx-auto h-12 w-12 text-slate-300" />
          <h1 className="text-xl font-bold text-emerald-950">Plano não encontrado</h1>
          <p className="text-sm text-slate-500">Acesse a página de perfil para escolher um plano.</p>
          <button
            onClick={() => router.push('/profile')}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition"
          >
            Ver planos <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const PlanIcon = plan.icon;

  const handlePayMercadoPago = async () => {
    setLoading('mercadopago');
    setError('');
    try {
      const res = await fetch(`${API}/payment/create-preference`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ plan: planKey.toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao criar preferência de pagamento');

      // Em dev usa sandbox_init_point; em prod usa init_point
      const url = process.env.NODE_ENV === 'production'
        ? data.checkoutUrl
        : (data.sandboxUrl || data.checkoutUrl);

      window.location.href = url;
    } catch (err: any) {
      setError(err.message ?? 'Erro ao processar. Tente novamente.');
      setLoading(null);
    }
  };

  const handlePayStripe = async () => {
    setLoading('stripe');
    setError('');
    try {
      const res = await fetch(`${API}/payment/stripe/create-session`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ plan: planKey.toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao criar sessão de pagamento Stripe');
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      setError(err.message ?? 'Erro ao processar. Tente novamente.');
      setLoading(null);
    }
  };

  const priceStr = plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-emerald-300 hover:text-white mb-6 text-sm transition"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="rounded-[32px] bg-white shadow-2xl overflow-hidden">

          {/* Plan header */}
          <div className={`${plan.bg} ${plan.border} border-b px-8 py-6`}>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm shrink-0">
                <PlanIcon className={`h-5 w-5 ${plan.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Você está assinando</p>
                <p className={`text-lg font-bold ${plan.color}`}>DCash {plan.label}</p>
              </div>
            </div>
            <div className="flex items-baseline gap-1 mt-4">
              <span className="text-4xl font-black text-slate-900">{priceStr}</span>
              <span className="text-slate-400 text-sm">/mês</span>
            </div>
          </div>

          {/* Perks */}
          <div className="px-8 py-5 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Incluído no plano</p>
            <ul className="space-y-2">
              {plan.perks.map(p => (
                <li key={p} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <Check className={`h-4 w-4 shrink-0 mt-0.5 ${plan.color}`} />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Payment methods */}
          <div className="px-8 py-4 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Formas de pagamento aceitas</p>
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5 text-xs text-slate-600"><QrCode className="h-3.5 w-3.5 text-emerald-600" /> PIX</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-600"><CreditCard className="h-3.5 w-3.5 text-blue-500" /> Cartão de crédito</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-600"><Barcode className="h-3.5 w-3.5 text-slate-400" /> Boleto</span>
            </div>
          </div>

          {/* CTA */}
          <div className="px-8 py-6 space-y-3">
            {error && (
              <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</p>
            )}
            <button
              onClick={handlePayStripe}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-slate-900 hover:bg-slate-800 py-4 text-sm font-bold text-white disabled:opacity-60 transition shadow-lg"
            >
              {loading === 'stripe' ? (
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
            <button
              onClick={handlePayMercadoPago}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-blue-500 hover:bg-blue-600 py-4 text-sm font-bold text-white disabled:opacity-60 transition shadow-lg"
            >
              {loading === 'mercadopago' ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Preparando checkout...</>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="14" fill="#fff"/>
                    <path d="M10.5 20.5c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" stroke="#009ee3" strokeWidth="2.5" strokeLinecap="round"/>
                    <circle cx="16" cy="11" r="3" fill="#009ee3"/>
                  </svg>
                  Pagar com Mercado Pago
                </>
              )}
            </button>
            <p className="text-center text-xs text-slate-400">
              Escolha o gateway de sua preferência. O plano é ativado automaticamente após confirmação do pagamento.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-emerald-400/50 mt-5">Cancele a qualquer momento no seu perfil.</p>
      </div>
    </div>
  );
}
