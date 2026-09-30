'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { XCircle, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';

function FailureContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get('plan') ?? '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-[32px] bg-white dark:bg-zinc-900 shadow-2xl p-10 text-center">
        <XCircle className="h-14 w-14 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Pagamento não realizado</h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">
          Não foi possível processar seu pagamento. Nenhum valor foi cobrado.
        </p>
        <div className="mt-6 space-y-3">
          <button
            onClick={() => router.push(`/payment?plan=${plan}`)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition"
          >
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-700 py-3 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao perfil
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-emerald-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    }>
      <FailureContent />
    </Suspense>
  );
}
