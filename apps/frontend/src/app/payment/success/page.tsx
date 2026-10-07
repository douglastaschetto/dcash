'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, ArrowRight } from '@/components/ui/icons';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const PLAN_LABELS: Record<string, string> = {
  basico: 'Básico',
  intermediario: 'Intermediário',
  pro: 'Pro',
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get('plan') ?? '';
  const preferenceId = searchParams.get('preference_id') ?? '';

  const [status, setStatus] = useState<'checking' | 'activated' | 'pending'>('checking');

  useEffect(() => {
    if (!plan) { setStatus('pending'); return; }

    const token = localStorage.getItem('dcash:token');
    if (!token) { router.push('/login'); return; }

    // Poll for activation (webhook may fire before or after redirect)
    let attempts = 0;
    const check = async () => {
      try {
        const res = await fetch(
          `${API}/payment/status?plan=${plan}&preference_id=${preferenceId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = await res.json();
        if (data.alreadyActivated || data.status === 'approved') {
          setStatus('activated');
        } else if (++attempts < 8) {
          setTimeout(check, 2000);
        } else {
          setStatus('pending');
        }
      } catch {
        setStatus('pending');
      }
    };
    check();
  }, [plan, preferenceId, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl p-10 text-center">
        {status === 'checking' ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-accent mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-fg">Confirmando pagamento...</h2>
            <p className="text-sm text-fg-muted mt-2">Aguarde enquanto verificamos sua transação.</p>
          </>
        ) : status === 'activated' ? (
          <>
            <CheckCircle2 className="h-14 w-14 text-accent mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-fg">Pagamento confirmado!</h2>
            <p className="text-sm text-fg-muted dark:text-fg-2 mt-2">
              Seu plano <strong>{PLAN_LABELS[plan] ?? plan}</strong> foi ativado com sucesso.
            </p>
            <button
              onClick={() => router.push('/onboarding')}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary hover:bg-primary-hover transition"
            >
              Continuar <ArrowRight className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-14 w-14 text-warning mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-fg">Pagamento em análise</h2>
            <p className="text-sm text-fg-muted dark:text-fg-2 mt-2">
              Seu pagamento foi recebido e está sendo processado. Seu plano será ativado assim que confirmado (geralmente em minutos para PIX e cartão).
            </p>
            <button
              onClick={() => router.push('/profile')}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary hover:bg-primary-hover transition"
            >
              Ver meu perfil <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
