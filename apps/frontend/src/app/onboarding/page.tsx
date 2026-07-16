'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, Sparkles, ArrowRight, PiggyBank, Users, LineChart, Settings2 } from 'lucide-react';

const muted = 'color-mix(in srgb, var(--foreground) 50%, transparent)';

const GOALS = [
  { key: 'save', label: 'Economizar mais', icon: PiggyBank },
  { key: 'family', label: 'Organizar contas em família', icon: Users },
  { key: 'track', label: 'Controlar meus gastos', icon: LineChart },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<string | null>(null);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('dcash:user') ?? '{}');
      if (user?.name) setName(String(user.name).split(' ')[0]);
    } catch {
      // ignore malformed localStorage payload
    }
  }, []);

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center px-4"
      style={{ background: 'var(--background)', color: 'var(--foreground)' }}
    >
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/8 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div
          className="rounded-[2rem] p-8 shadow-2xl text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {step === 0 && (
            <div className="space-y-6">
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-25 rounded-3xl" />
                  <div className="relative bg-emerald-500 p-5 rounded-3xl shadow-2xl -rotate-3">
                    <Wallet className="text-white" size={32} strokeWidth={2.5} />
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={12} className="text-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-500">
                    Tudo pronto
                  </span>
                </div>
                <h1 className="text-2xl font-bold">
                  Bem-vindo{name ? `, ${name}` : ''}!
                </h1>
                <p className="text-sm mt-2" style={{ color: muted }}>
                  Sua conta está pronta. Vamos deixar tudo do seu jeito em menos de 1 minuto.
                </p>
              </div>
              <button
                onClick={() => setStep(1)}
                className="w-full h-14 rounded-2xl text-sm font-bold text-white transition hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: '#10b981' }}
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 text-left">
              <div className="text-center">
                <h2 className="text-xl font-bold">O que você quer fazer primeiro?</h2>
                <p className="text-sm mt-1" style={{ color: muted }}>
                  Isso nos ajuda a personalizar sua experiência.
                </p>
              </div>
              <div className="space-y-3">
                {GOALS.map((g) => {
                  const Icon = g.icon;
                  const selected = goal === g.key;
                  return (
                    <button
                      key={g.key}
                      onClick={() => setGoal(g.key)}
                      className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition"
                      style={{
                        border: `2px solid ${selected ? '#10b981' : 'var(--border)'}`,
                        background: selected ? '#10b98115' : 'var(--surface-secondary)',
                        color: 'var(--foreground)',
                      }}
                    >
                      <Icon className="h-5 w-5 shrink-0" style={{ color: '#10b981' }} />
                      {g.label}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!goal}
                className="w-full h-14 rounded-2xl text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: '#10b981' }}
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">Perfeito, {name || 'tudo certo'}!</h2>
                <p className="text-sm mt-2" style={{ color: muted }}>
                  Sua conta já está configurada. Você pode começar agora ou personalizar mais alguns detalhes.
                </p>
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full h-14 rounded-2xl text-sm font-bold text-white transition hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: '#10b981' }}
              >
                Ir para o Dashboard <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => router.push('/onboarding/setup')}
                className="w-full h-11 rounded-2xl text-xs font-semibold transition hover:opacity-80 flex items-center justify-center gap-2"
                style={{ border: '1px solid var(--border)', color: muted }}
              >
                <Settings2 className="h-3.5 w-3.5" /> Configurar minha conta agora
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
