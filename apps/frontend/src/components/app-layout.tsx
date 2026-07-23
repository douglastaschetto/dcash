'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Home, Wallet, PieChart, LogOut, Menu, Bell, UserCircle, CalendarCheck, CheckSquare, Trophy, Heart, PiggyBank, Star, Receipt, CalendarDays,
  AlertCircle, X, ExternalLink, MessageCircle, Shield, ArrowLeftRight, ChevronDown, ChevronRight, Layers, Landmark, Target, ListChecks, HelpCircle,
  GraduationCap,
} from 'lucide-react';
import logoSrc from '@/app/dcash.png';
import { SupportChatWidget } from '@/components/support-chat-widget';
import { GuidedTourProvider } from '@/components/guided-tour/GuidedTourProvider';
import { useGuidedTour } from '@/components/guided-tour/guided-tour-context';

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

const NAV_GROUPS: { label: string | null; icon?: React.ElementType; items: { href: string; icon: React.ElementType; label: string }[] }[] = [
  {
    label: null,
    items: [
      { href: '/dashboard-v2', icon: Home, label: 'Início' },
    ],
  },
  {
    label: 'Finanças',
    icon: Landmark,
    items: [
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
    icon: Target,
    items: [
      { href: '/piggy-banks', icon: PiggyBank, label: 'Cofrinhos' },
      { href: '/dreams',      icon: Star,      label: 'Sonhos' },
      { href: '/wishlists',   icon: Heart,     label: 'Desejos' },
      { href: '/challenges',  icon: Trophy,    label: 'Desafios' },
    ],
  },
  {
    label: 'Organização',
    icon: ListChecks,
    items: [
      { href: '/calendar', icon: CalendarDays, label: 'Agenda' },
      { href: '/todos',    icon: CheckSquare,  label: 'Tarefas' },
    ],
  },
];

type ActiveTour = { key: string; title: string };

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
      <button
        onClick={() => { onNavigate(); startTour(tours[0].key); }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-emerald-900/40 transition font-medium text-left"
      >
        <GraduationCap className="h-4 w-4 text-slate-400 dark:text-emerald-400/70" />
        🎓 Tutorial guiado
      </button>
    );
  }

  return (
    <div>
      <p className="px-4 pt-2 pb-1 text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-emerald-400/60">
        🎓 Tutoriais guiados
      </p>
      {tours.map((tour) => (
        <button
          key={tour.key}
          onClick={() => { onNavigate(); startTour(tour.key); }}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-emerald-900/40 transition font-medium text-left"
        >
          <GraduationCap className="h-4 w-4 text-slate-400 dark:text-emerald-400/70" />
          {tour.title}
        </button>
      ))}
    </div>
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const active = NAV_GROUPS.find(g => g.label && g.items.some(i => i.href === pathname));
    return active?.label ? { [active.label]: true } : {};
  });
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

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const initial = userName.charAt(0).toUpperCase();

  return (
    <GuidedTourProvider>
    <div className="flex h-screen w-screen bg-emerald-50 dark:bg-black text-slate-950 dark:text-emerald-50 overflow-hidden">

      {/* ── Sidebar com efeito Hover de Expansão ────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-emerald-950 text-white shadow-xl transition-all duration-300 ease-in-out shrink-0 overflow-hidden group
          ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-0'} 
          lg:static lg:translate-x-0 ${sidebarOpen ? 'lg:w-20 lg:hover:w-64' : 'lg:w-0'}`}
      >
        {/* Forçamos o conteúdo interno a manter 16rem (w-64) para evitar quebras de layout durante o hover */}
        <div className="flex flex-col h-full p-4 justify-between w-64">
          <div>
            {/* Brand */}
            <div className="mb-8 flex items-center gap-3 px-2">
              <Image
                src={logoSrc}
                alt="DCash"
                width={44}
                height={44}
                className="rounded-xl shrink-0"
                priority
              />
              <h1 className="text-xl font-bold transition-opacity duration-200 opacity-0 group-hover:opacity-100 lg:group-hover:block">
                DCash
              </h1>
            </div>

            {/* Nav */}
            <nav className="space-y-3 overflow-y-auto max-h-[calc(100vh-120px)] pr-1 scrollbar-none">
              {NAV_GROUPS.map((group, gi) => {
                const isOpen = group.label ? !!openGroups[group.label] : true;
                return (
                  <div key={group.label ?? `group-${gi}`} className="space-y-0.5">
                    {group.label && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.label!)}
                        title={group.label} /* Tooltip nativo caso esteja colapsado */
                        className="flex items-center gap-3 w-full rounded-xl px-3 py-2 text-emerald-100 hover:bg-emerald-800/30 transition-all"
                      >
                        {group.icon && (
                          <group.icon className="h-[18px] w-[18px] shrink-0 text-emerald-400/70" />
                        )}
                        <span className="flex-1 text-left text-[10px] font-black uppercase tracking-widest text-emerald-400/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                          {group.label}
                        </span>
                        <ChevronRight className={`h-3 w-3 text-emerald-400/50 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                      </button>
                    )}
                    {isOpen && group.items.map(({ href, icon: Icon, label }) => {
                      const active = pathname === href;
                      return (
                        <a
                          key={href}
                          href={href}
                          title={label} /* Tooltip nativo caso esteja colapsado */
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all group/item
                            ${active
                              ? 'bg-emerald-800/60 text-white'
                              : 'text-emerald-100 hover:bg-emerald-800/30'}`}
                        >
                          <Icon className={`h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover/item:scale-110 ${active ? 'text-white' : 'text-emerald-300 group-hover:text-white'}`} />
                          <span className="transition-opacity duration-200 opacity-0 group-hover:opacity-100 white-space-nowrap">
                            {label}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      </aside>

      {/* ── Main (Painel Central) ────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top bar */}
        <header className="bg-white dark:bg-emerald-950 shadow-sm dark:border-b dark:border-emerald-900 shrink-0">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-emerald-900/60 transition"
              >
                <Menu className="h-5 w-5" />
              </button>
              {title && (
                <div>
                  {subtitle && <p className="text-xs text-slate-500 dark:text-emerald-300/70">{subtitle}</p>}
                  <h1 className="text-2xl font-bold text-emerald-950 dark:text-white">{title}</h1>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {actions}

              {/* Assistente de suporte */}
              <SupportChatWidget />

              {/* Notificações */}
              <div ref={bellRef} className="relative">
                <button
                  onClick={() => setBellOpen(v => !v)}
                  className="relative p-2 text-slate-500 dark:text-emerald-300/70 hover:text-emerald-950 dark:hover:text-white transition"
                >
                  <Bell className="h-5 w-5" />
                  {todaySummary?.hasAlerts && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {todaySummary.fixedBills.length}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-white shadow-2xl border border-slate-100 z-50 overflow-hidden text-slate-950">
                    <div className="flex items-center justify-between px-4 py-3 bg-emerald-950 text-white">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        <span className="text-sm font-bold">Alertas de hoje</span>
                      </div>
                      <button onClick={() => setBellOpen(false)}>
                        <X className="h-4 w-4 text-emerald-300 hover:text-white" />
                      </button>
                    </div>

                    {!todaySummary?.hasAlerts ? (
                      <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                        <Bell className="h-8 w-8 opacity-30" />
                        <p className="text-sm">Nenhuma conta vence hoje</p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-b border-red-100">
                          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                          <p className="text-xs font-semibold text-red-700">
                            {todaySummary.fixedBills.length} conta{todaySummary.fixedBills.length > 1 ? 's' : ''} vence{todaySummary.fixedBills.length > 1 ? 'm' : ''} hoje
                          </p>
                        </div>
                        <ul className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                          {todaySummary.fixedBills.map((b) => (
                            <li key={b.id} className="flex items-center justify-between px-4 py-3">
                              <span className="text-sm text-slate-700 truncate mr-2">{b.title}</span>
                              <span className="text-sm font-bold text-red-600 shrink-0">
                                R$ {Number(b.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-100">
                          <span className="text-xs font-semibold text-slate-500">Total</span>
                          <span className="text-sm font-bold text-red-600">
                            R$ {Number(todaySummary.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="border-t border-slate-100">
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
                                className="flex w-full items-center justify-center gap-2 py-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition disabled:opacity-50"
                              >
                                {sending
                                  ? <span className="animate-pulse">Enviando...</span>
                                  : <><MessageCircle className="h-3.5 w-3.5" /> Enviar resumo por WhatsApp</>}
                              </button>
                              {sendResult && (
                                <p className="text-center text-xs pb-2 text-slate-500">{sendResult}</p>
                              )}
                            </>
                          ) : (
                            <a
                              href="/profile"
                              className="flex w-full items-center justify-center gap-2 py-3 text-xs font-semibold text-slate-400 hover:bg-slate-50 transition"
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
                          className="flex items-center justify-center gap-2 py-3 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition border-t border-slate-100"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Ver contas fixas
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Menu Dropdown do Avatar */}
              <div ref={avatarRef} className="relative">
                <button
                  onClick={() => setAvatarOpen(v => !v)}
                  className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-emerald-900/60 transition focus:outline-none"
                >
                  <div className="h-9 w-9 rounded-full overflow-hidden shadow-sm shrink-0">
                    {userAvatar ? (
                      <img src={userAvatar} alt={userName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-white font-bold text-sm flex items-center justify-center">
                        {initial}
                      </div>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 dark:text-emerald-300/70 transition-transform ${avatarOpen ? 'rotate-180' : ''}`} />
                </button>

                {avatarOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white dark:bg-emerald-950 shadow-2xl border border-slate-100 dark:border-emerald-900 z-50 py-2 text-slate-700 dark:text-emerald-100">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-emerald-900 mb-1">
                      <p className="text-xs text-slate-400 dark:text-emerald-400/60">Logado como</p>
                      <p className="text-sm font-bold text-emerald-950 dark:text-white truncate">{userName}</p>
                    </div>

                    <a
                      href="/profile"
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-emerald-900/40 transition font-medium"
                    >
                      <UserCircle className="h-4 w-4 text-slate-400 dark:text-emerald-400/70" />
                      Meu Perfil / Configurações
                    </a>

                    {isAdmin && (
                      <a
                        href="/admin"
                        onClick={() => setAvatarOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-emerald-900/40 transition font-medium text-amber-600 dark:text-amber-400"
                      >
                        <Shield className="h-4 w-4" />
                        Painel Admin
                      </a>
                    )}

                    <a
                      href="/ajuda"
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-emerald-900/40 transition font-medium"
                    >
                      <HelpCircle className="h-4 w-4 text-slate-400 dark:text-emerald-400/70" />
                      Ajuda / Guia do usuário
                    </a>

                    <TourMenuButton onNavigate={() => setAvatarOpen(false)} />

                    <div className="border-t border-slate-100 dark:border-emerald-900 my-1" />

                    <button
                      onClick={() => {
                        setAvatarOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 font-semibold text-left transition"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair da conta
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </header>

        {/* Área de Conteúdo */}
        <div className={noPadding ? 'flex-1 overflow-hidden min-w-0' : 'flex-1 overflow-y-auto p-6 lg:p-8 scrollbar-thin'}>
          {children}
        </div>
      </main>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
    </GuidedTourProvider>
  );
}