'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, Loader2, AlertCircle, Check } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const muted = 'color-mix(in srgb, var(--foreground) 50%, transparent)';

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-secondary)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
};

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;
  const disabled = !token || password.length < 6 || password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Não foi possível redefinir a senha.');
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: 'var(--background)', color: 'var(--foreground)' }}
    >
      <div className="w-full max-w-sm">
        <div
          className="rounded-3xl p-6 shadow-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {!token ? (
            <div className="text-center py-4">
              <AlertCircle className="mx-auto mb-3 text-red-500" size={32} />
              <h2 className="text-lg font-bold mb-1.5">Link inválido</h2>
              <p className="text-xs mb-5" style={{ color: muted }}>
                Este link de redefinição está incompleto ou expirou.
              </p>
              <Link
                href="/login"
                className="block w-full h-11 leading-[2.75rem] rounded-xl text-sm font-semibold text-center transition hover:opacity-80"
                style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
              >
                Voltar ao login
              </Link>
            </div>
          ) : done ? (
            <div className="text-center py-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: '#10b98122' }}
              >
                <Check className="text-emerald-500" size={24} />
              </div>
              <h2 className="text-lg font-bold mb-1.5">Senha redefinida!</h2>
              <p className="text-xs" style={{ color: muted }}>Redirecionando para o login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: '#10b981' }}>
                  Nova Senha
                </span>
                <div className="mt-1.5 h-[3px] w-9 rounded-full" style={{ background: '#10b981' }} />
                <p className="mt-3 text-sm" style={{ color: muted }}>
                  Escolha uma nova senha para sua conta Dcash.
                </p>
              </div>

              {error && (
                <div
                  className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: muted }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nova senha"
                  required
                  className="w-full h-11 rounded-xl pl-10 pr-10 text-sm outline-none transition placeholder:opacity-50"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: muted }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: muted }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme a nova senha"
                    required
                    className="w-full h-11 rounded-xl pl-10 pr-10 text-sm outline-none transition placeholder:opacity-50"
                    style={inputStyle}
                  />
                </div>
                {mismatch && <p className="mt-1.5 text-xs" style={{ color: '#f87171' }}>As senhas não coincidem.</p>}
              </div>

              <button
                type="submit"
                disabled={loading || disabled}
                className="w-full h-11 rounded-xl text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: '#10b981' }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Redefinir senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
