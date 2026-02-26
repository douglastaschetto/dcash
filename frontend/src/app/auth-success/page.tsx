'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      // Salva o token vindo do backend
      localStorage.setItem('@dcash:token', token);
      
      // Redireciona para a dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } else {
      router.push('/login');
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <Loader2 className="text-emerald-500 animate-spin" size={48} />
      <h2 className="text-white font-black uppercase tracking-widest text-sm">
        Autenticando sua conta...
      </h2>
    </div>
  );
}