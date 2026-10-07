'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Wallet } from '@/components/ui/icons';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Google login lands here with a single-use `code` (never the session token).
 * It is exchanged by POST, then removed from the address bar/history.
 */
function AuthSuccessContent() {
  const router = useRouter();
  const params = useSearchParams();
  const done = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const code = params.get('code');
    window.history.replaceState(null, '', '/auth-success');
    if (!code) { router.replace('/login'); return; }

    fetch(`${API}/auth/oauth-exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = await res.json();
        localStorage.setItem('dcash:token', data.token);
        localStorage.setItem('dcash:user', JSON.stringify(data.user));
        router.replace(data.firstLogin ? '/plans' : '/painel');
      })
      .catch(() => {
        setFailed(true);
        setTimeout(() => router.replace('/login'), 2500);
      });
  }, [params, router]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6"
      style={{ background: 'var(--background)', color: 'var(--foreground)' }}
    >
      <div className="relative">
        <div className="absolute inset-0 bg-primary blur-2xl opacity-20 rounded-3xl" />
        <div className="relative bg-primary p-5 rounded-3xl shadow-xl">
          <Wallet className="text-white" size={28} strokeWidth={2.5} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        {failed ? (
          <>
            <p className="text-sm font-semibold">Não foi possível concluir o login com o Google.</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>O link expirou. Voltando para a tela de login…</p>
          </>
        ) : (
          <>
            <Loader2 size={20} className="animate-spin text-accent" />
            <p className="text-sm font-semibold">Autenticando com Google...</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Aguarde, você será redirecionado em instantes.
            </p>
          </>
        )}
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
