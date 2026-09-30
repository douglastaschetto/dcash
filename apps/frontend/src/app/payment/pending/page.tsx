'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Clock, Loader2, ArrowRight } from 'lucide-react';

function PendingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get('plan') ?? '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-[32px] bg-white dark:bg-zinc-900 shadow-2xl p-10 text-center">
        <Clock className="h-14 w-14 text-amber-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Pagamento pendente</h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">
          Seu pagamento está sendo processado. Se escolheu boleto, pode levar até 3 dias úteis. Para PIX e cartão, a confirmação é quase imediata.
        </p>
        <p className="text-xs text-slate-400 dark:text-zinc-500 mt-3">
          Assim que o pagamento for confirmado, seu plano será ativado automaticamente e você receberá uma notificação.
        </p>
        <button
          onClick={() => router.push('/profile')}
          className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition"
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
      <div className="min-h-screen flex items-center justify-center bg-emerald-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    }>
      <PendingContent />
    </Suspense>
  );
}
