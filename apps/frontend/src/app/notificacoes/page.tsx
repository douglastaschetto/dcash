'use client';

import { AppLayout } from '@/components/app-layout';
import { useAuth } from '@/hooks/useAuth';
import { PushSettings } from '@/app/dcaos/components/PushSettings';

/** Device notifications (PWA) for every DCash user — finance briefings + DCaos household reminders. */
export default function NotificacoesPage() {
  useAuth();
  return (
    <AppLayout title="Notificações" subtitle="Avisos no celular e no computador, mesmo com o app fechado" noPadding>
      <div className="h-full overflow-y-auto">
        <div className="grid w-full grid-cols-1 gap-4 p-4 md:p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0"><PushSettings /></div>
          <aside className="min-w-0 space-y-4">
            <section className="hero-card relative overflow-hidden rounded-2xl p-5">
              <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
              <p className="relative text-[11px] font-medium uppercase tracking-[0.14em] text-white/60">Como funciona</p>
              <p className="relative mt-2 text-lg font-semibold">O DCash avisa, você decide o quê.</p>
              <ul className="relative mt-3 space-y-1.5 text-[13px] text-white/75">
                <li>1. Ative as notificações neste aparelho.</li>
                <li>2. Escolha quais avisos quer receber.</li>
                <li>3. Use &quot;Não perturbe&quot; para silenciar a noite.</li>
              </ul>
            </section>
            <section className="rounded-2xl border border-border bg-card p-5 text-[13px] text-fg-2">
              <p className="mb-2 font-semibold text-fg">📱 Instale o app</p>
              <p>No Android/Chrome, use &quot;Instalar app&quot;. No iPhone, abra no Safari → Compartilhar → <b>Adicionar à Tela de Início</b> — só assim o iOS entrega notificações.</p>
            </section>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
