'use client';

import { useState } from 'react';
import { Check, Loader2, Sparkles, Users } from '@/components/ui/icons';
import api from '@/services/api';
import { cn } from '@/lib/utils';
import { MODULES, apiError, useDcaosAccess, type ModuleKey } from '../lib/dcaos';

const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PITCH: ModuleKey[] = ['tasks', 'market', 'notes', 'agenda', 'habits', 'dates', 'maintenance', 'system'];

/** Renders children only when the family has the DCaos add-on; otherwise a paywall. */
export function DcaosGate({ children }: { children: React.ReactNode }) {
  const { data: access, isLoading } = useDcaosAccess();
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [busy, setBusy] = useState(false);

  if (isLoading || !access) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={26} className="animate-spin text-accent" />
      </div>
    );
  }
  if (access.hasAccess) return <>{children}</>;

  const subscribe = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/dcaos/subscribe', { billingCycle: cycle });
      if (data?.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch (err) {
      alert(apiError(err, 'Não foi possível iniciar a contratação.'));
      setBusy(false);
    }
  };

  const yearlyMonthly = access.price.yearly / 12;

  return (
    <div className="w-full p-4 md:p-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="hero-card relative overflow-hidden rounded-2xl p-6 md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-white/60">
            <Sparkles size={14} /> Módulo adicional
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">DCaos</h2>
          <p className="mt-1 text-lg text-white/80">O gerenciador oficial da bagunça familiar.</p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70">
            Tarefas com responsável, lista de compras compartilhada, recados, agenda, hábitos, datas importantes e manutenções da casa —
            com lembretes que ninguém consegue ignorar. Uma assinatura libera para toda a família.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PITCH.map((key) => {
              const m = MODULES[key];
              const Icon = m.icon;
              return (
                <div key={key} className="flex items-start gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10"><Icon size={16} /></span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold">
                      {m.name} {m.soon && <span className="ml-1 rounded bg-white/10 px-1 text-[10px] font-medium text-white/70">em breve</span>}
                    </p>
                    <p className="truncate text-[11px] text-white/60">{m.tagline}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="flex flex-col rounded-2xl border border-border bg-card p-6">
          <p className="text-sm font-semibold text-fg">Contratar o DCaos</p>
          <p className="mt-1 text-xs text-fg-muted">Cobrança separada do seu plano DCash. Cancele quando quiser.</p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            {(['monthly', 'yearly'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={cn('rounded-xl border p-3 text-left transition-colors',
                  cycle === c ? 'border-primary bg-primary-soft' : 'border-border hover:bg-hover')}
              >
                <p className={cn('text-xs font-medium', cycle === c ? 'text-accent' : 'text-fg-2')}>{c === 'monthly' ? 'Mensal' : 'Anual'}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-fg">
                  {fmtBRL(c === 'monthly' ? access.price.monthly : yearlyMonthly)}<span className="text-xs font-normal text-fg-muted">/mês</span>
                </p>
                {c === 'yearly' && <p className="text-[11px] text-accent">{fmtBRL(access.price.yearly)}/ano · 20% off</p>}
              </button>
            ))}
          </div>

          <ul className="mt-5 space-y-2 text-[13px] text-fg-2">
            {[
              'Libera para todos os membros da família',
              'Tarefas com responsável e placar da casa',
              'Lista de compras e despensa compartilhadas',
              'Recados e lembretes provocativos',
              'Novos módulos inclusos conforme forem lançados',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0 text-accent" /> {t}</li>
            ))}
          </ul>

          <button onClick={subscribe} disabled={busy} className="btn btn-primary mt-6 !h-11 w-full">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Contratar DCaos
          </button>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-fg-muted">
            <Users size={12} /> Já está numa família com DCaos? O acesso é liberado automaticamente.
          </p>
        </aside>
      </div>
    </div>
  );
}
