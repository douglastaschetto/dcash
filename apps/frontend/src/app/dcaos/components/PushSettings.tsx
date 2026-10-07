'use client';

import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import api from '@/services/api';
import { cn } from '@/lib/utils';
import {
  BellOff, BellRing, Download, Loader2, Moon, Send, Share, Smartphone, Trash2, X,
} from '@/components/ui/icons';
import { deviceLabel, disablePush, enablePush, getPushState, isIOS, isStandalone, type PushState } from '@/lib/push';
import { apiError, timeAgo, useDcaosAccess } from '../lib/dcaos';

type Prefs = { pushEnabled: boolean; mutedModules: string[]; quietStart: string | null; quietEnd: string | null };
type Device = { id: string; endpoint: string; userAgent: string | null; createdAt: string; lastUsedAt: string | null };
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** What the PWA can push (module key = mute key). `test` = briefing kind for the "Testar" button. */
const NOTIFICATIONS: { key: string; emoji: string; title: string; when: string; house: boolean; test?: string }[] = [
  { key: 'insights', emoji: '✨', title: 'Insights do dia', when: 'Todo dia às 7h30 · resumo do dia e pontos de atenção', house: false, test: 'insights' },
  { key: 'finance', emoji: '💰', title: 'Saúde das finanças', when: '10h · alertas quando algo sai do trilho; resumo saudável às segundas', house: false, test: 'finance' },
  { key: 'dates', emoji: '🎂', title: 'Datas importantes', when: '8h · no dia e alguns dias antes', house: true },
  { key: 'agenda', emoji: '📅', title: 'Próximos compromissos', when: '8h no dia · e 1 hora antes de cada compromisso', house: false, test: 'agenda' },
  { key: 'tasks', emoji: '📝', title: 'Tarefas de hoje', when: '9h · um resumo com as tarefas do dia e atrasadas', house: true, test: 'tasks' },
  { key: 'habits', emoji: '🔁', title: 'Hábitos de hoje', when: 'No horário de cada hábito · e 20h30 se faltar algum', house: true, test: 'habits' },
  { key: 'market', emoji: '🛒', title: 'Lista de compras', when: '17h30 se tiver item pra comprar ou vencendo · e quando algo acaba', house: true, test: 'market' },
  { key: 'notes', emoji: '🗒️', title: 'Bilhetes', when: 'Na hora em que chega · e 19h se ainda não leu', house: true, test: 'notes' },
  { key: 'maintenance', emoji: '🔧', title: 'Manutenção da casa', when: '9h30 · preventivas vencendo e problemas parados', house: true },
];

/** Device push state + actions, shared by the settings card and the hub banner. */
export function usePush() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => { getPushState().then(setState).catch(() => setState('unsupported')); }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const enable = async () => {
    setBusy(true);
    try { setState(await enablePush()); } catch (err) { alert(apiError(err, (err as Error).message || 'Não foi possível ativar.')); } finally { setBusy(false); }
  };
  const disable = async () => {
    setBusy(true);
    try { setState(await disablePush()); } finally { setBusy(false); }
  };
  return { state, busy, enable, disable, refresh };
}

/** Captures the browser's install prompt (Chrome/Edge/Android). */
export function useInstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); };
    const onInstalled = () => setEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  const install = async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice.catch(() => undefined);
    setEvent(null);
  };
  return { canInstall: !!event, install };
}

function IOSInstallHint() {
  return (
    <div className="rounded-xl border border-info/30 bg-info-soft p-3 text-xs text-info">
      <p className="font-semibold">No iPhone, instale o app primeiro</p>
      <ol className="mt-1 list-decimal space-y-0.5 pl-4">
        <li>Abra o DCash no <strong>Safari</strong>.</li>
        <li>Toque em <Share size={11} className="inline" /> <strong>Compartilhar</strong> → <strong>Adicionar à Tela de Início</strong>.</li>
        <li>Abra pelo ícone e ative as notificações aqui.</li>
      </ol>
      <p className="mt-1 opacity-80">Requer iOS 16.4 ou superior.</p>
    </div>
  );
}

export function PushSettings() {
  const { state, busy, enable, disable } = usePush();
  const { canInstall, install } = useInstallPrompt();
  const { data: prefs, mutate: mutatePrefs } = useSWR<Prefs>('/dcaos/preferences');
  const { data: devices = [], mutate: mutateDevices } = useSWR<Device[]>('/dcaos/push/devices');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [trying, setTrying] = useState<string | null>(null);
  const [tryResult, setTryResult] = useState<Record<string, string>>({});
  const { data: access } = useDcaosAccess();
  const house = !!access?.hasAccess;

  const tryBriefing = async (kind: string) => {
    setTrying(kind);
    try {
      const { data } = await api.post('/dcaos/push/briefing-test', { kind });
      setTryResult((r) => ({ ...r, [kind]: data.sent ? `Enviado: ${data.title}` : data.reason ?? 'Nada para avisar agora.' }));
    } catch (err) {
      setTryResult((r) => ({ ...r, [kind]: apiError(err, 'Falha ao testar.') }));
    } finally {
      setTrying(null);
    }
  };

  const savePrefs = async (patch: Partial<Prefs>) => {
    if (!prefs) return;
    const next = { ...prefs, ...patch };
    mutatePrefs(next, { revalidate: false });
    try {
      await api.patch('/dcaos/preferences', {
        ...patch,
        ...(patch.quietStart !== undefined ? { quietStart: patch.quietStart ?? '' } : {}),
        ...(patch.quietEnd !== undefined ? { quietEnd: patch.quietEnd ?? '' } : {}),
      });
    } catch (err) {
      alert(apiError(err, 'Não foi possível salvar.'));
      mutatePrefs();
    }
  };

  const test = async () => {
    setTesting(true); setTestResult(null);
    try {
      const { data } = await api.post('/dcaos/push/test');
      setTestResult(data.delivered > 0 ? `Enviado para ${data.delivered} dispositivo${data.delivered === 1 ? '' : 's'}.` : 'Nenhum dispositivo recebeu. Ative neste aparelho primeiro.');
    } catch (err) {
      setTestResult(apiError(err, 'Falha ao enviar o teste.'));
    } finally {
      setTesting(false);
    }
  };

  const enabledHere = state === 'subscribed';
  const quietOn = !!(prefs?.quietStart && prefs?.quietEnd);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
            enabledHere ? 'border-primary-border bg-primary-soft text-accent' : 'border-border bg-surface-2 text-fg-muted')}>
            {enabledHere ? <BellRing size={18} /> : <BellOff size={18} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">Notificações neste dispositivo</p>
            <p className="text-xs text-fg-muted">
              {state === null ? 'Verificando...'
                : state === 'subscribed' ? 'Ativas. O sistema vai lembrar. Sempre.'
                  : state === 'denied' ? 'Bloqueadas no navegador. Libere nas configurações do site (ícone de cadeado).'
                    : state === 'unsupported' ? 'Este navegador não suporta notificações push.'
                      : state === 'ios-needs-install' ? 'No iPhone é preciso instalar o app antes.'
                        : 'Desativadas. Você só verá os lembretes dentro do app.'}
            </p>
          </div>
        </div>

        {state === 'ios-needs-install' && <div className="mt-3"><IOSInstallHint /></div>}

        <div className="mt-4 flex flex-wrap gap-2">
          {(state === 'default' || state === 'granted') && (
            <button onClick={enable} disabled={busy} className="btn btn-primary">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <BellRing size={14} />} Ativar notificações
            </button>
          )}
          {enabledHere && (
            <>
              <button onClick={test} disabled={testing} className="btn btn-secondary">
                {testing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar teste
              </button>
              <button onClick={async () => { await disable(); mutateDevices(); }} disabled={busy} className="btn btn-secondary">
                <BellOff size={14} /> Desativar aqui
              </button>
            </>
          )}
          {canInstall && !isStandalone() && (
            <button onClick={install} className="btn btn-secondary"><Download size={14} /> Instalar app</button>
          )}
        </div>
        {testResult && <p className="mt-2 text-[11px] text-fg-muted">{testResult}</p>}
      </section>

      {prefs && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-fg">Push em todos os aparelhos</p>
              <p className="text-xs text-fg-muted">Desligado, os lembretes continuam aparecendo só aqui no app.</p>
            </div>
            <button role="switch" aria-checked={prefs.pushEnabled} onClick={() => savePrefs({ pushEnabled: !prefs.pushEnabled })}
              className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', prefs.pushEnabled ? 'bg-primary' : 'bg-track')}>
              <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform', prefs.pushEnabled ? 'translate-x-[22px]' : 'translate-x-0.5')} />
            </button>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-medium text-fg-2">O que pode me notificar</p>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {NOTIFICATIONS.map((n) => {
                const locked = n.house && !house;
                const on = !prefs.mutedModules.includes(n.key) && !locked;
                return (
                  <li key={n.key} className={cn('flex items-start gap-3 px-3 py-2.5', (locked || !prefs.pushEnabled) && 'opacity-55')}>
                    <span className="mt-0.5 text-lg leading-none">{n.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-fg">
                        {n.title}
                        {n.house && <span className="rounded-full bg-primary-soft px-1.5 text-[9px] font-bold uppercase text-accent">DCaos</span>}
                      </p>
                      <p className="text-[11px] text-fg-muted">{locked ? 'Disponível com o DCaos' : n.when}</p>
                      {n.test && !locked && enabledHere && (
                        <button onClick={() => tryBriefing(n.test!)} disabled={trying === n.test}
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline disabled:opacity-50">
                          {trying === n.test ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} Testar agora
                        </button>
                      )}
                      {tryResult[n.test ?? ''] && <p className="mt-0.5 text-[11px] text-fg-2">{tryResult[n.test ?? '']}</p>}
                    </div>
                    <button role="switch" aria-checked={on} aria-label={n.title} disabled={locked || !prefs.pushEnabled}
                      onClick={() => savePrefs({ mutedModules: on ? [...prefs.mutedModules, n.key] : prefs.mutedModules.filter((x) => x !== n.key) })}
                      className={cn('relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed', on ? 'bg-primary' : 'bg-track')}>
                      <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform', on ? 'translate-x-[18px]' : 'translate-x-0.5')} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-medium text-fg-2"><Moon size={13} /> Não perturbe</p>
              <button onClick={() => savePrefs(quietOn ? { quietStart: null, quietEnd: null } : { quietStart: '22:00', quietEnd: '07:00' })}
                className="text-[11px] font-medium text-accent hover:underline">{quietOn ? 'Desligar' : 'Ligar (22h–7h)'}</button>
            </div>
            {quietOn && (
              <div className="flex items-center gap-2 text-xs text-fg-2">
                das <input type="time" value={prefs.quietStart ?? ''} onChange={(e) => savePrefs({ quietStart: e.target.value || null })} className="field h-8 !w-auto" />
                às <input type="time" value={prefs.quietEnd ?? ''} onChange={(e) => savePrefs({ quietEnd: e.target.value || null })} className="field h-8 !w-auto" />
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-fg-muted">Nesse horário nada apita. Os lembretes ficam guardados aqui.</p>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg"><Smartphone size={15} /> Aparelhos conectados</p>
        {devices.length === 0 ? (
          <p className="text-xs text-fg-muted">Nenhum aparelho recebendo notificações ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-fg">{deviceLabel(d.userAgent)}</p>
                  <p className="text-[11px] text-fg-muted">desde {timeAgo(d.createdAt)}{d.lastUsedAt ? ` · último aviso ${timeAgo(d.lastUsedAt)}` : ''}</p>
                </div>
                <button onClick={async () => { await api.delete(`/dcaos/push/devices/${d.id}`); mutateDevices(); }}
                  aria-label="Remover aparelho" className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-danger-soft hover:text-danger">
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const BANNER_KEY = 'dcash:push-banner-dismissed';

/** Hub nudge to turn on device notifications / install the app. */
export function PushBanner() {
  const { state, busy, enable } = usePush();
  const { canInstall, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => {
      try { setDismissed(localStorage.getItem(BANNER_KEY) === '1'); } catch { setDismissed(false); }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const needsPush = state === 'default' || state === 'granted' || (state === 'ios-needs-install' && isIOS());
  if (dismissed || !needsPush) return null;
  const close = () => { try { localStorage.setItem(BANNER_KEY, '1'); } catch {} setDismissed(true); };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-primary-border bg-primary-soft p-4 sm:flex-row sm:items-center">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary"><BellRing size={18} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg">Receba os avisos do DCash no celular</p>
        <p className="text-xs text-fg-2">
          {state === 'ios-needs-install'
            ? 'No iPhone: Safari → Compartilhar → Adicionar à Tela de Início. Depois ative por aqui.'
            : 'Resumo do dia, saúde das finanças, compromissos e (com o DCaos) a casa toda — onde você estiver.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {canInstall && <button onClick={install} className="btn btn-secondary"><Download size={14} /> Instalar app</button>}
        {state !== 'ios-needs-install' && (
          <button onClick={enable} disabled={busy} className="btn btn-primary">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <BellRing size={14} />} Ativar
          </button>
        )}
        <button onClick={close} aria-label="Dispensar" className="btn btn-secondary btn-square"><X size={14} /></button>
      </div>
    </div>
  );
}
