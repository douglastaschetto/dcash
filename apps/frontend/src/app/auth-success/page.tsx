'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Wallet } from 'lucide-react';

function AuthSuccessContent() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token     = params.get('token');
    const firstLogin = params.get('firstLogin') === 'true';
    const name      = params.get('name') ?? '';
    const email     = params.get('email') ?? '';

    if (!token) {
      router.replace('/login');
      return;
    }

    localStorage.setItem('dcash:token', token);
    localStorage.setItem('dcash:user', JSON.stringify({ name, email }));

    router.replace(firstLogin ? '/plans' : '/dashboard');
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6"
      style={{ background: 'var(--background)', color: 'var(--foreground)' }}
    >
      <div className="relative">
        <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 rounded-3xl" />
        <div className="relative bg-emerald-500 p-5 rounded-3xl shadow-xl">
          <Wallet className="text-white" size={28} strokeWidth={2.5} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <Loader2 size={20} className="animate-spin text-emerald-500" />
        <p className="text-sm font-semibold">Autenticando com Google...</p>
        <p className="text-xs" style={{ color: 'color-mix(in srgb, var(--foreground) 50%, transparent)' }}>
          Aguarde, você será redirecionado em instantes.
        </p>
      </div>
    </div>
  );
}

export default function AuthSuccessPage() {
  return (
    <Suspense fallback={null}>
      <AuthSuccessContent />
    </Suspense>
  );
}
