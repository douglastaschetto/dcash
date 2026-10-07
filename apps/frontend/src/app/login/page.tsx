'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Lock, Mail, Globe, User, Ticket, Eye, EyeOff, Loader2,
  AlertCircle, ArrowLeft, ArrowRight, ChevronDown, ShieldCheck,
} from '@/components/ui/icons';
import logoSrc from '@/app/dcash.png';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

type Step = 'login' | 'register' | 'forgot' | 'code' | 'reset';
type Purpose = 'verify_email' | 'login';

const DEVICE_KEY = 'dcash:device';
const RESEND_SECONDS = 45;

const muted = 'var(--text-muted)';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Same rule as the API: 8+ characters with letters and numbers. */
const passwordProblem = (pw: string) =>
  pw.length === 0 ? null
    : pw.length < 8 ? 'Mínimo de 8 caracteres.'
      : !/[A-Za-z]/.test(pw) || !/\d/.test(pw) ? 'Use letras e números.'
        : null;

/* Copy shown on the brand panel — always promotes the opposite action. */
const PANEL_COPY: Record<Step, { eyebrow: string; title: string; body: string; cta: string; ctaStep: Step }> = {
  login: {
    eyebrow: 'Novo por aqui?',
    title: 'Organize as finanças da sua família.',
    body: 'Controle gastos, metas e investimentos em um só lugar, com clareza e sem planilhas.',
    cta: 'Criar conta',
    ctaStep: 'register',
  },
  register: {
    eyebrow: 'Já tem conta?',
    title: 'Bem-vindo de volta!',
    body: 'Entre para continuar acompanhando o orçamento da sua família.',
    cta: 'Entrar',
    ctaStep: 'login',
  },
  forgot: {
    eyebrow: 'Tudo certo',
    title: 'Vamos recuperar seu acesso.',
    body: 'Informe seu e-mail e enviaremos um código de 6 números para você criar uma nova senha.',
    cta: 'Voltar ao login',
    ctaStep: 'login',
  },
  code: {
    eyebrow: 'Verificação em duas etapas',
    title: 'Só pra garantir que é você.',
    body: 'Enviamos um código para o seu e-mail. Ele protege sua conta mesmo se alguém descobrir sua senha.',
    cta: 'Voltar ao login',
    ctaStep: 'login',
  },
  reset: {
    eyebrow: 'Quase lá',
    title: 'Crie uma nova senha.',
    body: 'Use o código que chegou no seu e-mail. Por segurança, os aparelhos lembrados serão desconectados.',
    cta: 'Voltar ao login',
    ctaStep: 'login',
  },
};

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
        className="field !h-10 !pl-10 !pr-10"
      />
      {right && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{right}</div>
      )}
    </div>
  );
}

function FieldHint({ msg }: { msg: string }) {
  return (
    <p className="mt-1.5 text-xs" style={{ color: 'var(--danger)' }}>{msg}</p>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs"
      style={{
        background: 'var(--danger-soft)',
        border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
        color: 'var(--danger)',
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
  color = 'var(--primary)',
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
      className="w-full h-10 rounded-lg text-[13px] font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
      style={{ background: color }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : label}
    </button>
  );
}

function Eyebrow({ label, subtitle, onBack }: { label: string; subtitle: string; onBack?: () => void }) {
  const content = (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight text-fg">{label}</h2>
      <p className="mt-1.5 text-sm" style={{ color: muted }}>{subtitle}</p>
    </div>
  );
  if (!onBack) return <div className="mb-6">{content}</div>;
  return (
    <div className="flex items-start gap-3 mb-6">
      <button
        type="button"
        onClick={onBack}
        className="mt-1 p-1.5 -ml-1.5 rounded-lg transition hover:opacity-70 shrink-0"
        style={{ color: muted }}
      >
        <ArrowLeft size={18} />
      </button>
      {content}
    </div>
  );
}

/** Six separate digit boxes: typing advances, backspace goes back, pasting fills all. */
function CodeInput({ value, onChange, onComplete, disabled }: {
  value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');
  useEffect(() => { refs.current[0]?.focus(); }, []);

  const setAt = (i: number, d: string) => {
    const next = (value.slice(0, i) + d + value.slice(i + 1)).replace(/\D/g, '').slice(0, 6);
    onChange(next);
    if (next.length === 6) onComplete?.(next);
  };
  return (
    <div className="flex justify-between gap-2" onPaste={(e) => {
      const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      if (!text) return;
      e.preventDefault();
      onChange(text);
      refs.current[Math.min(text.length, 5)]?.focus();
      if (text.length === 6) onComplete?.(text);
    }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={`Dígito ${i + 1}`}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(-1);
            if (!v) return;
            setAt(i, v);
            refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              e.preventDefault();
              if (d) setAt(i, '');
              else if (i > 0) { refs.current[i - 1]?.focus(); onChange(value.slice(0, i - 1) + value.slice(i)); }
            }
            if (e.key === 'ArrowLeft') refs.current[i - 1]?.focus();
            if (e.key === 'ArrowRight') refs.current[i + 1]?.focus();
          }}
          className="h-12 w-full min-w-0 rounded-xl border text-center text-xl font-semibold tabular-nums outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)] disabled:opacity-50"
          style={{ background: 'var(--surface-secondary)', borderColor: d ? 'var(--primary)' : 'var(--border)', color: 'var(--foreground)' }}
        />
      ))}
    </div>
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

  // second factor (e-mail code)
  const [challenge, setChallenge]   = useState('');
  const [purpose, setPurpose]       = useState<Purpose>('login');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode]             = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  const [cooldown, setCooldown]     = useState(0);
  const [info, setInfo]             = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Old e-mail links (/reset-password) and the help center land here with ?step=forgot
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('step') === 'forgot') { const t = setTimeout(() => setStep('forgot'), 0); return () => clearTimeout(t); }
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const clear = () => { setError(null); setInfo(null); };

  type AuthResult = { token?: string; user?: unknown; firstLogin?: boolean; deviceToken?: string; requiresCode?: boolean; purpose?: Purpose | 'reset_password'; challenge?: string; email?: string };

  /** Signed in: store the session (and the remembered device) and go to the app. */
  const finish = (data: AuthResult) => {
    localStorage.setItem('dcash:token', data.token!);
    localStorage.setItem('dcash:user', JSON.stringify(data.user));
    if (data.deviceToken) { try { localStorage.setItem(DEVICE_KEY, data.deviceToken); } catch {} }
    router.push(data.firstLogin ? '/plans' : '/painel');
  };

  /** Server asked for the e-mail code. */
  const askCode = (data: AuthResult) => {
    setChallenge(data.challenge!);
    setPurpose((data.purpose as Purpose) ?? 'login');
    setMaskedEmail(data.email ?? '');
    setCode('');
    setCooldown(RESEND_SECONDS);
    setStep('code');
  };

  const post = async (path: string, body: unknown): Promise<AuthResult> => {
    const res = await fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message;
      throw new Error(msg ?? 'Algo deu errado. Tente novamente.');
    }
    return data;
  };

  const verify = async (value = code) => {
    if (value.length !== 6 || loading) return;
    setLoading(true); clear();
    try {
      finish(await post('/auth/verify-code', { challenge, code: value, trustDevice }));
    } catch (err) {
      setError((err as Error).message);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    clear();
    try {
      await post('/auth/resend-code', { challenge });
      setInfo('Enviamos um novo código.');
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // ---- Inline validation (register) ----
  const emailInvalid    = email.length > 0 && !EMAIL_RE.test(email);
  const passwordHint = passwordProblem(password);
  const passwordsMismatch = confirmPassword.length > 0 && confirmPassword !== password;
  const registerDisabled = !name || !EMAIL_RE.test(email) || !password || !!passwordHint || password !== confirmPassword;

  // ---- Auth handlers ----

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); clear();
    try {
      let deviceToken: string | undefined;
      try { deviceToken = localStorage.getItem(DEVICE_KEY) ?? undefined; } catch {}
      const data = await post('/auth/login', { email, password, inviteCode: inviteCode || undefined, deviceToken });
      if (data.requiresCode) askCode(data);
      else finish(data);
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
      const data = await post('/auth/register', { name, email, password, inviteCode: inviteCode || undefined });
      if (data.requiresCode) askCode(data);
      else finish(data);
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
      const data = await post('/auth/forgot-password', { email: forgotEmail });
      setChallenge(data.challenge!);
      setMaskedEmail(data.email ?? forgotEmail);
      setCode(''); setNewPassword(''); setNewPassword2('');
      setCooldown(RESEND_SECONDS);
      setStep('reset');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resetDisabled = code.length !== 6 || !newPassword || !!passwordProblem(newPassword) || newPassword !== newPassword2;
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetDisabled) return;
    setLoading(true); clear();
    try {
      try { localStorage.removeItem(DEVICE_KEY); } catch {}
      finish(await post('/auth/reset-password', { challenge, code, password: newPassword }));
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
        style={{ color: 'var(--primary-text)' }}
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

  const panel = PANEL_COPY[step];
  const switchTo = (s: Step) => { setStep(s); clear(); };

  // ---- Render ----
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'var(--background)', color: 'var(--foreground)' }}
    >

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-10">
        <div
          className="w-full max-w-5xl grid md:grid-cols-2 rounded-2xl overflow-hidden shadow-xl md:min-h-[600px] animate-in fade-in zoom-in-95 duration-500"
          style={{ border: '1px solid var(--border)' }}
        >
          {/* ══════════════ LEFT — FORM PANEL ══════════════ */}
          <div
            className="flex flex-col justify-center p-8 sm:p-10 lg:p-12"
            style={{ background: 'var(--card)' }}
          >
            {/* Brand mark — only shown where the gradient panel is hidden (mobile) */}
            <div className="md:hidden flex items-center gap-2.5 mb-8">
              <Image src={logoSrc} alt="DCash" width={32} height={32} className="rounded-lg shadow shrink-0" priority />
              <span className="text-lg font-semibold tracking-tight">
                DCash<span className="text-accent">.</span>
              </span>
            </div>

            <div className="w-full max-w-sm mx-auto">

              {/* ── LOGIN ── */}
              {step === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <Eyebrow label="Entrar" subtitle="Acesse sua conta e continue de onde parou." />

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
                      onClick={() => switchTo('register')}
                      className="md:hidden font-semibold transition hover:opacity-70"
                      style={{ color: 'var(--primary-text)' }}
                    >
                      Criar conta
                    </button>
                  </div>

                  {InviteField}

                  <PrimaryBtn loading={loading} label="Entrar" />

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                    <span className="text-xs" style={{ color: muted }}>ou</span>
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
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
                </form>
              )}

              {/* ── REGISTER ── */}
              {step === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <Eyebrow
                    label="Criar Conta"
                    subtitle="Junte-se à Dcash em poucos passos."
                    onBack={() => switchTo('login')}
                  />

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
                    {passwordHint ? <FieldHint msg={passwordHint} /> : password.length === 0 && <p className="mt-1.5 text-xs" style={{ color: muted }}>8+ caracteres, com letras e números.</p>}
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
                  <Eyebrow
                    label="Recuperar Senha"
                    subtitle="Enviaremos um código de 6 números para o seu e-mail."
                    onBack={() => switchTo('login')}
                  />

                  {error && <ErrBox msg={error} />}

                  <FieldIcon
                    icon={Mail}
                    type="email"
                    value={forgotEmail}
                    onChange={setForgotEmail}
                    placeholder="seu@email.com"
                    required
                  />

                  <PrimaryBtn loading={loading} label="Enviar código" />
                </form>
              )}

              {/* ── CODE (2FA) ── */}
              {step === 'code' && (
                <form onSubmit={(e) => { e.preventDefault(); verify(); }} className="space-y-5">
                  <Eyebrow
                    label={purpose === 'verify_email' ? 'Confirme seu e-mail' : 'Verificação em 2 etapas'}
                    subtitle={`Digite o código de 6 números que enviamos para ${maskedEmail}.`}
                    onBack={() => switchTo('login')}
                  />
                  <div className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-xs" style={{ background: 'var(--primary-soft)', color: 'var(--primary-text)' }}>
                    <ShieldCheck size={18} className="shrink-0" />
                    {purpose === 'verify_email'
                      ? 'Confirmando o e-mail, sua conta fica protegida e você recupera o acesso quando precisar.'
                      : 'Novo dispositivo detectado. O código garante que só você entra na sua conta.'}
                  </div>

                  {error && <ErrBox msg={error} />}
                  {info && !error && <p className="text-xs" style={{ color: 'var(--primary-text)' }}>{info}</p>}

                  <CodeInput value={code} onChange={setCode} onComplete={(v) => verify(v)} disabled={loading} />

                  <label className="flex cursor-pointer items-center gap-2 text-xs" style={{ color: muted }}>
                    <input type="checkbox" checked={trustDevice} onChange={(e) => setTrustDevice(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
                    Lembrar este dispositivo por 30 dias
                  </label>

                  <PrimaryBtn loading={loading} label={purpose === 'verify_email' ? 'Confirmar e entrar' : 'Entrar'} disabled={code.length !== 6} />

                  <p className="text-center text-xs" style={{ color: muted }}>
                    Não chegou? Veja o spam ou{' '}
                    <button type="button" onClick={resend} disabled={cooldown > 0} className="font-semibold transition hover:opacity-70 disabled:opacity-60" style={{ color: 'var(--primary-text)' }}>
                      {cooldown > 0 ? `reenvie em ${cooldown}s` : 'reenviar código'}
                    </button>
                  </p>
                </form>
              )}

              {/* ── RESET (code + new password) ── */}
              {step === 'reset' && (
                <form onSubmit={handleReset} className="space-y-4">
                  <Eyebrow
                    label="Nova senha"
                    subtitle={`Se ${maskedEmail} tiver conta no DCash, o código chegou lá. Ele vale por 15 minutos.`}
                    onBack={() => switchTo('forgot')}
                  />

                  {error && <ErrBox msg={error} />}
                  {info && !error && <p className="text-xs" style={{ color: 'var(--primary-text)' }}>{info}</p>}

                  <div>
                    <p className="mb-2 text-xs font-medium" style={{ color: muted }}>Código de verificação</p>
                    <CodeInput value={code} onChange={setCode} disabled={loading} />
                  </div>
                  <div>
                    <FieldIcon
                      icon={Lock}
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={setNewPassword}
                      placeholder="Nova senha"
                      required
                      right={
                        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ color: muted }}>
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      }
                    />
                    {passwordProblem(newPassword) && <FieldHint msg={passwordProblem(newPassword)!} />}
                  </div>
                  <div>
                    <FieldIcon icon={Lock} type={showPassword ? 'text' : 'password'} value={newPassword2} onChange={setNewPassword2} placeholder="Confirme a nova senha" required />
                    {newPassword2.length > 0 && newPassword2 !== newPassword && <FieldHint msg="As senhas não coincidem." />}
                  </div>

                  <PrimaryBtn loading={loading} label="Salvar nova senha e entrar" disabled={resetDisabled} />

                  <p className="text-center text-xs" style={{ color: muted }}>
                    Não chegou?{' '}
                    <button type="button" onClick={resend} disabled={cooldown > 0} className="font-semibold transition hover:opacity-70 disabled:opacity-60" style={{ color: 'var(--primary-text)' }}>
                      {cooldown > 0 ? `reenvie em ${cooldown}s` : 'reenviar código'}
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* ══════════════ RIGHT — BRAND PANEL (desktop only) ══════════════ */}
          <div
            className="hidden md:flex relative flex-col justify-between overflow-hidden p-10 lg:p-12 text-white"
            style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-to))' }}
          >
            {/* decorative shapes */}
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full border border-white/10" />
            <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full border border-white/10" />
            <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full border border-white/5" />

            {/* logo */}
            <div className="relative z-10 flex items-center gap-2.5">
              <Image src={logoSrc} alt="DCash" width={34} height={34} className="rounded-xl shadow-lg shrink-0" priority />
              <span className="text-sm font-semibold tracking-tight">
                DCash<span className="text-emerald-300">.</span>
              </span>
            </div>

            {/* copy */}
            <div className="relative z-10 max-w-[19rem]">
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-300">
                {panel.eyebrow}
              </span>
              <h2 className="mt-3 text-[28px] leading-tight font-semibold tracking-tight">
                {panel.title}
              </h2>
              <p className="mt-4 text-sm text-white/80 leading-relaxed">
                {panel.body}
              </p>

              <button
                type="button"
                onClick={() => switchTo(panel.ctaStep)}
                className="mt-7 inline-flex items-center gap-2 bg-white text-hero-from font-medium text-[13px] h-10 px-5 rounded-lg transition-colors hover:bg-white/90"
              >
                {panel.cta} <ArrowRight size={15} />
              </button>
            </div>

            {/* trust line */}
            <div className="relative z-10 flex items-center gap-2 text-xs text-white/70">
              <ShieldCheck size={16} className="shrink-0" />
              Seus dados protegidos com criptografia de ponta a ponta.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
