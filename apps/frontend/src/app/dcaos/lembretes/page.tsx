'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { AppLayout } from '@/components/app-layout';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { cn } from '@/lib/utils';
import { BellOff, CheckCheck, ChevronRight, Loader2 } from '@/components/ui/icons';
import { DcaosGate } from '../components/DcaosGate';
import { PushSettings } from '../components/PushSettings';
import { MODULES, moduleOf, timeAgo, type ModuleKey, type Notification } from '../lib/dcaos';

function RemindersContent() {
  const router = useRouter();
  const { data: items = [], mutate, isLoading } = useSWR<Notification[]>('/dcaos/notifications?limit=200');
  const [filter, setFilter] = useState<'all' | 'unread' | ModuleKey>('all');

  const modules = useMemo(() => Array.from(new Set(items.map((n) => n.module))) as ModuleKey[], [items]);
  const unread = items.filter((n) => !n.readAt).length;
  const visible = items.filter((n) => filter === 'all' ? true : filter === 'unread' ? !n.readAt : n.module === filter);

  const markAll = async () => { await api.post('/dcaos/notifications/read-all'); mutate(); };
  const open = async (n: Notification) => {
    if (!n.readAt) { api.post(`/dcaos/notifications/${n.id}/read`).then(() => mutate()).catch(() => {}); }
    if (n.link) router.push(n.link);
  };

  return (
    <div className="w-full p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex w-fit max-w-full overflow-x-auto scrollbar-none rounded-lg border border-border bg-surface-2 p-0.5">
          {([['all', `Todas · ${items.length}`], ['unread', `Não lidas · ${unread}`], ...modules.map((m) => [m, MODULES[m]?.name ?? m])] as [string, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k as typeof filter)}
              className={cn('flex h-7 shrink-0 items-center whitespace-nowrap rounded-md border px-2.5 text-xs font-medium transition-colors',
                filter === k ? 'bg-card text-fg border-border shadow-xs' : 'text-fg-muted hover:text-fg border-transparent')}>{l}</button>
          ))}
        </div>
        <button onClick={markAll} disabled={unread === 0} className="btn btn-secondary"><CheckCheck size={14} /> Marcar todas como lidas</button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0">
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-accent" /></div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-14 text-center">
          <BellOff size={26} strokeWidth={1.5} className="mx-auto text-fg-disabled" />
          <p className="mt-2 text-sm font-medium text-fg">Nada por aqui.</p>
          <p className="text-xs text-fg-muted">O sistema não precisou lembrar ninguém. Por enquanto.</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
          {visible.map((n) => {
            const m = moduleOf(n.module);
            const Icon = m.icon;
            return (
              <li key={n.id}>
                <button onClick={() => open(n)} className={cn('flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-hover', !n.readAt && 'bg-primary-soft/40')}>
                  <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                    n.readAt ? 'border-border bg-surface-2 text-fg-muted' : 'border-primary-border bg-primary-soft text-accent')}>
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={cn('text-[13px] font-semibold', n.readAt ? 'text-fg-2' : 'text-fg')}>🔔 {n.title}</p>
                      {!n.readAt && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </div>
                    <p className={cn('mt-0.5 text-[13px] leading-snug', n.readAt ? 'text-fg-muted' : 'text-fg-2')}>{n.body}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-[11px] text-fg-muted">
                    {timeAgo(n.createdAt)} {n.link && <ChevronRight size={13} />}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      </div>
      <aside className="min-w-0"><PushSettings /></aside>
      </div>
    </div>
  );
}

export default function DcaosRemindersPage() {
  useAuth();
  return (
    <AppLayout title="O Sistema Lembrou" subtitle="Notificações do DCaos · alguém tem que lembrar" noPadding>
      <div className="h-full overflow-y-auto">
        <DcaosGate>
          <RemindersContent />
        </DcaosGate>
      </div>
    </AppLayout>
  );
}
