'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { AppLayout } from '@/components/app-layout';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { cn } from '@/lib/utils';
import {
  CalendarClock, CheckCircle2, ChevronRight, Crown, ListChecks, Loader2, Plus, Repeat, ShoppingCart, Sparkles, Trophy, X,
} from '@/components/ui/icons';
import { DcaosGate } from './components/DcaosGate';
import { PushBanner } from './components/PushSettings';
import { FamilyToday, MiniCalendar, NotesWall, ShoppingNote } from './components/HomeWidgets';
import {
  MODULES, moduleOf, firstName, timeAgo, todayISO, useDcaosAccess, useMe, type Home, type ModuleKey, type Task,
} from './lib/dcaos';

const TILE_ORDER: ModuleKey[] = ['tasks', 'market', 'notes', 'agenda', 'habits', 'dates', 'maintenance', 'family'];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function HomeContent() {
  const router = useRouter();
  const me = useMe();
  const today = todayISO();
  const { data: home, mutate, isLoading } = useSWR<Home>('/dcaos/home');
  const { data: tasks = [], mutate: mutateTasks } = useSWR<Task[]>('/dcaos/tasks');
  const [busy, setBusy] = useState<string | null>(null);

  if (isLoading || !home) {
    return <div className="flex items-center justify-center py-24"><Loader2 size={26} className="animate-spin text-accent" /></div>;
  }

  const complete = async (t: Task) => {
    setBusy(t.id);
    try { await api.post(`/dcaos/tasks/${t.id}/complete`); await Promise.all([mutate(), mutateTasks()]); } finally { setBusy(null); }
  };
  const markAllRead = async () => { await api.post('/dcaos/notifications/read-all'); mutate(); };

  /* ── Day insights ─────────────────────────────────────────────── */
  const due = tasks.filter((t) => !t.isCompleted && t.dueDate && t.dueDate <= today);
  const mine = due.filter((t) => t.assigneeId === me.id);
  const mineOverdue = mine.filter((t) => t.dueDate! < today).length;
  const nextEvent = home.agenda.next.find((e) => new Date(e.startDate) >= new Date(new Date().setHours(0, 0, 0, 0)));
  const dateToday = home.dates.next.find((d) => d.daysUntil === 0);
  const leader = home.scoreboard[0];
  const maxPoints = Math.max(...home.scoreboard.map((s) => s.points), 1);

  const sentenceParts = [
    due.length ? plural(due.length, 'tarefa pendente', 'tarefas pendentes') : null,
    dateToday ? (dateToday.kind === 'birthday' && dateToday.personName ? `o aniversário de ${dateToday.personName}` : dateToday.title.toLowerCase()) : null,
    home.market.low ? plural(home.market.low, 'item acabando', 'itens acabando') : null,
    home.habits.today ? `${home.habits.doneToday}/${home.habits.today} hábitos feitos` : null,
  ].filter(Boolean) as string[];
  const sentence = sentenceParts.length
    ? `Hoje a casa tem ${sentenceParts.slice(0, -1).join(', ')}${sentenceParts.length > 1 ? ' e ' : ''}${sentenceParts[sentenceParts.length - 1]}.`
    : 'Hoje está tudo calmo. Calmo demais.';

  const eventWhen = (iso: string, allDay?: boolean) => {
    const d = new Date(iso);
    const day = d.toDateString() === new Date().toDateString() ? 'hoje' : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }).replace('.', '');
    return allDay ? day : `${day} · ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const insights: { key: string; label: string; value: string; sub: string; icon: React.ElementType; tone: string; href: string }[] = [
    {
      key: 'mine', label: 'Pra você hoje', icon: ListChecks, href: '/dcaos/tarefas',
      value: mine.length ? plural(mine.length, 'tarefa', 'tarefas') : 'Nada',
      sub: mineOverdue ? `${mineOverdue} atrasada${mineOverdue === 1 ? '' : 's'}. O sistema viu.` : mine.length ? 'Bora resolver?' : 'Aproveite (ou ajude alguém).',
      tone: mineOverdue ? 'text-danger' : 'text-accent',
    },
    {
      key: 'habits', label: 'Hábitos do dia', icon: Repeat, href: '/dcaos/habitos',
      value: home.habits.today ? `${home.habits.doneToday}/${home.habits.today}` : '—',
      sub: home.habits.bestStreak ? `🔥 maior sequência: ${home.habits.bestStreak}` : 'Crie um hábito pessoal',
      tone: 'text-info',
    },
    {
      key: 'event', label: 'Próximo compromisso', icon: CalendarClock, href: '/calendar',
      value: nextEvent ? nextEvent.title : 'Agenda livre',
      sub: nextEvent ? eventWhen(nextEvent.startDate, nextEvent.allDay) : 'Nada nos próximos 7 dias',
      tone: 'text-fg',
    },
    {
      key: 'market', label: 'Despensa', icon: ShoppingCart, href: '/dcaos/mercado',
      value: home.market.onList ? `${home.market.onList} na lista` : 'Lista vazia',
      sub: home.market.low ? `${home.market.low} acabando` : 'Estoque sob controle',
      tone: home.market.low ? 'text-warning' : 'text-fg',
    },
    {
      key: 'leader', label: 'Craque da casa', icon: Crown, href: '/dcaos/tarefas',
      value: leader && leader.points > 0 ? (leader.userId === me.id ? 'Você!' : firstName(leader.name)) : 'Ninguém ainda',
      sub: leader && leader.points > 0 ? `${leader.points} pts em 30 dias` : 'A disputa está aberta',
      tone: 'text-warning',
    },
  ];

  const tileInfo: Record<ModuleKey, string> = {
    tasks: home.tasks.pending === 0 ? 'Nada pendente' : `${home.tasks.pending} pendentes`,
    market: home.market.onList === 0 ? 'Lista vazia' : `${home.market.onList} na lista`,
    notes: home.notes.unread === 0 ? 'Nada novo' : `${home.notes.unread} novos`,
    agenda: home.agenda.week === 0 ? 'Semana livre' : `${home.agenda.week} na semana`,
    habits: home.habits.today === 0 ? 'Nenhum hoje' : `${home.habits.doneToday}/${home.habits.today} hoje`,
    dates: home.dates.next.length === 0 ? 'Nada em 30 dias' : `Em ${home.dates.next[0].daysUntil}d`,
    maintenance: home.maintenance.open === 0 ? 'Nada quebrado' : `${home.maintenance.open} abertos`,
    system: `${home.notifications.unread} não lidas`,
    family: plural(home.members.length, 'envolvido', 'envolvidos'),
  };

  return (
    <div className="w-full p-4 md:p-6 space-y-5">
      {/* ── Greeting ──────────────────────────────────────────────── */}
      <div data-tour="dcaos-hub-greeting" className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-fg-muted">{greeting()}, {firstName(me.name)} 👋</p>
          <h2 className="mt-0.5 max-w-3xl text-2xl font-semibold tracking-tight text-fg">{sentence}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dcaos/tarefas?novo=1" className="btn btn-primary"><Plus size={15} /> Tarefa</Link>
          <Link href="/dcaos/mercado?novo=1" className="btn btn-secondary"><Plus size={15} /> Mercado</Link>
          <Link href="/dcaos/manutencao?novo=1" className="btn btn-secondary"><Plus size={15} /> Deu ruim</Link>
        </div>
      </div>

      <PushBanner />

      {/* ── Insights do dia ───────────────────────────────────────── */}
      <section data-tour="dcaos-hub-insights" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {insights.map((it, i) => (
          <Link key={it.key} href={it.href}
            className={cn('group rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-border-hover',
              i === 0 && 'hero-card border-transparent')}>
            <div className="flex items-center justify-between">
              <p className={cn('text-[12px] font-medium', i === 0 ? 'text-white/70' : 'text-fg-2')}>{it.label}</p>
              <it.icon size={15} className={cn('transition-transform group-hover:scale-110', i === 0 ? 'text-white/80' : it.tone)} />
            </div>
            <p className={cn('mt-2 truncate text-lg font-semibold', i === 0 ? 'text-white' : it.tone)}>{it.value}</p>
            <p className={cn('truncate text-[11px]', i === 0 ? 'text-white/60' : 'text-fg-muted')}>{it.sub}</p>
          </Link>
        ))}
      </section>

      {/* ── Row: hoje · mercado · bilhetinhos ─────────────────────── */}
      <div data-tour="dcaos-hub-today" className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <FamilyToday members={home.members} meId={me.id} tasks={tasks} today={today} onComplete={complete} busy={busy} />
        <div className="px-1 pt-3">
          <ShoppingNote members={home.members} />
        </div>
        <NotesWall members={home.members} meId={me.id} />
      </div>

      {/* ── Row: calendário · placar · lembretes ──────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <MiniCalendar members={home.members} meId={me.id} />

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><Trophy size={16} strokeWidth={1.75} className="text-accent" /><p className="text-sm font-semibold text-fg">Placar da casa</p></div>
            <span className="text-[11px] text-fg-muted">últimos 30 dias</span>
          </div>
          {home.scoreboard.every((s) => s.points === 0) ? (
            <p className="py-6 text-center text-[13px] text-fg-muted">Ninguém pontuou ainda. A disputa está aberta.</p>
          ) : (
            <ul className="space-y-3">
              {home.scoreboard.map((s, i) => (
                <li key={s.userId}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-fg">
                      {i === 0 && s.points > 0 ? <Crown size={13} className="text-warning" /> : <span className="w-[13px] text-center text-fg-muted">{i + 1}</span>}
                      {s.userId === me.id ? 'Você' : firstName(s.name)}
                    </span>
                    <span className="tabular-nums text-fg-muted">{s.points} pts · {plural(s.tasks, 'tarefa', 'tarefas')}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-track">
                    <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${(s.points / maxPoints) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {leader && leader.points > 0 && home.scoreboard.length > 1 && (
            <p className="mt-4 rounded-lg border border-border bg-surface-2 px-3 py-2 text-[11px] text-fg-2">
              {leader.userId === me.id ? 'Você está carregando a casa nas costas. Os demais, reflitam.' : `${firstName(leader.name)} está carregando a casa nas costas. Os demais, reflitam.`}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} strokeWidth={1.75} className="text-accent" />
              <p className="text-sm font-semibold text-fg">O Sistema Lembrou</p>
              {home.notifications.unread > 0 && <span className="rounded-md bg-danger-soft px-1.5 py-0.5 text-[10px] font-semibold text-danger">{home.notifications.unread}</span>}
            </div>
            {home.notifications.unread > 0 && <button onClick={markAllRead} className="text-[11px] font-medium text-accent hover:underline">Marcar lidas</button>}
          </div>
          {home.notifications.latest.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-fg-muted">Silêncio total. Ninguém aprontou nada (ainda).</p>
          ) : (
            <ul className="divide-y divide-border">
              {home.notifications.latest.slice(0, 6).map((n) => {
                const Icon = moduleOf(n.module).icon;
                return (
                  <li key={n.id}>
                    <button onClick={() => { api.post(`/dcaos/notifications/${n.id}/read`).catch(() => {}); if (n.link) router.push(n.link); }}
                      className="flex w-full items-start gap-3 py-2.5 text-left">
                      <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
                        n.readAt ? 'border-border text-fg-muted' : 'border-primary-border bg-primary-soft text-accent')}><Icon size={14} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn('truncate text-xs font-semibold', n.readAt ? 'text-fg-2' : 'text-fg')}>{n.title}</p>
                          <span className="shrink-0 text-[10px] text-fg-muted">{timeAgo(n.createdAt)}</span>
                        </div>
                        <p className={cn('text-[12px] leading-snug', n.readAt ? 'text-fg-muted' : 'text-fg-2')}>{n.body}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <Link href="/dcaos/lembretes" className="mt-2 flex items-center justify-center gap-1 border-t border-border pt-3 text-xs font-medium text-fg-2 hover:text-fg">
            Ver todos <ChevronRight size={13} />
          </Link>
        </section>
      </div>

      {/* ── Módulos ───────────────────────────────────────────────── */}
      <section data-tour="dcaos-hub-modules">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">Tudo da casa</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
          {TILE_ORDER.map((key) => {
            const m = MODULES[key];
            const Icon = m.icon;
            return (
              <Link key={key} href={m.href ?? '/dcaos'}
                className="group flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary-border hover:bg-card-hover">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-accent transition-transform group-hover:scale-110"><Icon size={15} /></span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-semibold text-fg">{m.name}</span>
                  <span className="block truncate text-[10px] text-fg-muted">{tileInfo[key]}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {!home.isFamily && (
        <section className="rounded-2xl border border-warning/30 bg-warning-soft p-4 text-xs text-warning">
          Você ainda não tem uma família no DCash. O DCaos fica muito mais divertido (e justo) com mais gente.
          <Link href="/profile" className="ml-1 font-semibold underline">Convidar os envolvidos</Link>
        </section>
      )}
    </div>
  );
}

function CheckoutBanner() {
  const params = useSearchParams();
  const { mutate } = useDcaosAccess();
  const [open, setOpen] = useState(true);
  const status = params.get('checkout');

  useEffect(() => {
    if (status !== 'success') return;
    // Webhook may land a moment after the redirect — re-check access a few times
    let n = 0;
    const t = setInterval(() => { mutate(); if (++n >= 5) clearInterval(t); }, 2000);
    return () => clearInterval(t);
  }, [status, mutate]);

  if (!status || !open) return null;
  return (
    <div className={cn('mx-4 mt-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm md:mx-6',
      status === 'success' ? 'border-primary-border bg-primary-soft text-accent' : 'border-border bg-surface-2 text-fg-2')}>
      <span className="flex items-center gap-2">
        {status === 'success' ? <><CheckCircle2 size={16} /> DCaos contratado! Bem-vindos ao caos organizado.</> : 'Contratação cancelada. O caos continua desorganizado.'}
      </span>
      <button onClick={() => setOpen(false)} aria-label="Fechar"><X size={14} /></button>
    </div>
  );
}

export default function DcaosHomePage() {
  useAuth();
  return (
    <AppLayout title="Casa" subtitle="DCaos · o gerenciador oficial da bagunça familiar" noPadding>
      <div className="h-full overflow-y-auto">
        <Suspense fallback={null}><CheckoutBanner /></Suspense>
        <DcaosGate>
          <HomeContent />
        </DcaosGate>
      </div>
    </AppLayout>
  );
}
