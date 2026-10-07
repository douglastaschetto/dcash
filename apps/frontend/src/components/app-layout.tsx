'use client';

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Wallet, PieChart, LayoutDashboard, BarChart3, LogOut, Menu, Bell, UserCircle, CalendarCheck, CheckSquare, Trophy, Heart, PiggyBank, Star, Receipt, CalendarDays,
  AlertCircle, X, ExternalLink, MessageCircle, Shield, ArrowLeftRight, ChevronDown, Layers, HelpCircle,
  GraduationCap, BellRing, PanelLeftClose, PanelLeftOpen, Sun, Moon, Sparkles, House, ShoppingCart, StickyNote, ListTodo, Repeat, Cake, Wrench,
} from '@/components/ui/icons';
import logoSrc from '@/app/dcash.png';
import { SupportChatWidget } from '@/components/support-chat-widget';
import { GuidedTourProvider } from '@/components/guided-tour/GuidedTourProvider';
import { useGuidedTour } from '@/components/guided-tour/guided-tour-context';
import { usePlan } from '@/hooks/usePlan';
import { applyTheme, onThemeChange } from '@/lib/theme';
import { registerServiceWorker, syncPushSubscription } from '@/lib/push';
import { cn } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

type FixedBillAlert = { id: string; title: string; value: number };
type TodaySummary = {
  fixedBills: FixedBillAlert[];
  total: number;
  hasAlerts: boolean;
  day: number;
  plan: string;
  whatsappConsent: boolean;
  whatsappEnabled: boolean;
};

type NavItem = { href: string; icon: React.ElementType; label: string };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Principal',
    items: [
      { href: '/painel', icon: LayoutDashboard, label: 'Painel gerencial' },
    ],
  },
  {
    label: 'Finanças',
    items: [
      { href: '/dashboard-v2',  icon: BarChart3,      label: 'Dashboard financeiro' },
      { href: '/accounts',      icon: Wallet,         label: 'Contas' },
      { href: '/transactions',  icon: ArrowLeftRight, label: 'Transações' },
      { href: '/fixed-bills',   icon: Receipt,        label: 'Contas Fixas' },
      { href: '/installments',  icon: Layers,         label: 'Parcelamentos' },
      { href: '/categories',    icon: PieChart,       label: 'Categorias' },
      { href: '/planning',      icon: CalendarCheck,  label: 'Planejamento' },
    ],
  },
  {
    label: 'Metas',
    items: [
      { href: '/piggy-banks', icon: PiggyBank, label: 'Cofrinhos' },
      { href: '/dreams',      icon: Star,      label: 'Sonhos' },
      { href: '/wishlists',   icon: Heart,     label: 'Desejos' },
      { href: '/challenges',  icon: Trophy,    label: 'Desafios' },
    ],
  },
  {
    label: 'DCaos',
    items: [
      { href: '/dcaos',         icon: House,        label: 'Casa' },
      { href: '/dcaos/tarefas', icon: ListTodo,     label: 'Quem Vai Fazer?' },
      { href: '/dcaos/mercado', icon: ShoppingCart, label: 'Abastece Aí' },
      { href: '/dcaos/recados', icon: StickyNote,   label: 'Recados' },
      { href: '/dcaos/habitos',    icon: Repeat,        label: 'Faz Todo Dia' },
      { href: '/dcaos/datas',      icon: Cake,          label: 'Não Esquece' },
      { href: '/dcaos/manutencao', icon: Wrench,        label: 'Deu Ruim' },
    ],
  },
  {
    label: 'Organização',
    items: [
      { href: '/calendar', icon: CalendarDays, label: 'Agenda (tudo)' },
      { href: '/todos',    icon: CheckSquare,  label: 'Tarefas' },
    ],
  },
];

/** Sidebar is collapsed by default; hovering expands it over the content, the pin keeps it open. */
const PIN_KEY = 'dcash:sidebar-pinned';
const UPGRADE_KEY = 'dcash:upgrade-dismissed';
const PREFS_EVENT = 'dcash:layout-prefs';

/** Reads a boolean UI preference from web storage without a hydration mismatch. */
function useStoredFlag(storage: 'local' | 'session', key: string, serverValue: boolean) {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(PREFS_EVENT, cb);
      return () => window.removeEventListener(PREFS_EVENT, cb);
    },
    () => {
      try { return (storage === 'local' ? localStorage : sessionStorage).getItem(key) === 'true'; } catch { return serverValue; }
    },
    () => serverValue,
  );
}

function setStoredFlag(storage: 'local' | 'session', key: string, value: boolean) {
  try { (storage === 'local' ? localStorage : sessionStorage).setItem(key, String(value)); } catch {}
  window.dispatchEvent(new Event(PREFS_EVENT));
}

const fmtBRL = (n: number) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

type ActiveTour = { key: string; title: string };

const menuItem = 'flex w-full items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-fg-2 hover:bg-hover hover:text-fg transition-colors text-left';

/** Starts a guided tour from a link like `/painel?tour=painel-intro` (used by the help center). */
function TourFromQuery() {
  const { startTour } = useGuidedTour();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('tour');
    if (!key) return;
    params.delete('tour');
    const qs = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
    const t = setTimeout(() => startTour(key), 400);
    return () => clearTimeout(t);
  }, [startTour]);
  return null;
}

function TourMenuButton({ onNavigate }: { onNavigate: () => void }) {
  const { startTour } = useGuidedTour();
  const [tours, setTours] = useState<ActiveTour[]>([]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('dcash:token') : null;
    if (!token) return;
    fetch(`${API}/guided-tours`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setTours(Array.isArray(data) ? data : []))
      .catch(() => setTours([]));
  }, []);

  if (tours.length === 0) return null;

  if (tours.length === 1) {
    return (
      <button onClick={() => { onNavigate(); startTour(tours[0].key); }} className={menuItem}>
        <GraduationCap className="h-4 w-4 text-fg-muted" strokeWidth={1.75} />
        Tutorial guiado
      </button>
    );
  }

  return (
    <div>
      <p className="px-3 pt-2 pb-1 text-[11px] font-medium text-fg-muted">Tutoriais guiados</p>
      {tours.map((tour) => (
        <button key={tour.key} onClick={() => { onNavigate(); startTour(tour.key); }} className={menuItem}>
          <GraduationCap className="h-4 w-4 text-fg-muted" strokeWidth={1.75} />
          {tour.title}
        </button>
      ))}
    </div>
  );
}

/** Light/dark quick switch; the profile page still offers the "Sistema" option. */
function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const sync = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    sync();
    return onThemeChange(sync);
  }, []);

  return (
    <button
      onClick={() => applyTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
      className="icon-btn"
    >
      {isDark ? <Sun className="h-4 w-4" strokeWidth={1.75} /> : <Moon className="h-4 w-4" strokeWidth={1.75} />}
    </button>
  );
}

export function AppLayout({
  children,
  title,
  subtitle,
  actions,
  noPadding,
}: {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  noPadding?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isPro, loading: planLoading } = usePlan();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pinned = useStoredFlag('local', PIN_KEY, false);
  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expanded = pinned || hovered;
  const collapsed = !expanded;
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
  const upgradeDismissed = useStoredFlag('session', UPGRADE_KEY, true);
  const [userName, setUserName] = useState('U');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [bellOpen, setBellOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const bellRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('dcash:user') || '{}');
      if (u.name) setUserName(u.name);
      if (u.avatar) setUserAvatar(u.avatar);
    } catch {}
    const token = localStorage.getItem('dcash:token');
    if (token) {
      fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.isAdmin) setIsAdmin(true);
          if (d?.avatar) setUserAvatar(d.avatar);
        })
        .catch(() => {});
    }
  }, []);

  // PWA: keep the service worker registered and this device's push subscription in sync
  useEffect(() => {
    if (!localStorage.getItem('dcash:token')) return;
    registerServiceWorker().then(() => syncPushSubscription()).catch(() => {});
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('dcash:token');
    if (!token) return;
    fetch(`${API}/notifications/today`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setTodaySummary(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('dcash:token');
    localStorage.removeItem('dcash:user');
    router.push('/login');
  };

  const togglePinned = () => { setStoredFlag('local', PIN_KEY, !pinned); setHovered(false); };
  // Small delays so the menu doesn't flicker when the mouse just crosses it
  const onSidebarEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHovered(true), 120);
  };
  const onSidebarLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHovered(false), 180);
  };

  const toggleGroup = (label: string) => {
    setClosedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const dismissUpgrade = () => setStoredFlag('session', UPGRADE_KEY, true);

  const initial = userName.charAt(0).toUpperCase();

  /*
   * Responsive sidebar:
   *   < md   → off-canvas drawer (full labels)
   *   md–lg  → compact icon rail
   *   ≥ lg   → compact rail by default; hover expands it over the content,
   *            the pin button keeps it expanded (and pushes the content)
   * Labels use sr-only in compact mode so screen readers still announce them.
   */
  const labelCls = cn('truncate md:sr-only', !collapsed && 'lg:not-sr-only');
  const fullOnly = cn('md:hidden', !collapsed && 'lg:flex');
  const showUpgrade = !planLoading && !isPro && !upgradeDismissed;

  const avatar = (size: string) => (
    <div className={cn('rounded-full overflow-hidden shrink-0 ring-1 ring-border', size)}>
      {userAvatar ? (
        <img src={userAvatar} alt={userName} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full bg-primary-soft text-accent font-semibold text-xs flex items-center justify-center">
          {initial}
        </div>
      )}
    </div>
  );

  return (
    <GuidedTourProvider>
    <TourFromQuery />
    <div className="flex h-screen w-screen bg-background text-fg overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      {/* Reserves the rail width (or the full width when pinned); the aside overlays when hover-expanded */}
      <div className={cn('contents md:relative md:m-3 md:mr-0 md:block md:w-[72px] md:shrink-0 md:transition-[width] md:duration-200', pinned && 'lg:w-[248px]')}>
      <aside
        onMouseEnter={onSidebarEnter}
        onMouseLeave={onSidebarLeave}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-border bg-sidebar transition-[transform,width,box-shadow] duration-200 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'md:absolute md:z-40 md:translate-x-0 md:w-[72px] md:rounded-2xl md:border',
          expanded && 'lg:w-[248px]',
          hovered && !pinned && 'lg:shadow-2xl',
        )}
        aria-label="Navegação principal"
      >
        {/* Brand */}
        <div className={cn('flex h-14 shrink-0 items-center gap-2.5 px-4 md:justify-center md:px-0', !collapsed && 'lg:justify-between lg:px-4')}>
          <a href="/painel" className="flex items-center gap-2.5 min-w-0">
            <Image src={logoSrc} alt="DCash" width={30} height={30} className="rounded-lg shrink-0" priority />
            <span className={cn('text-[15px] font-semibold tracking-tight text-fg', labelCls)}>DCash</span>
          </a>
          <button
            onClick={togglePinned}
            aria-label={pinned ? 'Recolher menu' : 'Manter menu aberto'}
            title={pinned ? 'Recolher menu' : 'Manter menu aberto'}
            className={cn('hidden h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-fg transition-colors', !collapsed && 'lg:flex')}
          >
            {pinned ? <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} /> : <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} />}
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-hover md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {collapsed && (
          <button
            onClick={togglePinned}
            aria-label="Expandir menu"
            title="Manter menu aberto"
            className="mx-auto mb-1 hidden h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-fg lg:flex"
          >
            <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-none px-3 pb-3 pt-1 space-y-4">
          {NAV_GROUPS.map((group) => {
            const isOpen = !closedGroups[group.label];
            return (
              <div key={group.label}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={isOpen}
                  className={cn('mb-1 flex w-full items-center justify-between px-2 py-1 text-[11px] font-medium uppercase tracking-[0.06em] text-fg-muted hover:text-fg-2 transition-colors', fullOnly)}
                >
                  {group.label}
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !isOpen && '-rotate-90')} />
                </button>
                {/* Compact rail: a hairline replaces the section label */}
                <div className={cn('mx-auto mb-2 hidden h-px w-6 bg-border md:block', !collapsed && 'lg:hidden')} />

                <ul className={cn(
                  'space-y-0.5',
                  // Tree guide (full sidebar only): hairline connecting the group's items
                  'ml-[13px] border-l border-border pl-2 md:ml-0 md:border-l-0 md:pl-0',
                  !collapsed && 'lg:ml-[13px] lg:border-l lg:pl-2',
                  !isOpen && cn('hidden md:block', !collapsed && 'lg:hidden'),
                )}>
                  {group.items.map(({ href, icon: Icon, label }) => {
                    const active = pathname === href;
                    return (
                      <li key={href}>
                        <a
                          href={href}
                          title={label}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium transition-colors',
                            'md:justify-center md:px-0', !collapsed && 'lg:justify-start lg:px-2.5',
                            active
                              ? 'bg-primary-soft text-accent'
                              : 'text-fg-2 hover:bg-hover hover:text-fg',
                          )}
                        >
                          <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2 : 1.75} />
                          <span className={labelCls}>{label}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Upgrade card */}
        {showUpgrade && (
          <div className={cn('hero-card relative m-3 mt-0 flex flex-col overflow-hidden rounded-xl p-3.5 [@media(max-height:980px)]:!hidden', fullOnly)}>
            <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-primary/25 blur-2xl" />
            <div className="relative flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-on-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <p className="text-[13px] font-semibold">Seja Pro</p>
              </div>
              <button onClick={dismissUpgrade} aria-label="Dispensar" className="text-white/50 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="relative mt-2 text-xs leading-relaxed text-white/70">
              Alertas no WhatsApp, Google Agenda e grupo familiar completo.
            </p>
            <a
              href="/plans"
              className="relative mt-3 inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-on-primary hover:bg-primary-hover transition-colors"
            >
              Ver planos
            </a>
          </div>
        )}

      </aside>
      </div>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top bar */}
        <header className="shrink-0 border-b border-border bg-background">
          <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menu"
                className="icon-btn md:hidden"
              >
                <Menu className="h-4 w-4" strokeWidth={1.75} />
              </button>
              {title && (
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold leading-tight tracking-tight text-fg md:text-xl [&_span]:!text-inherit">{title}</h1>
                  {subtitle && <p className="hidden truncate text-xs text-fg-muted sm:block">{subtitle}</p>}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {actions && <div className="flex items-center gap-2">{actions}</div>}

              <div className="hidden h-6 w-px bg-border sm:block" />

              <ThemeToggle />

              {/* Assistente de suporte */}
              <SupportChatWidget />

              {/* Notificações */}
              <div ref={bellRef} className="relative">
                <button
                  onClick={() => setBellOpen(v => !v)}
                  aria-label="Notificações"
                  className="icon-btn relative"
                >
                  <Bell className="h-4 w-4" strokeWidth={1.75} />
                  {todaySummary?.hasAlerts && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white ring-2 ring-background">
                      {todaySummary.fixedBills.length}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                      <span className="text-sm font-semibold text-fg">Alertas de hoje</span>
                      <button onClick={() => setBellOpen(false)} aria-label="Fechar notificações" className="text-fg-muted hover:text-fg">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {!todaySummary?.hasAlerts ? (
                      <div className="flex flex-col items-center gap-2 py-8 text-fg-muted">
                        <Bell className="h-6 w-6 opacity-50" strokeWidth={1.5} />
                        <p className="text-[13px]">Nenhuma conta vence hoje</p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-danger-soft border-b border-border">
                          <AlertCircle className="h-4 w-4 text-danger shrink-0" />
                          <p className="text-xs font-medium text-danger">
                            {todaySummary.fixedBills.length} conta{todaySummary.fixedBills.length > 1 ? 's' : ''} vence{todaySummary.fixedBills.length > 1 ? 'm' : ''} hoje
                          </p>
                        </div>
                        <ul className="divide-y divide-border max-h-64 overflow-y-auto">
                          {todaySummary.fixedBills.map((b) => (
                            <li key={b.id} className="flex items-center justify-between px-4 py-2.5">
                              <span className="text-[13px] text-fg-2 truncate mr-2">{b.title}</span>
                              <span className="text-[13px] font-semibold tabular-nums text-danger shrink-0">R$ {fmtBRL(b.value)}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="flex items-center justify-between px-4 py-2.5 bg-surface-2 border-t border-border">
                          <span className="text-xs font-medium text-fg-muted">Total</span>
                          <span className="text-[13px] font-semibold tabular-nums text-danger">R$ {fmtBRL(todaySummary.total)}</span>
                        </div>
                        <div className="border-t border-border">
                          {todaySummary?.whatsappEnabled ? (
                            <>
                              <button
                                onClick={async () => {
                                  setSending(true);
                                  setSendResult(null);
                                  try {
                                    const token = localStorage.getItem('dcash:token');
                                    const res = await fetch(`${API}/notifications/today/send`, {
                                      headers: { Authorization: `Bearer ${token}` },
                                    });
                                    const d = await res.json();
                                    setSendResult(d.info ?? (d.sent ? 'Enviado!' : 'Não enviado'));
                                  } catch {
                                    setSendResult('Erro ao enviar.');
                                  } finally {
                                    setSending(false);
                                  }
                                }}
                                disabled={sending}
                                className="flex w-full items-center justify-center gap-2 py-2.5 text-xs font-medium text-accent hover:bg-primary-soft transition-colors disabled:opacity-50"
                              >
                                {sending
                                  ? <span className="animate-pulse">Enviando...</span>
                                  : <><MessageCircle className="h-3.5 w-3.5" /> Enviar resumo por WhatsApp</>}
                              </button>
                              {sendResult && (
                                <p className="text-center text-xs pb-2 text-fg-muted">{sendResult}</p>
                              )}
                            </>
                          ) : (
                            <a
                              href="/profile"
                              className="flex w-full items-center justify-center gap-2 py-2.5 text-xs font-medium text-fg-muted hover:bg-hover transition-colors"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              {!todaySummary?.plan || todaySummary.plan !== 'pro'
                                ? 'WhatsApp disponível no plano Pro'
                                : 'Ative notifications WhatsApp no perfil'}
                            </a>
                          )}
                        </div>
                        <a
                          href="/fixed-bills"
                          className="flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-fg-2 hover:bg-hover transition-colors border-t border-border"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Ver contas fixas
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Menu do avatar */}
              <div ref={avatarRef} className="relative">
                <button
                  onClick={() => setAvatarOpen(v => !v)}
                  aria-label="Menu do usuário"
                  className="flex items-center gap-1 rounded-full p-0.5 hover:bg-hover transition-colors"
                >
                  {avatar('h-8 w-8')}
                  <ChevronDown className={cn('hidden h-3.5 w-3.5 text-fg-muted transition-transform sm:block', avatarOpen && 'rotate-180')} />
                </button>

                {avatarOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-border bg-card shadow-xl z-50 p-1.5">
                    <div className="flex items-center gap-2.5 px-2.5 py-2 mb-1 border-b border-border">
                      {avatar('h-8 w-8')}
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-fg truncate">{userName}</p>
                        <p className="text-[11px] text-fg-muted">Logado</p>
                      </div>
                    </div>

                    <a href="/profile" onClick={() => setAvatarOpen(false)} className={menuItem}>
                      <UserCircle className="h-4 w-4 text-fg-muted" strokeWidth={1.75} />
                      Meu Perfil / Configurações
                    </a>

                    <a href="/notificacoes" onClick={() => setAvatarOpen(false)} className={menuItem}>
                      <BellRing className="h-4 w-4 text-fg-muted" strokeWidth={1.75} />
                      Notificações
                    </a>

                    {isAdmin && (
                      <a href="/admin" onClick={() => setAvatarOpen(false)} className={cn(menuItem, 'text-warning hover:text-warning')}>
                        <Shield className="h-4 w-4" strokeWidth={1.75} />
                        Painel Admin
                      </a>
                    )}

                    <a href="/ajuda" onClick={() => setAvatarOpen(false)} className={menuItem}>
                      <HelpCircle className="h-4 w-4 text-fg-muted" strokeWidth={1.75} />
                      Ajuda / Guia do usuário
                    </a>

                    <TourMenuButton onNavigate={() => setAvatarOpen(false)} />

                    <div className="border-t border-border my-1" />

                    <button
                      onClick={() => {
                        setAvatarOpen(false);
                        handleLogout();
                      }}
                      className={cn(menuItem, 'text-danger hover:bg-danger-soft hover:text-danger')}
                    >
                      <LogOut className="h-4 w-4" strokeWidth={1.75} />
                      Sair da conta
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <div className={noPadding ? 'flex-1 overflow-hidden min-w-0' : 'flex-1 overflow-y-auto p-4 md:p-6'}>
          {children}
        </div>
      </main>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-overlay backdrop-blur-[2px] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
    </GuidedTourProvider>
  );
}
