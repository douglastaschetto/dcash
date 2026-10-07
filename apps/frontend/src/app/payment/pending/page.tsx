'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Clock, Loader2, ArrowRight } from '@/components/ui/icons';

function PendingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get('plan') ?? '';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl p-10 text-center">
        <Clock className="h-14 w-14 text-warning mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-fg">Pagamento pendente</h2>
        <p className="text-sm text-fg-muted dark:text-fg-2 mt-2">
          Seu pagamento está sendo processado. Se escolheu boleto, pode levar até 3 dias úteis. Para PIX e cartão, a confirmação é quase imediata.
        </p>
        <p className="text-xs text-fg-muted mt-3">
          Assim que o pagamento for confirmado, seu plano será ativado automaticamente e você receberá uma notificação.
        </p>
        <button
          onClick={() => router.push('/profile')}
          className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary hover:bg-primary-hover transition"
        >
          Ver meu perfil <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function PaymentPendingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    }>
      <PendingContent />
    </Suspense>
  );
}
