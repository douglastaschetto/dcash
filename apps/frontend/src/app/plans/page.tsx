'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Star, ChevronRight, Sparkles } from '@/components/ui/icons';

const muted = 'var(--text-muted)';

const PLANS = [
  {
    key: 'free',
    title: 'Free',
    monthly: 0,
    popular: false,
    features: ['Até 50 transações/mês', 'Categorias básicas', 'Relatórios simples'],
  },
  {
    key: 'intermediario',
    title: 'Intermediário',
    monthly: 19.9,
    popular: true,
    features: ['Transações ilimitadas', 'Grupo familiar (até 5)', 'Metas, sonhos e cofrinhos', 'Google Agenda integrado'],
  },
  {
    key: 'pro',
    title: 'Premium',
    monthly: 34.9,
    popular: false,
    features: ['Tudo do Intermediário', 'Alertas via WhatsApp', 'Suporte prioritário', 'Acesso antecipado a novas funções'],
  },
];

const BASICO = { key: 'basico', title: 'Básico', monthly: 9.9 };

const YEARLY_DISCOUNT = 0.8; // 20% off, i.e. ~2.4 months free

export default function PlansPage() {
  const router = useRouter();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (!localStorage.getItem('dcash:token')) router.replace('/login');
  }, [router]);

  const handleSelectPlan = (planKey: string) => {
    if (planKey === 'free') {
      router.push('/onboarding');
    } else {
      router.push(`/payment?plan=${planKey}&billing=${billing}`);
    }
  };

  const priceFor = (monthly: number) => {
    if (monthly === 0) return { price: 'R$ 0', period: '' };
    const value = billing === 'yearly' ? monthly * YEARLY_DISCOUNT : monthly;
    return {
      price: value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      period: '/mês',
    };
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'var(--background)', color: 'var(--foreground)' }}
    >
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary-soft blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-primary-soft blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 min-h-screen overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={12} className="text-accent animate-pulse" />
              <span className="text-[11px] font-semibold text-accent">
                Primeiro acesso
              </span>
            </div>
            <h1 className="text-2xl font-semibold mb-3">Escolha seu plano</h1>
            <p className="text-base" style={{ color: muted }}>
              Selecione o plano ideal para seu momento. Pode mudar depois.
            </p>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <button
              onClick={() => setBilling('monthly')}
              className="rounded-lg px-4 py-2 text-xs font-semibold transition"
              style={{
                background: billing === 'monthly' ? 'var(--primary)' : 'var(--surface-secondary)',
                color: billing === 'monthly' ? 'var(--on-primary)' : 'var(--foreground)',
                border: '1px solid var(--border)',
              }}
            >
              Mensal
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className="rounded-lg px-4 py-2 text-xs font-semibold transition flex items-center gap-2"
              style={{
                background: billing === 'yearly' ? 'var(--primary)' : 'var(--surface-secondary)',
                color: billing === 'yearly' ? 'var(--on-primary)' : 'var(--foreground)',
                border: '1px solid var(--border)',
              }}
            >
              Anual
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ background: billing === 'yearly' ? 'rgb(0 0 0 / 0.12)' : 'var(--primary-soft)', color: billing === 'yearly' ? 'var(--on-primary)' : 'var(--primary-text)' }}
              >
                -20%
              </span>
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {PLANS.map((plan) => {
              const { price, period } = priceFor(plan.monthly);
              return (
                <button
                  key={plan.key}
                  onClick={() => handleSelectPlan(plan.key)}
                  className="relative rounded-2xl p-6 text-left transition hover:shadow-2xl group flex flex-col"
                  style={{
                    background: 'var(--card)',
                    border: `2px solid ${plan.popular ? 'var(--primary)' : 'var(--border)'}`,
                  }}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-6 flex items-center gap-1.5 bg-primary text-on-primary text-xs font-semibold tracking-wide px-3 py-1 rounded-lg">
                      <Star size={10} fill="white" /> Mais popular
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: muted }}>
                        {plan.title}
                      </p>
                      <div className="flex items-end gap-1">
                        <span className="text-2xl font-semibold">{price}</span>
                        {period && <span className="text-sm mb-1" style={{ color: muted }}>{period}</span>}
                      </div>
                    </div>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition group-hover:bg-primary shrink-0"
                      style={{ background: 'var(--primary-soft)' }}
                    >
                      <ChevronRight size={18} className="text-accent transition group-hover:text-white" />
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm" style={{ color: muted }}>
                        <Check size={14} className="text-accent shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          <p className="text-center text-sm mt-6" style={{ color: muted }}>
            Também disponível:{' '}
            <button
              onClick={() => handleSelectPlan(BASICO.key)}
              className="font-semibold underline transition hover:opacity-70"
              style={{ color: 'var(--primary-text)' }}
            >
              {BASICO.title} — {priceFor(BASICO.monthly).price}/mês
            </button>
          </p>

          <p className="text-center text-sm mt-4" style={{ color: muted }}>
            O plano Free não requer cartão de crédito. Planos pagos são cobrados {billing === 'yearly' ? 'anualmente' : 'mensalmente'}.
          </p>
        </div>
      </div>

      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 text-[11px] font-semibold pointer-events-none z-10"
        style={{ color: muted }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        DCASH · Finanças Familiares
      </div>
    </div>
  );
}
