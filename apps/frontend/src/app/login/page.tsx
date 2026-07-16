'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Lock, Mail, Globe, User, Ticket, Eye, EyeOff, Loader2,
  AlertCircle, ArrowLeft, Check, ChevronDown,
} from 'lucide-react';
import logoSrc from '@/app/dcash.png';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

type Step = 'login' | 'register' | 'forgot' | 'forgot-sent';

const muted = 'color-mix(in srgb, var(--foreground) 50%, transparent)';

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-secondary)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---- Sub-components ----

function FieldIcon({
  icon: Icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  right,
}: {
  icon: React.ElementType;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <Icon
        className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
        style={{ color: muted }}
      />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full h-11 rounded-xl pl-10 pr-10 text-sm outline-none transition placeholder:opacity-50"
        style={inputStyle}
      />
      {right && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{right}</div>
      )}
    </div>
  );
}

function FieldHint({ msg }: { msg: string }) {
  return (
    <p className="mt-1.5 text-xs" style={{ color: '#f87171' }}>{msg}</p>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs"
      style={{
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.3)',
        color: '#f87171',
      }}
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      {msg}
    </div>
  );
}

function PrimaryBtn({
  loading,
  disabled,
  label,
  color = '#10b981',
  onClick,
  type = 'submit',
}: {
  loading?: boolean;
  disabled?: boolean;
  label: string;
  color?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full h-11 rounded-xl text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
      style={{ background: color }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : label}
    </button>
  );
}

// ---- Main Page ----

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('login');

  // shared form fields
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [name, setName]             = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showInvite, setShowInvite]     = useState(false);

  // forgot
  const [forgotEmail, setForgotEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const clear = () => setError(null);

  // ---- Inline validation (register) ----
  const emailInvalid    = email.length > 0 && !EMAIL_RE.test(email);
  const passwordTooShort = password.length > 0 && password.length < 6;
  const passwordsMismatch = confirmPassword.length > 0 && confirmPassword !== password;
  const registerDisabled = !name || !EMAIL_RE.test(email) || password.length < 6 || password !== confirmPassword;

  // ---- Auth handlers ----

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); clear();
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, inviteCode: inviteCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Usuário ou senha inválidos.');
      localStorage.setItem('dcash:token', data.token);
      localStorage.setItem('dcash:user', JSON.stringify(data.user));
      router.push(data.firstLogin ? '/plans' : '/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerDisabled) return;
    setLoading(true); clear();
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, inviteCode: inviteCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erro ao criar conta.');
      localStorage.setItem('dcash:token', data.token);
      localStorage.setItem('dcash:user', JSON.stringify(data.user));
      router.push('/plans');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); clear();
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? 'Erro ao solicitar recuperação.');
      }
      setStep('forgot-sent');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // ---- Shared invite toggle ----
  const InviteField = (
    <div>
      <button
        type="button"
        onClick={() => setShowInvite(!showInvite)}
        className="flex items-center gap-2 text-xs font-semibold transition hover:opacity-70"
        style={{ color: '#10b981' }}
      >
        <Ticket size={14} />
        Entrar em um grupo familiar
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${showInvite ? 'rotate-180' : ''}`}
        />
      </button>
      {showInvite && (
        <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
          <FieldIcon
            icon={Ticket}
            value={inviteCode}
            onChange={(v) => setInviteCode(v.toUpperCase())}
            placeholder="DCASH-XXXX"
          />
        </div>
      )}
    </div>
  );

  // ---- Logo block ----
  const Logo = (
    <div className="flex items-center justify-center gap-3 mb-6">
      <Image src={logoSrc} alt="DCash" width={40} height={40} className="rounded-xl shadow-lg shrink-0" priority />
      <div className="flex flex-col leading-none">
        <h1 className="text-2xl font-black uppercase italic tracking-tighter">
          DCASH<span className="text-emerald-500">.</span>
        </h1>
        <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-emerald-500">
          Finanças Familiares
        </span>
      </div>
    </div>
  );

  // ---- Render ----
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'var(--background)', color: 'var(--foreground)' }}
    >
      {/* Ambient blobs */}
      <div className="fixed top-[-20%] left-[-10%] w-[45%] h-[45%] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[45%] h-[45%] bg-emerald-500/8 blur-[100px] rounded-full pointer-events-none" />

      {/* ── AUTH CARD (login / register / forgot / forgot-sent) ── */}
        <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-8">
          <div className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-500">
            {Logo}

            <div
              className="rounded-3xl p-6 shadow-2xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >

              {/* ── LOGIN ── */}
              {step === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold mb-0.5">Entrar</h2>
                    <p className="text-xs" style={{ color: muted }}>Acesse sua conta Dcash.</p>
                  </div>

                  <a
                    href={`${API}/auth/google`}
                    className="flex w-full h-11 items-center justify-center gap-3 rounded-2xl text-sm font-semibold transition hover:opacity-80"
                    style={{
                      border: '1px solid var(--border)',
                      background: 'var(--surface-secondary)',
                      color: 'var(--foreground)',
                    }}
                  >
                    <Globe className="h-4 w-4" />
                    Continuar com Google
                  </a>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                    <span className="text-xs" style={{ color: muted }}>ou</span>
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  </div>

                  {error && <ErrBox msg={error} />}

                  <div>
                    <FieldIcon icon={Mail} type="email" value={email} onChange={setEmail} placeholder="seu@email.com" required />
                    {emailInvalid && <FieldHint msg="Digite um e-mail válido." />}
                  </div>
                  <FieldIcon
                    icon={Lock}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={setPassword}
                    placeholder="Senha"
                    required
                    right={
                      <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ color: muted }}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />

                  {InviteField}

                  <PrimaryBtn loading={loading} label="Entrar" />

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => { setStep('forgot'); clear(); setForgotEmail(email); }}
                      className="transition hover:opacity-60"
                      style={{ color: muted }}
                    >
                      Esqueci a senha
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStep('register'); clear(); }}
                      className="font-semibold transition hover:opacity-70"
                      style={{ color: '#10b981' }}
                    >
                      Criar conta
                    </button>
                  </div>
                </form>
              )}

              {/* ── REGISTER ── */}
              {step === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => { setStep('login'); clear(); }} style={{ color: muted }}>
                      <ArrowLeft size={18} />
                    </button>
                    <div>
                      <h2 className="text-xl font-bold mb-0.5">Criar conta</h2>
                      <p className="text-xs" style={{ color: muted }}>Junte-se ao Dcash.</p>
                    </div>
                  </div>

                  {error && <ErrBox msg={error} />}

                  <FieldIcon
                    icon={User}
                    value={name}
                    onChange={(v) => setName(v)}
                    placeholder="Seu nome completo"
                    required
                  />
                  <div>
                    <FieldIcon icon={Mail} type="email" value={email} onChange={setEmail} placeholder="seu@email.com" required />
                    {emailInvalid && <FieldHint msg="Digite um e-mail válido." />}
                  </div>
                  <div>
                    <FieldIcon
                      icon={Lock}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={setPassword}
                      placeholder="Crie uma senha"
                      required
                      right={
                        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ color: muted }}>
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      }
                    />
                    {passwordTooShort && <FieldHint msg="Mínimo de 6 caracteres." />}
                  </div>
                  <div>
                    <FieldIcon
                      icon={Lock}
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder="Confirme sua senha"
                      required
                    />
                    {passwordsMismatch && <FieldHint msg="As senhas não coincidem." />}
                  </div>

                  {InviteField}

                  <PrimaryBtn loading={loading} label="Criar conta" disabled={registerDisabled} />
                </form>
              )}

              {/* ── FORGOT ── */}
              {step === 'forgot' && (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => { setStep('login'); clear(); }} style={{ color: muted }}>
                      <ArrowLeft size={18} />
                    </button>
                    <div>
                      <h2 className="text-xl font-bold mb-0.5">Recuperar senha</h2>
                      <p className="text-xs" style={{ color: muted }}>
                        Enviaremos um link para o seu e-mail.
                      </p>
                    </div>
                  </div>

                  {error && <ErrBox msg={error} />}

                  <FieldIcon
                    icon={Mail}
                    type="email"
                    value={forgotEmail}
                    onChange={setForgotEmail}
                    placeholder="seu@email.com"
                    required
                  />

                  <PrimaryBtn loading={loading} label="Enviar link de recuperação" />
                </form>
              )}

              {/* ── FORGOT SENT ── */}
              {step === 'forgot-sent' && (
                <div className="space-y-4 text-center py-1">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
                    style={{ background: '#10b98122' }}
                  >
                    <Check className="text-emerald-500" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold mb-1.5">E-mail enviado!</h2>
                    <p className="text-xs" style={{ color: muted }}>
                      Verifique sua caixa de entrada em{' '}
                      <strong style={{ color: 'var(--foreground)' }}>{forgotEmail}</strong>{' '}
                      e siga as instruções para redefinir sua senha.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('login')}
                    className="w-full h-11 rounded-xl text-sm font-semibold transition hover:opacity-80"
                    style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
                  >
                    Voltar ao login
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Footer label */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.5em] pointer-events-none z-10"
        style={{ color: muted }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        DCASH · Finanças Familiares
      </div>
    </div>
  );
}
