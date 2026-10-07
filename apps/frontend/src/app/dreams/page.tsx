'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppLayout } from '@/components/app-layout';
import { PlanGate } from '@/components/plan-gate';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { CurrencyInput } from '@/lib/currency-input';
import { cn, parseDateOnly } from '@/lib/utils';
import { Modal } from '@/app/dashboard-v2/components/Modal';
import {
  Plus, Trash2, Edit3, Loader2, Image as ImageIcon, Target, Wallet, ListChecks, Settings2,
  Trophy, Calendar, Link, Upload, Camera, TrendingUp, Star, CalendarClock, AlertTriangle,
  Rocket, Search, Coins, CheckCircle2, Hourglass, Sparkles, X,
} from '@/components/ui/icons';

interface Dream {
  id: string;
  title: string;
  targetValue: number;
  savedValue: number;
  imageUrl?: string;
  deadline?: string;
  piggyBankId?: string;
  wishlistId?: string;
  createdAt?: string;
  piggyBank?: { id: string; name: string; balance: number } | null;
}

type Named = { id: string; name?: string; product?: string };
type Tx = { type: string; amount: number | string; date: string; piggyBankId?: string | null };

type LinkType = 'MANUAL' | 'PIGGY' | 'WISHLIST';
type ImageMode = 'url' | 'upload';
type Status = 'done' | 'late' | 'ontrack' | 'ahead' | 'nodeadline';
type Filter = 'all' | 'active' | 'late' | 'done';
type Sort = 'deadline' | 'progress' | 'value';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtMonthYear = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');
const monthsBetween = (a: Date, b: Date) =>
  (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + (b.getDate() - a.getDate()) / 30;

const STATUS_META: Record<Status, { label: string; cls: string; icon: React.ElementType }> = {
  done:       { label: 'Realizado',     cls: 'border-primary-border bg-primary-soft text-accent', icon: Trophy },
  ahead:      { label: 'Adiantado',     cls: 'border-primary-border bg-primary-soft text-accent', icon: Rocket },
  ontrack:    { label: 'No ritmo',      cls: 'border-info/30 bg-info-soft text-info',             icon: TrendingUp },
  late:       { label: 'Atrasado',      cls: 'border-danger/30 bg-danger-soft text-danger',       icon: AlertTriangle },
  nodeadline: { label: 'Sem prazo',     cls: 'border-border bg-surface-2 text-fg-2',              icon: Hourglass },
};

const EMPTY_FORM = { id: '', title: '', targetValue: 0, savedValue: 0, deadline: '', imageUrl: '', linkedId: '' };

export default function DreamsPage() {
  useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dreams, setDreams] = useState<Dream[]>([]);
  const [piggyBanks, setPiggyBanks] = useState<Named[]>([]);
  const [wishlists, setWishlists] = useState<Named[]>([]);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<Filter>('active');
  const [sort, setSort] = useState<Sort>('deadline');
  const [search, setSearch] = useState('');
  const [contribDream, setContribDream] = useState<Dream | null>(null);
  const [contribAmount, setContribAmount] = useState(0);
  const [contribSaving, setContribSaving] = useState(false);

  const [linkType, setLinkType] = useState<LinkType>('MANUAL');
  const [imageMode, setImageMode] = useState<ImageMode>('url');
  const [form, setForm] = useState(EMPTY_FORM);

  const f = <K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  /* ── Data ──────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [dRes, pRes, wRes, tRes] = await Promise.allSettled([
        api.get('/dreams'),
        api.get('/piggy-banks'),
        api.get('/wishlists'),
        api.get('/transactions'),
      ]);
      if (dRes.status === 'fulfilled') {
        setDreams((dRes.value.data ?? []).map((d: Dream) => ({
          ...d, targetValue: Number(d.targetValue || 0), savedValue: Number(d.savedValue || 0),
        })));
      }
      if (pRes.status === 'fulfilled') setPiggyBanks(pRes.value.data ?? []);
      if (wRes.status === 'fulfilled') setWishlists(wRes.value.data ?? []);
      if (tRes.status === 'fulfilled') setTransactions(tRes.value.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Insights ──────────────────────────────────────────────────── */
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  /** Average net monthly flow into a piggy bank over the last 3 full months. */
  const piggyPace = useCallback((piggyId: string) => {
    const start = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 1);
    const sum = transactions
      .filter((t) => t.piggyBankId === piggyId)
      .filter((t) => { const d = parseDateOnly(t.date); return d >= start && d < end; })
      .reduce((s, t) => s + Number(t.amount), 0);
    return sum / 3;
  }, [transactions, today]);

  const avgIncome = useMemo(() => {
    const start = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 1);
    return transactions
      .filter((t) => t.type === 'INCOME')
      .filter((t) => { const d = parseDateOnly(t.date); return d >= start && d < end; })
      .reduce((s, t) => s + Number(t.amount), 0) / 3;
  }, [transactions, today]);

  const insightOf = useCallback((d: Dream) => {
    const target = d.targetValue;
    const saved = d.savedValue;
    const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
    const missing = Math.max(0, target - saved);
    const deadline = d.deadline ? parseDateOnly(d.deadline) : null;
    const created = d.createdAt ? new Date(d.createdAt) : null;
    const monthsLeft = deadline ? Math.max(0, monthsBetween(today, deadline)) : null;
    const neededPerMonth = deadline && missing > 0 ? missing / Math.max(1, Math.ceil(monthsLeft ?? 0)) : 0;

    // Pace: real piggy-bank inflow when linked, otherwise average since the dream was created
    const elapsed = created ? Math.max(1, monthsBetween(created, today)) : null;
    const pace = d.piggyBankId ? piggyPace(d.piggyBankId) : elapsed ? saved / elapsed : 0;
    const monthsAtPace = missing > 0 && pace > 0 ? Math.ceil(missing / pace) : null;
    const eta = monthsAtPace !== null ? new Date(today.getFullYear(), today.getMonth() + monthsAtPace, 1) : null;

    let status: Status;
    if (target > 0 && missing === 0) status = 'done';
    else if (!deadline) status = 'nodeadline';
    else if (deadline < today) status = 'late';
    else if (created && deadline > created) {
      const expected = Math.min(100, (monthsBetween(created, today) / monthsBetween(created, deadline)) * 100);
      status = pct >= expected + 10 ? 'ahead' : pct >= expected - 10 ? 'ontrack' : 'late';
    } else status = eta && eta > deadline ? 'late' : 'ontrack';

    return { pct, missing, deadline, monthsLeft, neededPerMonth, pace, eta, status };
  }, [today, piggyPace]);

  const enriched = useMemo(() => dreams.map((d) => ({ dream: d, ins: insightOf(d) })), [dreams, insightOf]);

  const totals = useMemo(() => {
    const active = enriched.filter((e) => e.ins.status !== 'done');
    return {
      target: dreams.reduce((s, d) => s + d.targetValue, 0),
      saved: dreams.reduce((s, d) => s + Math.min(d.savedValue, d.targetValue || d.savedValue), 0),
      missing: active.reduce((s, e) => s + e.ins.missing, 0),
      monthly: active.reduce((s, e) => s + e.ins.neededPerMonth, 0),
      done: enriched.length - active.length,
      late: enriched.filter((e) => e.ins.status === 'late').length,
      active: active.length,
    };
  }, [enriched, dreams]);

  const closest = useMemo(() => enriched
    .filter((e) => e.ins.status !== 'done')
    .sort((a, b) => b.ins.pct - a.ins.pct)[0], [enriched]);

  const timeline = useMemo(() => enriched
    .filter((e) => e.ins.status !== 'done' && (e.ins.deadline || e.ins.eta))
    .sort((a, b) => ((a.ins.deadline ?? a.ins.eta)!.getTime()) - ((b.ins.deadline ?? b.ins.eta)!.getTime())), [enriched]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched
      .filter((e) => !q || e.dream.title.toLowerCase().includes(q))
      .filter((e) => filter === 'all' ? true
        : filter === 'done' ? e.ins.status === 'done'
        : filter === 'late' ? e.ins.status === 'late'
        : e.ins.status !== 'done')
      .sort((a, b) => {
        if (sort === 'progress') return b.ins.pct - a.ins.pct;
        if (sort === 'value') return b.dream.targetValue - a.dream.targetValue;
        const da = a.ins.deadline?.getTime() ?? Infinity, db = b.ins.deadline?.getTime() ?? Infinity;
        return da - db;
      });
  }, [enriched, filter, sort, search]);

  /* ── Modal ─────────────────────────────────────────────────────── */
  const openCreate = () => {
    setForm(EMPTY_FORM); setLinkType('MANUAL'); setImageMode('url'); setIsModalOpen(true);
  };

  const openEdit = (d: Dream) => {
    setForm({
      id: d.id, title: d.title, targetValue: d.targetValue, savedValue: d.savedValue,
      deadline: d.deadline ? d.deadline.split('T')[0] : '', imageUrl: d.imageUrl ?? '',
      linkedId: d.piggyBankId ?? d.wishlistId ?? '',
    });
    setLinkType(d.piggyBankId ? 'PIGGY' : d.wishlistId ? 'WISHLIST' : 'MANUAL');
    setImageMode(d.imageUrl?.startsWith('http://localhost') ? 'upload' : 'url');
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Imagem deve ter menos de 2MB.'); return; }
    const fd = new FormData();
    fd.append('file', file);
    try {
      setUploading(true);
      const { data } = await api.post('/upload', fd);
      f('imageUrl', data.url);
    } catch { alert('Falha ao enviar imagem.'); } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        targetValue: form.targetValue,
        savedValue: linkType === 'MANUAL' ? form.savedValue : 0,
        deadline: form.deadline || null,
        imageUrl: form.imageUrl || null,
        piggyBankId: linkType === 'PIGGY' ? form.linkedId : null,
        wishlistId: linkType === 'WISHLIST' ? form.linkedId : null,
      };
      if (form.id) await api.put(`/dreams/${form.id}`, payload);
      else await api.post('/dreams', payload);
      setIsModalOpen(false);
      load();
    } catch { alert('Erro ao salvar sonho.'); } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Remover o sonho "${title}"?`)) return;
    try { await api.delete(`/dreams/${id}`); load(); } catch { alert('Erro ao remover.'); }
  };

  /* ── Quick contribution ────────────────────────────────────────── */
  const openContribution = (d: Dream) => { setContribDream(d); setContribAmount(0); };

  const saveContribution = async () => {
    if (!contribDream || contribAmount <= 0) return;
    setContribSaving(true);
    try {
      if (contribDream.piggyBankId) {
        await api.post(`/piggy-banks/${contribDream.piggyBankId}/deposit`, { amount: contribAmount });
      } else {
        await api.patch(`/dreams/${contribDream.id}/progress`, { savedValue: contribDream.savedValue + contribAmount });
      }
      setContribDream(null);
      load();
    } catch (err) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Não foi possível guardar o valor.');
    } finally {
      setContribSaving(false);
    }
  };

  const addButton = (
    <button data-tour="dreams-add-btn" onClick={openCreate} className="group btn btn-primary">
      <Plus size={16} className="group-hover:rotate-90 transition-transform" /> Novo sonho
    </button>
  );

  const totalPct = totals.target > 0 ? Math.min(100, (totals.saved / totals.target) * 100) : 0;
  const incomeShare = avgIncome > 0 ? (totals.monthly / avgIncome) * 100 : null;
  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'active', label: 'Em andamento', count: totals.active },
    { key: 'late',   label: 'Atrasados',    count: totals.late },
    { key: 'done',   label: 'Realizados',   count: totals.done },
    { key: 'all',    label: 'Todos',        count: dreams.length },
  ];

  const fieldLabel = 'mb-1.5 block text-xs font-medium text-fg-2';
  const formPct = form.targetValue > 0 && linkType === 'MANUAL' ? Math.min(100, (form.savedValue / form.targetValue) * 100) : 0;

  return (
    <AppLayout title="Mural de Sonhos" subtitle="Projetos de vida e metas maiores" actions={addButton} noPadding>
      <PlanGate feature="dreams_goals">
      <div className="h-full overflow-y-auto">
      <div className="w-full p-4 md:p-6 space-y-4">

        {loading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface-2" />)}
          </div>
        )}

        {!loading && dreams.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <Star size={32} strokeWidth={1.5} className="mx-auto mb-3 text-fg-disabled" />
            <p className="text-base font-semibold text-fg">Nenhum sonho projetado ainda</p>
            <p className="mt-1 text-sm text-fg-muted">Defina um objetivo, um prazo e acompanhe quanto falta por mês para realizá-lo.</p>
            <button onClick={openCreate} className="btn btn-primary mt-5"><Plus size={16} /> Criar primeiro sonho</button>
          </div>
        )}

        {!loading && dreams.length > 0 && (
          <>
            {/* ── KPIs ───────────────────────────────────────────── */}
            <section data-tour="dreams-kpi-cards" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="hero-card relative overflow-hidden rounded-2xl p-5">
                <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full border border-white/10" />
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-[13px] font-medium text-white/70"><Star size={15} strokeWidth={1.75} /> Total reservado</p>
                  <span className="text-[11px] text-white/50">{dreams.length} sonho{dreams.length === 1 ? '' : 's'}</span>
                </div>
                <p className="mt-4 text-[26px] leading-none font-semibold tracking-tight tabular-nums">{fmtBRL(totals.saved)}</p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${totalPct}%` }} />
                </div>
                <p className="mt-2 text-[11px] text-white/60 tabular-nums">{totalPct.toFixed(0)}% de {fmtBRL(totals.target)}</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-fg-2">Falta reunir</p>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-fg-muted"><Target size={15} strokeWidth={1.75} /></span>
                </div>
                <p className="mt-3 text-[26px] leading-none font-semibold tracking-tight tabular-nums text-fg">{fmtBRL(totals.missing)}</p>
                <p className="mt-3 text-[11px] text-fg-muted">
                  {totals.active} em andamento · {totals.done} realizado{totals.done === 1 ? '' : 's'}
                  {totals.late > 0 && <span className="font-medium text-danger"> · {totals.late} atrasado{totals.late === 1 ? '' : 's'}</span>}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-fg-2">Necessário por mês</p>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-fg-muted"><CalendarClock size={15} strokeWidth={1.75} /></span>
                </div>
                <p className="mt-3 text-[26px] leading-none font-semibold tracking-tight tabular-nums text-fg">{fmtBRL(totals.monthly)}</p>
                <p className={cn('mt-3 text-[11px]', incomeShare !== null && incomeShare > 30 ? 'font-medium text-warning' : 'text-fg-muted')}>
                  {incomeShare !== null
                    ? `${incomeShare.toFixed(0)}% da sua renda média mensal`
                    : 'para cumprir os prazos definidos'}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-fg-2">Mais perto de realizar</p>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-accent"><Sparkles size={15} strokeWidth={1.75} /></span>
                </div>
                {closest ? (
                  <>
                    <p className="mt-3 truncate text-lg font-semibold leading-tight text-fg">{closest.dream.title}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-track">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${closest.ins.pct}%` }} />
                    </div>
                    <p className="mt-2 text-[11px] tabular-nums text-fg-muted">{closest.ins.pct.toFixed(0)}% · faltam {fmtBRL(closest.ins.missing)}</p>
                  </>
                ) : (
                  <p className="mt-3 text-[13px] text-accent">Todos os sonhos realizados! 🎉</p>
                )}
              </div>
            </section>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
              {/* ═══════ Sonhos ═══════ */}
              <div className="min-w-0 space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex w-fit max-w-full overflow-x-auto scrollbar-none rounded-lg border border-border bg-surface-2 p-0.5" role="tablist">
                    {filters.map((fl) => (
                      <button key={fl.key} role="tab" aria-selected={filter === fl.key} onClick={() => setFilter(fl.key)}
                        className={cn('flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 text-xs font-medium transition-colors',
                          filter === fl.key ? 'bg-card text-fg border-border shadow-xs' : 'text-fg-muted hover:text-fg border-transparent')}>
                        {fl.label}
                        <span className={cn('text-[10px] tabular-nums', fl.key === 'late' && fl.count > 0 ? 'text-danger' : 'text-fg-muted')}>{fl.count}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 lg:w-56 lg:flex-none">
                      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar sonho..." className="field h-9 !pl-8 !text-[13px]" />
                    </div>
                    <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Ordenar" className="field h-9 !w-auto !text-[13px]">
                      <option value="deadline">Prazo mais próximo</option>
                      <option value="progress">Maior progresso</option>
                      <option value="value">Maior valor</option>
                    </select>
                  </div>
                </div>

                {visible.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-card py-14 text-center text-[13px] text-fg-muted">Nenhum sonho neste filtro.</div>
                ) : (
                  <div data-tour="dreams-grid" className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3 min-[1900px]:grid-cols-4">
                    {visible.map(({ dream, ins }) => {
                      const meta = STATUS_META[ins.status];
                      const StatusIcon = meta.icon;
                      const done = ins.status === 'done';
                      return (
                        <article key={dream.id} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-border-hover">
                          {/* Cover */}
                          <div className="relative h-40 overflow-hidden bg-surface-2">
                            {dream.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={dream.imageUrl} alt={dream.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <ImageIcon size={40} className="text-fg-disabled" strokeWidth={1} />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                            <span className={cn('absolute left-3 top-3 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium backdrop-blur-sm', meta.cls)}>
                              <StatusIcon size={11} /> {meta.label}
                            </span>
                            <div className="absolute right-3 top-3 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                              <button onClick={() => openEdit(dream)} aria-label="Editar" className="flex h-7 w-7 items-center justify-center rounded-md bg-black/35 text-white backdrop-blur-sm hover:bg-black/55 transition">
                                <Edit3 size={13} />
                              </button>
                              <button onClick={() => handleDelete(dream.id, dream.title)} aria-label="Remover" className="flex h-7 w-7 items-center justify-center rounded-md bg-black/35 text-white backdrop-blur-sm hover:bg-danger transition">
                                <Trash2 size={13} />
                              </button>
                            </div>
                            <div className="absolute bottom-3 left-4 right-4">
                              <p className="truncate text-base font-semibold text-white">{dream.title}</p>
                              <p className="flex items-center gap-1.5 text-[11px] text-white/70">
                                {dream.piggyBankId ? <><Wallet size={11} /> {dream.piggyBank?.name ?? 'Cofrinho'}</> : dream.wishlistId ? <><ListChecks size={11} /> Lista de desejos</> : <><Settings2 size={11} /> Manual</>}
                                {ins.deadline && <><span className="text-white/40">·</span><Calendar size={11} /> {fmtMonthYear(ins.deadline)}</>}
                              </p>
                            </div>
                          </div>

                          {/* Body */}
                          <div className="flex flex-1 flex-col gap-4 p-4">
                            <div>
                              <div className="mb-2 flex items-end justify-between gap-2">
                                <div>
                                  <p className="text-[11px] text-fg-muted">Reservado</p>
                                  <p className="text-xl font-semibold tabular-nums tracking-tight text-fg">{fmtBRL(dream.savedValue)}</p>
                                </div>
                                <div className="text-right">
                                  <p className={cn('text-lg font-semibold tabular-nums', done ? 'text-accent' : 'text-fg')}>{Math.round(ins.pct)}%</p>
                                  <p className="text-[11px] tabular-nums text-fg-muted">de {fmtBRL(dream.targetValue)}</p>
                                </div>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-track">
                                <div className={cn('h-full rounded-full transition-all duration-1000', ins.status === 'late' ? 'bg-danger' : 'bg-primary')} style={{ width: `${ins.pct}%` }} />
                              </div>
                            </div>

                            {!done && (
                              <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-border bg-surface-2/60 px-3 py-2">
                                  <p className="text-[11px] text-fg-muted">{ins.deadline ? 'Guardar por mês' : 'Falta'}</p>
                                  <p className="text-[13px] font-semibold tabular-nums text-fg">
                                    {ins.deadline ? fmtBRL(ins.neededPerMonth) : fmtBRL(ins.missing)}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-border bg-surface-2/60 px-3 py-2">
                                  <p className="text-[11px] text-fg-muted">{ins.deadline ? 'Prazo' : 'Previsão'}</p>
                                  <p className={cn('text-[13px] font-semibold tabular-nums', ins.status === 'late' ? 'text-danger' : 'text-fg')}>
                                    {ins.deadline
                                      ? (ins.monthsLeft! < 1 ? (ins.deadline < today ? 'Vencido' : 'Este mês') : `${Math.ceil(ins.monthsLeft!)} meses`)
                                      : ins.eta ? fmtMonthYear(ins.eta) : '—'}
                                  </p>
                                </div>
                              </div>
                            )}

                            <p className={cn('flex items-start gap-1.5 text-[11px] leading-snug',
                              done ? 'font-medium text-accent' : ins.status === 'late' ? 'text-danger' : 'text-fg-muted')}>
                              {done ? <><Trophy size={12} className="mt-px shrink-0" /> Sonho realizado! Hora de comemorar.</>
                                : ins.eta
                                  ? <><TrendingUp size={12} className="mt-px shrink-0" /> No ritmo atual ({fmtBRL(ins.pace)}/mês) você chega lá em {fmtMonthYear(ins.eta)}{ins.deadline && ins.eta > ins.deadline ? ', depois do prazo' : ''}.</>
                                  : <><Coins size={12} className="mt-px shrink-0" /> Comece a guardar para ver a previsão de conquista.</>}
                            </p>

                            {!done && (
                              <button onClick={() => openContribution(dream)} className="btn btn-primary mt-auto w-full">
                                <Coins size={14} /> Guardar valor
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                    <button onClick={openCreate}
                      className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-fg-muted transition-colors hover:border-primary-border hover:bg-primary-soft hover:text-accent">
                      <Plus size={22} strokeWidth={1.5} />
                      <span className="text-[13px] font-medium">Novo sonho</span>
                    </button>
                  </div>
                )}
              </div>

              {/* ═══════ Planejamento ═══════ */}
              <div className="min-w-0 space-y-4">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="mb-1 flex items-center gap-2">
                    <CalendarClock size={16} strokeWidth={1.75} className="text-accent" />
                    <p className="text-sm font-semibold text-fg">Plano mensal</p>
                  </div>
                  <p className="mb-4 text-xs text-fg-muted">Quanto guardar por mês para cumprir cada prazo.</p>
                  {enriched.filter((e) => e.ins.neededPerMonth > 0).length === 0 ? (
                    <p className="py-4 text-center text-[13px] text-fg-muted">Defina prazos nos sonhos para montar o plano.</p>
                  ) : (
                    <>
                      <ul className="space-y-3">
                        {enriched.filter((e) => e.ins.neededPerMonth > 0)
                          .sort((a, b) => b.ins.neededPerMonth - a.ins.neededPerMonth)
                          .map(({ dream, ins }) => (
                            <li key={dream.id}>
                              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                                <span className="truncate text-fg-2">{dream.title}</span>
                                <span className="shrink-0 font-semibold tabular-nums text-fg">{fmtBRL(ins.neededPerMonth)}</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-track">
                                <div className={cn('h-full rounded-full', ins.status === 'late' ? 'bg-danger' : 'bg-primary')}
                                  style={{ width: `${totals.monthly > 0 ? (ins.neededPerMonth / totals.monthly) * 100 : 0}%` }} />
                              </div>
                            </li>
                          ))}
                      </ul>
                      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
                        <span className="text-fg-muted">Total mensal</span>
                        <span className="font-semibold tabular-nums text-fg">{fmtBRL(totals.monthly)}</span>
                      </div>
                      {incomeShare !== null && (
                        <p className={cn('mt-2 rounded-lg border px-3 py-2 text-[11px]',
                          incomeShare > 30 ? 'border-warning/30 bg-warning-soft text-warning' : 'border-primary-border bg-primary-soft text-accent')}>
                          {incomeShare > 30
                            ? `Isso compromete ${incomeShare.toFixed(0)}% da sua renda média. Considere estender algum prazo.`
                            : `Cabe no orçamento: ${incomeShare.toFixed(0)}% da sua renda média mensal.`}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Calendar size={16} strokeWidth={1.75} className="text-accent" />
                    <p className="text-sm font-semibold text-fg">Linha do tempo</p>
                  </div>
                  {timeline.length === 0 ? (
                    <p className="py-4 text-center text-[13px] text-fg-muted">Sem prazos ou previsões ainda.</p>
                  ) : (
                    <ol className="relative space-y-3 before:absolute before:left-[5px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-border">
                      {timeline.map(({ dream, ins }) => {
                        const when = ins.deadline ?? ins.eta!;
                        return (
                          <li key={dream.id} className="relative flex items-start gap-3">
                            <span className={cn('relative z-10 mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-card',
                              ins.status === 'late' ? 'bg-danger' : 'bg-primary')} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-[13px] font-medium text-fg">{dream.title}</p>
                                <p className="shrink-0 text-[11px] text-fg-muted">{fmtMonthYear(when)}</p>
                              </div>
                              <p className="text-[11px] text-fg-muted">
                                {ins.deadline ? 'Prazo' : 'Previsão no ritmo atual'} · {Math.round(ins.pct)}% reservado
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>

                {totals.done > 0 && (
                  <div className="flex items-center gap-3 rounded-2xl border border-primary-border bg-primary-soft p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary"><Trophy size={18} /></span>
                    <div>
                      <p className="text-sm font-semibold text-fg">{totals.done} sonho{totals.done === 1 ? '' : 's'} realizado{totals.done === 1 ? '' : 's'}</p>
                      <p className="text-[11px] text-fg-2">Cada conquista conta. Continue projetando!</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      </div>

      {/* ── Guardar valor ──────────────────────────────────────────── */}
      {contribDream && (
        <Modal title={<>Guardar para <span className="text-accent">{contribDream.title}</span></>} onClose={() => setContribDream(null)}>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-4 py-3 text-xs">
              <span className="text-fg-muted">Reservado</span>
              <span className="font-semibold tabular-nums text-fg">{fmtBRL(contribDream.savedValue)} de {fmtBRL(contribDream.targetValue)}</span>
            </div>
            <div>
              <label className={fieldLabel}>Valor</label>
              <CurrencyInput autoFocus value={contribAmount} onChange={setContribAmount} placeholder="0,00"
                className="field !h-14 !text-2xl font-semibold tabular-nums"
                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && saveContribution()} />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(() => {
                  const ins = insightOf(contribDream);
                  const opts = [
                    ins.neededPerMonth > 0 ? { l: `Parcela do mês · ${fmtBRL(ins.neededPerMonth)}`, v: Math.ceil(ins.neededPerMonth) } : null,
                    { l: 'R$ 100', v: 100 }, { l: 'R$ 500', v: 500 },
                    ins.missing > 0 ? { l: 'Completar', v: Math.round(ins.missing * 100) / 100 } : null,
                  ].filter(Boolean) as { l: string; v: number }[];
                  return opts.map((o) => (
                    <button key={o.l} type="button" onClick={() => setContribAmount(o.v)}
                      className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-fg-2 hover:border-primary-border hover:bg-primary-soft hover:text-accent transition-colors">
                      {o.l}
                    </button>
                  ));
                })()}
              </div>
              {contribAmount > 0 && contribDream.targetValue > 0 && (
                <p className="mt-2 text-[11px] tabular-nums text-fg-muted">
                  Novo progresso: <span className="font-medium text-fg">{Math.min(100, ((contribDream.savedValue + contribAmount) / contribDream.targetValue) * 100).toFixed(0)}%</span>
                </p>
              )}
              <p className="mt-2 text-[11px] text-fg-muted">
                {contribDream.piggyBankId
                  ? `O valor será depositado no cofrinho "${contribDream.piggyBank?.name ?? 'vinculado'}".`
                  : 'O valor será somado ao reservado deste sonho.'}
              </p>
            </div>
            <button onClick={saveContribution} disabled={contribSaving || contribAmount <= 0} className="btn btn-primary w-full !h-11">
              {contribSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Confirmar
            </button>
          </div>
        </Modal>
      )}

      {/* ── Criar / editar ─────────────────────────────────────────── */}
      {isModalOpen && (
        <Modal title={form.id ? 'Editar sonho' : 'Novo sonho'} onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Preview */}
            <div className="relative h-28 overflow-hidden rounded-xl border border-border bg-surface-2">
              {form.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center"><ImageIcon size={28} className="text-fg-disabled" strokeWidth={1} /></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              {form.imageUrl && (
                <button type="button" onClick={() => f('imageUrl', '')} aria-label="Remover imagem"
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/40 text-white hover:bg-black/60">
                  <X size={13} />
                </button>
              )}
              <div className="absolute bottom-2 left-3 right-3">
                <p className="truncate text-sm font-semibold text-white">{form.title || 'Nome do sonho'}</p>
                {form.targetValue > 0 && (
                  <p className="text-[11px] text-white/70 tabular-nums">Meta {fmtBRL(form.targetValue)}{formPct > 0 ? ` · ${formPct.toFixed(0)}% reservado` : ''}</p>
                )}
              </div>
            </div>

            <div>
              <label className={fieldLabel}>Nome do sonho *</label>
              <input required value={form.title} onChange={(e) => f('title', e.target.value)}
                placeholder="Ex: Apartamento próprio, volta ao mundo..." className="field" />
            </div>

            <div>
              <label className={fieldLabel}>Imagem</label>
              <div className="mb-2 flex rounded-lg border border-border bg-surface-2 p-0.5">
                {(['url', 'upload'] as ImageMode[]).map((mode) => (
                  <button key={mode} type="button" onClick={() => setImageMode(mode)}
                    className={cn('flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md border text-xs font-medium transition-colors',
                      imageMode === mode ? 'bg-card text-fg border-border shadow-xs' : 'text-fg-muted hover:text-fg border-transparent')}>
                    {mode === 'url' ? <Link size={12} /> : <Upload size={12} />} {mode === 'url' ? 'Link' : 'Upload'}
                  </button>
                ))}
              </div>
              {imageMode === 'url' ? (
                <input type="url" value={form.imageUrl} onChange={(e) => f('imageUrl', e.target.value)}
                  placeholder="https://exemplo.com/imagem.jpg" className="field" />
              ) : (
                <button type="button" onClick={() => !uploading && fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-1 rounded-lg border border-dashed border-border p-3 text-fg-muted transition-colors hover:border-primary-border hover:text-accent">
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                  <span className="text-xs">{uploading ? 'Enviando...' : 'Selecionar imagem · PNG/JPG até 2MB'}</span>
                </button>
              )}
              <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileUpload} />
            </div>

            <div>
              <label className={fieldLabel}>Origem do valor reservado</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'MANUAL', label: 'Manual', icon: Settings2 },
                  { id: 'PIGGY', label: 'Cofrinho', icon: Wallet },
                  { id: 'WISHLIST', label: 'Desejo', icon: ListChecks },
                ] as const).map((t) => (
                  <button key={t.id} type="button" onClick={() => { setLinkType(t.id); f('linkedId', ''); }}
                    className={cn('flex flex-col items-center gap-1 rounded-lg border py-2.5 text-xs font-medium transition-colors',
                      linkType === t.id ? 'border-primary bg-primary-soft text-accent' : 'border-border text-fg-2 hover:bg-hover')}>
                    <t.icon size={15} /> {t.label}
                  </button>
                ))}
              </div>
              {linkType === 'PIGGY' && <p className="mt-1.5 text-[11px] text-fg-muted">O reservado acompanha o saldo do cofrinho automaticamente.</p>}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={fieldLabel}>Valor almejado *</label>
                <CurrencyInput value={form.targetValue} onChange={(v) => f('targetValue', v)} placeholder="0,00" className="field" />
              </div>
              {linkType === 'MANUAL' ? (
                <div>
                  <label className={fieldLabel}>Já reservado</label>
                  <CurrencyInput value={form.savedValue} onChange={(v) => f('savedValue', v)} placeholder="0,00" className="field" />
                </div>
              ) : (
                <div>
                  <label className={fieldLabel}>{linkType === 'PIGGY' ? 'Cofrinho vinculado' : 'Desejo vinculado'}</label>
                  <select value={form.linkedId} onChange={(e) => f('linkedId', e.target.value)} className="field">
                    <option value="">Selecione...</option>
                    {(linkType === 'PIGGY' ? piggyBanks : wishlists).map((item) => (
                      <option key={item.id} value={item.id}>{item.name ?? item.product ?? 'Sem nome'}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className={fieldLabel}>Data limite</label>
              <input type="date" value={form.deadline} onChange={(e) => f('deadline', e.target.value)} className="field" />
              {form.deadline && form.targetValue > 0 && (() => {
                const months = Math.max(1, Math.ceil(monthsBetween(today, parseDateOnly(form.deadline))));
                const missing = Math.max(0, form.targetValue - (linkType === 'MANUAL' ? form.savedValue : 0));
                return missing > 0 ? (
                  <p className="mt-1.5 text-[11px] text-fg-muted">
                    Para chegar lá: <span className="font-medium text-accent tabular-nums">{fmtBRL(missing / months)}/mês</span> durante {months} {months === 1 ? 'mês' : 'meses'}.
                  </p>
                ) : null;
              })()}
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary flex-1">Cancelar</button>
              <button type="submit" disabled={saving || !form.title.trim() || form.targetValue <= 0} className="btn btn-primary flex-1">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Target size={15} />}
                {form.id ? 'Salvar alterações' : 'Criar sonho'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      </PlanGate>
    </AppLayout>
  );
}
