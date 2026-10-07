'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { XCircle, Loader2, ArrowLeft, RefreshCw } from '@/components/ui/icons';

function FailureContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get('plan') ?? '';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl p-10 text-center">
        <XCircle className="h-14 w-14 text-danger mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-fg">Pagamento não realizado</h2>
        <p className="text-sm text-fg-muted dark:text-fg-2 mt-2">
          Não foi possível processar seu pagamento. Nenhum valor foi cobrado.
        </p>
        <div className="mt-6 space-y-3">
          <button
            onClick={() => router.push(`/payment?plan=${plan}`)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary hover:bg-primary-hover transition"
          >
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold text-fg-2 hover:bg-hover transition"
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    }>
      <FailureContent />
    </Suspense>
  );
}
