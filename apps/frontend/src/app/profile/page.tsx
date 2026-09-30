'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2, Sun, Moon, Monitor, Save, CalendarDays,
  Crown, Zap, Star, MessageCircle, Camera,
} from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { FamilyGroupCard } from './components/FamilyGroupCard';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dcash:token') : null;
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

function getAuthOnlyHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dcash:token') : null;
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

type ThemeOption = 'light' | 'dark' | 'system';

type FamilyGroup = {
  id: string;
  name: string;
  inviteCode: string;
  isOwner?: boolean;
  ownerId?: string;
};

type Plan = 'free' | 'basico' | 'intermediario' | 'pro' | string;

type Profile = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  theme?: ThemeOption;
  plan?: Plan;
  isAdmin?: boolean;
  whatsappConsent?: boolean;
  whatsappAlertHour?: number;
  googleCalendarSync?: boolean;
  planExpiresAt?: string | null;
  planStatus?: 'active' | 'past_due' | 'canceling';
  planBillingCycle?: 'monthly' | 'yearly' | null;
  familyGroupId?: string;
  familyGroup?: FamilyGroup | null;
};

const ALERT_HOURS = Array.from({ length: 24 }, (_, h) => h);

type PlanMeta = {
  key: string;
  label: string;
  price: string;
  icon: React.ElementType;
  color: string;
  activeBg: string;
  activeBorder: string;
  badgeBg: string;
  badgeText: string;
  perks: string[];
};

const PLANS: PlanMeta[] = [
  {
    key: 'free',
    label: 'Gratuito',
    price: 'R$ 0/mês',
    icon: Star,
    color: 'text-slate-500 dark:text-zinc-400',
    activeBg: 'bg-slate-50',
    activeBorder: 'border-slate-400',
    badgeBg: 'bg-slate-100 dark:bg-zinc-800',
    badgeText: 'text-slate-600 dark:text-zinc-300',
    perks: ['Transações básicas', 'Relatórios mensais', '3 categorias', '1 cartão'],
  },
  {
    key: 'basico',
    label: 'Básico',
    price: 'R$ 9,90/mês',
    icon: Zap,
    color: 'text-blue-500',
    activeBg: 'bg-blue-50',
    activeBorder: 'border-blue-400',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/40',
    badgeText: 'text-blue-700 dark:text-blue-400',
    perks: ['Tudo do Gratuito', 'Categorias ilimitadas', 'Contas fixas', 'Exportar relatórios'],
  },
  {
    key: 'intermediario',
    label: 'Intermediário',
    price: 'R$ 19,90/mês',
    icon: Crown,
    color: 'text-emerald-600',
    activeBg: 'bg-emerald-50',
    activeBorder: 'border-emerald-500',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    perks: ['Tudo do Básico', 'Grupo familiar', 'Metas e sonhos', 'Cartões ilimitados'],
  },
  {
    key: 'pro',
    label: 'Pro',
    price: 'R$ 34,90/mês',
    icon: Crown,
    color: 'text-amber-500',
    activeBg: 'bg-amber-50',
    activeBorder: 'border-amber-400',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/40',
    badgeText: 'text-amber-700 dark:text-amber-400',
    perks: ['Tudo do Intermediário', 'Google Agenda', 'Alertas WhatsApp', 'Suporte prioritário'],
  },
];

const THEMES: { value: ThemeOption; label: string; icon: React.ElementType; desc: string }[] = [
  { value: 'light',  label: 'Claro',   icon: Sun,     desc: 'Sempre tema claro' },
  { value: 'dark',   label: 'Escuro',  icon: Moon,    desc: 'Sempre tema escuro' },
  { value: 'system', label: 'Sistema', icon: Monitor, desc: 'Segue o dispositivo' },
];

function applyTheme(theme: ThemeOption) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    root.removeAttribute('data-theme');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
  }
  localStorage.setItem('dcash:theme', theme);
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [theme, setTheme] = useState<ThemeOption>('system');
  const [profileMsg, setProfileMsg] = useState('');
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);
  const [whatsappAlertHour, setWhatsappAlertHour] = useState(8);
  const [savingAlertHour, setSavingAlertHour] = useState(false);
  const [googleCalendarSync, setGoogleCalendarSync] = useState(true);
  const [savingGoogleSync, setSavingGoogleSync] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API}/auth/me`, { headers: getAuthHeaders() });
      if (!res.ok) { setLoadError(true); return; }
      setLoadError(false);
      const data: Profile = await res.json();
      setProfile(data);
      setName(data.name ?? '');
      setPhone(data.phone ?? '');
      setAvatar(data.avatar ?? null);
      setWhatsappConsent(data.whatsappConsent ?? false);
      setWhatsappAlertHour(data.whatsappAlertHour ?? 8);
      setGoogleCalendarSync(data.googleCalendarSync ?? true);
      const savedTheme = (localStorage.getItem('dcash:theme') as ThemeOption) || data.theme || 'system';
      setTheme(savedTheme);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    fetch(`${API}/notifications/google/status`, { headers: getAuthHeaders() })
      .then(r => r.json()).then(d => setGoogleConnected(d.connected)).catch(() => {});
  }, [loadProfile]);

  const saveProfile = async () => {
    setSaving(true);
    setProfileMsg('');
    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, phone }),
      });
      if (res.ok) {
        const updated: Profile = await res.json();
        setProfile(updated);
        const stored = JSON.parse(localStorage.getItem('dcash:user') || '{}');
        localStorage.setItem('dcash:user', JSON.stringify({ ...stored, name: updated.name }));
        setProfileMsg('Perfil salvo com sucesso!');
      } else {
        setProfileMsg('Erro ao salvar. Tente novamente.');
      }
    } catch {
      setProfileMsg('Erro de conexão.');
    } finally {
      setSaving(false);
      setTimeout(() => setProfileMsg(''), 3000);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Cancelar sua assinatura? Você mantém acesso ao plano até o fim do período já pago.')) return;
    setCancelingSubscription(true);
    try {
      const res = await fetch(`${API}/payment/cancel-subscription`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        await loadProfile();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.message || 'Erro ao cancelar assinatura.');
      }
    } catch {
      alert('Erro de conexão.');
    } finally {
      setCancelingSubscription(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Imagem deve ter menos de 2MB.'); return; }
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploadRes = await fetch(`${API}/upload`, {
        method: 'POST',
        headers: getAuthOnlyHeaders(),
        body: fd,
      });
      if (!uploadRes.ok) throw new Error();
      const { url } = await uploadRes.json();

      const profileRes = await fetch(`${API}/auth/profile`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ avatar: url }),
      });
      if (profileRes.ok) {
        const updated: Profile = await profileRes.json();
        setAvatar(updated.avatar ?? url);
        setProfile(p => p ? { ...p, avatar: updated.avatar ?? url } : p);
        const stored = JSON.parse(localStorage.getItem('dcash:user') || '{}');
        localStorage.setItem('dcash:user', JSON.stringify({ ...stored, avatar: updated.avatar ?? url }));
      }
    } catch {
      alert('Falha ao enviar imagem.');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const toggleConsent = async (value: boolean) => {
    setSavingConsent(true);
    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ whatsappConsent: value }),
      });
      if (res.ok) {
        const updated: Profile = await res.json();
        setWhatsappConsent(updated.whatsappConsent ?? value);
        setProfile(p => p ? { ...p, whatsappConsent: updated.whatsappConsent ?? value } : p);
      }
    } catch {
      setWhatsappConsent(!value);
    } finally {
      setSavingConsent(false);
    }
  };

  const saveAlertHour = async (hour: number) => {
    setWhatsappAlertHour(hour);
    setSavingAlertHour(true);
    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ whatsappAlertHour: hour }),
      });
      if (res.ok) {
        const updated: Profile = await res.json();
        setWhatsappAlertHour(updated.whatsappAlertHour ?? hour);
      }
    } finally {
      setSavingAlertHour(false);
    }
  };

  const toggleGoogleSync = async (value: boolean) => {
    setGoogleCalendarSync(value);
    setSavingGoogleSync(true);
    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ googleCalendarSync: value }),
      });
      if (res.ok) {
        const updated: Profile = await res.json();
        setGoogleCalendarSync(updated.googleCalendarSync ?? value);
      }
    } catch {
      setGoogleCalendarSync(!value);
    } finally {
      setSavingGoogleSync(false);
    }
  };

  const saveTheme = async (t: ThemeOption) => {
    setTheme(t);
    applyTheme(t);
    setSavingTheme(true);
    try {
      await fetch(`${API}/auth/theme`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ theme: t }),
      });
    } finally {
      setSavingTheme(false);
    }
  };

  const connectGoogle = async () => {
    setGoogleLoading(true);
    try {
      const res = await fetch(`${API}/notifications/google/auth-url`, { headers: getAuthHeaders() });
      const data = await res.json();
      window.location.href = data.url;
    } catch {
      alert('Erro ao conectar Google Agenda.');
      setGoogleLoading(false);
    }
  };

  const initial = (name || profile?.name || 'U').charAt(0).toUpperCase();

  if (loading) {
    return (
      <AppLayout title="Perfil">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Perfil" subtitle="Gerencie seus dados e preferências">
      {loadError && (
        <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/40 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Não foi possível carregar seus dados de perfil. Tente novamente em instantes.
          </p>
          <button
            onClick={loadProfile}
            className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
          >
            Tentar novamente
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Coluna Esquerda ───────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* SEÇÃO: Conta */}
          <section>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2 px-1">Conta</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Dados Pessoais */}
              <div data-tour="profile-personal-data" className="rounded-2xl border border-emerald-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative shrink-0 group">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="relative block h-11 w-11 rounded-full overflow-hidden focus:outline-none"
                      title="Alterar foto"
                    >
                      {avatar ? (
                        <img src={avatar} alt={profile?.name ?? ''} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-white text-base font-bold">
                          {initial}
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        {uploadingAvatar
                          ? <Loader2 className="h-4 w-4 text-white animate-spin" />
                          : <Camera className="h-4 w-4 text-white" />}
                      </div>
                    </button>
                    {profile?.isAdmin && (
                      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 shadow-md pointer-events-none" title="Master">
                        <Crown className="h-3 w-3 text-white" />
                      </span>
                    )}
                    <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={handleAvatarUpload} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-bold text-emerald-950 dark:text-white truncate">{profile?.name}</h2>
                      {profile?.isAdmin && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 shrink-0">
                          <Crown className="h-3 w-3" /> ADMIN
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-500 truncate">{profile?.email}</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Nome</label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full rounded-lg bg-emerald-50 dark:bg-zinc-800 border border-emerald-200 dark:border-zinc-700 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                      placeholder="Seu nome"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">E-mail</label>
                    <input
                      value={profile?.email ?? ''}
                      readOnly
                      className="w-full rounded-lg bg-slate-100 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 px-3 py-2 text-sm text-slate-500 dark:text-zinc-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">WhatsApp / Telefone</label>
                    <input
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full rounded-lg bg-emerald-50 dark:bg-zinc-800 border border-emerald-200 dark:border-zinc-700 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                      placeholder="+55 11 99999-9999"
                    />
                  </div>

                  {profileMsg && (
                    <p className={`text-xs font-medium ${profileMsg.includes('sucesso') ? 'text-emerald-600' : 'text-red-500'}`}>
                      {profileMsg}
                    </p>
                  )}

                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-lg bg-emerald-950 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 transition"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Salvar alterações
                  </button>
                </div>
              </div>

              {/* Notificações & Integrações */}
              <div data-tour="profile-notifications">
                {(() => {
                  const currentPlan = (profile?.plan ?? 'free').toLowerCase();
                  const planAllows = currentPlan === 'pro';
                  const hasPhone = !!phone.trim();

                  const waFlag = !planAllows
                    ? { text: 'Só Pro', cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' }
                    : whatsappConsent
                      ? { text: 'Ativo', cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' }
                      : { text: 'Inativo', cls: 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500' };

                  const gFlag = googleConnected
                    ? { text: 'Conectado', cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' }
                    : { text: 'Não conectado', cls: 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500' };

                  return (
                    <div className="rounded-2xl border border-emerald-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm divide-y divide-slate-100 dark:divide-zinc-800 h-full">

                      {/* WhatsApp row */}
                      <div className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${whatsappConsent && planAllows ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-slate-100 dark:bg-zinc-800'}`}>
                            <MessageCircle className={`h-4 w-4 ${whatsappConsent && planAllows ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-500'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-emerald-950 dark:text-white">WhatsApp</p>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-500 truncate">Alertas de contas e resumos financeiros</p>
                          </div>
                          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${waFlag.cls}`}>
                            {waFlag.text}
                          </span>
                        </div>

                        {!planAllows ? (
                          <button
                            onClick={() => router.push('/plans')}
                            className="mt-2 ml-12 text-[11px] font-bold text-amber-700 underline hover:text-amber-900 transition"
                          >
                            Ver planos ↓
                          </button>
                        ) : (
                          <div className="mt-3 ml-12 space-y-2">
                            {!hasPhone && (
                              <p className="text-[11px] text-red-600 font-medium">Cadastre seu número acima para ativar.</p>
                            )}
                            <div className="flex items-center gap-3">
                              <button
                                role="switch"
                                aria-checked={whatsappConsent}
                                disabled={savingConsent || !hasPhone}
                                onClick={() => toggleConsent(!whatsappConsent)}
                                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40
                                  ${whatsappConsent ? 'bg-emerald-500' : 'bg-slate-300'}
                                  ${savingConsent ? 'opacity-60' : ''}`}
                              >
                                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform
                                  ${whatsappConsent ? 'translate-x-4' : 'translate-x-0.5'}`} />
                              </button>
                              <span className="text-xs text-slate-600 dark:text-zinc-400">Receber alertas</span>

                              {whatsappConsent && hasPhone && (
                                <select
                                  value={whatsappAlertHour}
                                  onChange={e => saveAlertHour(Number(e.target.value))}
                                  disabled={savingAlertHour}
                                  className="ml-auto rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-emerald-500 transition disabled:opacity-60"
                                >
                                  {ALERT_HOURS.map(h => (
                                    <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Google Agenda row */}
                      <div className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${googleConnected ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-slate-100 dark:bg-zinc-800'}`}>
                            <CalendarDays className={`h-4 w-4 ${googleConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-500'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-emerald-950 dark:text-white">Google Agenda</p>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-500 truncate">Sincroniza vencimentos e lembretes</p>
                          </div>
                          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${gFlag.cls}`}>
                            {gFlag.text}
                          </span>
                        </div>

                        {googleConnected ? (
                          <div className="mt-3 ml-12 flex items-center gap-3">
                            <button
                              role="switch"
                              aria-checked={googleCalendarSync}
                              disabled={savingGoogleSync}
                              onClick={() => toggleGoogleSync(!googleCalendarSync)}
                              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none
                                ${googleCalendarSync ? 'bg-emerald-500' : 'bg-slate-300'}
                                ${savingGoogleSync ? 'opacity-60' : ''}`}
                            >
                              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform
                                ${googleCalendarSync ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </button>
                            <span className="text-xs text-slate-600 dark:text-zinc-400">Sincronizar eventos automaticamente</span>
                          </div>
                        ) : (
                          <button
                            onClick={connectGoogle}
                            disabled={googleLoading}
                            className="mt-2 ml-12 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 transition disabled:opacity-50"
                          >
                            {googleLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarDays className="h-3 w-3" />}
                            Conectar Agenda
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </section>

          {/* SEÇÃO: Assinatura & Aparência */}
          <section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Assinatura */}
              <div data-tour="profile-subscription">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2 px-1">Assinatura</p>
                {(() => {
                  const currentKey = (profile?.plan ?? 'free').toLowerCase();
                  const current = PLANS.find(p => p.key === currentKey) ?? PLANS[0];
                  const CurrentIcon = current.icon;
                  const isHighest = currentKey === 'pro';

                  return (
                    <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm h-full flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-full ${current.activeBg} dark:bg-zinc-800 shrink-0`}>
                          <CurrentIcon className={`h-5 w-5 ${current.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-slate-500 dark:text-zinc-500 font-medium">Seu plano</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-emerald-950 dark:text-white">{current.label}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${current.badgeBg} ${current.badgeText}`}>
                              {current.price}
                            </span>
                          </div>
                          {profile?.planExpiresAt && (
                            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                              {profile.planStatus === 'canceling'
                                ? `Cancela em ${new Date(profile.planExpiresAt).toLocaleDateString('pt-BR')}`
                                : `Renova em ${new Date(profile.planExpiresAt).toLocaleDateString('pt-BR')}`}
                              {profile.planStatus === 'past_due' && (
                                <span className="text-amber-600 dark:text-amber-400 font-semibold"> · Pagamento pendente</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                        {!isHighest && (
                          <button
                            onClick={() => router.push('/plans')}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition"
                          >
                            <Zap className="h-3.5 w-3.5" />
                            Upgrade de Plano
                          </button>
                        )}
                        {profile?.planExpiresAt && profile.planStatus !== 'canceling' && (
                          <button
                            onClick={handleCancelSubscription}
                            disabled={cancelingSubscription}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:border-red-300 hover:text-red-500 disabled:opacity-50 transition"
                          >
                            {cancelingSubscription ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                            Cancelar assinatura
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Aparência */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2 px-1">Aparência</p>
                <div className="rounded-2xl border border-emerald-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm h-full flex flex-col justify-center">
                  <div className="grid grid-cols-3 gap-2">
                    {THEMES.map(({ value, label, icon: Icon }) => {
                      const active = theme === value;
                      return (
                        <button
                          key={value}
                          onClick={() => saveTheme(value)}
                          className={`relative flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-center transition
                            ${active
                              ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 shadow-sm'
                              : 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-emerald-200 hover:bg-emerald-50/50 dark:hover:bg-zinc-800'}`}
                        >
                          <Icon className={`h-5 w-5 ${active ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-zinc-500'}`} />
                          <p className={`text-[10px] font-bold ${active ? 'text-emerald-950 dark:text-white' : 'text-slate-600 dark:text-zinc-400'}`}>{label}</p>
                          {active && (
                            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {savingTheme && (
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-2 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ── Coluna Direita ──────────────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2 px-1">Família</p>
          <FamilyGroupCard />
        </div>

      </div>
    </AppLayout>
  );
}