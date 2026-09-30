'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-[32px] bg-white dark:bg-zinc-900 shadow-2xl p-10 text-center">
        {status === 'checking' ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Confirmando pagamento...</h2>
            <p className="text-sm text-slate-400 dark:text-zinc-500 mt-2">Aguarde enquanto verificamos sua transação.</p>
          </>
        ) : status === 'activated' ? (
          <>
            <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Pagamento confirmado!</h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">
              Seu plano <strong>{PLAN_LABELS[plan] ?? plan}</strong> foi ativado com sucesso.
            </p>
            <button
              onClick={() => router.push('/onboarding')}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition"
            >
              Continuar <ArrowRight className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-14 w-14 text-amber-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Pagamento em análise</h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">
              Seu pagamento foi recebido e está sendo processado. Seu plano será ativado assim que confirmado (geralmente em minutos para PIX e cartão).
            </p>
            <button
              onClick={() => router.push('/profile')}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition"
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
      <div className="min-h-screen flex items-center justify-center bg-emerald-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
