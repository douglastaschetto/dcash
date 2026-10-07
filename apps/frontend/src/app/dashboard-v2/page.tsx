'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import { AppLayout } from '@/components/app-layout';
import {
  ChevronLeft, ChevronRight, CheckCheck, CheckCircle2, Circle,
  Loader2, ArrowUpCircle, ArrowDownCircle, Layers,
  Star, BarChart2, AlignLeft, Tag, Wallet, Plus, PiggyBank,
  Trophy, ShoppingBag, Target, CalendarDays, AlertTriangle,
} from '@/components/ui/icons';
import { cn, parseDateOnly } from '@/lib/utils';
import { Badge, ErrorState } from '@/components/ui';
import TransactionForm, { TransactionMode } from '@/components/forms/TransactionForm';
import { Modal } from './components/Modal';
import { CategoryBar } from './components/CategoryBar';
import { DRERow } from './components/DRERow';
import { DRETable } from './components/DRETable';
import { CategoryModal } from './components/CategoryModal';
import { PaymentMethodModal } from './components/PaymentMethodModal';
import { CashFlowChart } from './components/CashFlowChart';

/* ── Inline helpers ──────────────────────────────────────────────── */
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (iso: string) => { const d = parseDateOnly(iso); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; };
const sameMonth = (iso: string, y: number, m: number) => { const d = parseDateOnly(iso); return d.getFullYear() === y && d.getMonth() === m; };

/* ── Family member color palette (stable per member across chart + DRE) ── */
const MEMBER_COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)'];

const CARD = 'rounded-2xl border border-border bg-card p-5';

function Kpi({ label, value, icon: Icon, tone, trend, tour }: {
  label: string; value: string; icon: React.ElementType; tone?: 'up' | 'down'; trend: React.ReactNode; tour?: string;
}) {
  return (
    <div data-tour={tour} className={CARD}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-fg-2">{label}</p>
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg border border-border',
          tone === 'up' ? 'text-accent' : tone === 'down' ? 'text-danger' : 'text-fg-muted')}>
          <Icon size={15} strokeWidth={1.75} />
        </span>
      </div>
      <p className={cn('mt-3 text-[26px] leading-none font-semibold tracking-tight tabular-nums',
        tone === 'down' ? 'text-danger' : 'text-fg')}>
        {value}
      </p>
      <div className="mt-3 flex items-center gap-2 min-h-5">{trend ?? <span className="text-[11px] text-fg-muted">Sem histórico no mês anterior</span>}</div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function DashboardV2Page() {
  const router = useRouter();
  const now = new Date();
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth());
  const [chartView, setChartView] = useState<'chart' | 'dre'>('chart');
  const [greeting, setGreeting] = useState('Bem-vindo(a)');

  /* ── raw data ─────────────────────────────── */
  const [dash,            setDash]            = useState<any>(null);
  const [transactions,    setTransactions]    = useState<any[]>([]);
  const [installments,    setInstallments]    = useState<any[]>([]);
  const [todos,           setTodos]           = useState<any[]>([]);
  const [dreams,          setDreams]          = useState<any[]>([]);
  const [categories,      setCategories]      = useState<any[]>([]);
  const [categoryLimits,  setCategoryLimits]  = useState<any[]>([]);
  const [wishlists,       setWishlists]       = useState<any[]>([]);
  const [piggyBanks,      setPiggyBanks]      = useState<any[]>([]);
  const [challenges,      setChallenges]      = useState<any[]>([]);
  const [familyMembers,   setFamilyMembers]   = useState<any[]>([]);
  const [familyGroupName, setFamilyGroupName] = useState<string | null>(null);
  const [calendarEvents,  setCalendarEvents]  = useState<any[]>([]);
  const [fixedBills,      setFixedBills]      = useState<any[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [loadError,       setLoadError]       = useState(false);

  /* ── dreams carousel ─────────────────────── */
  const [dreamIdx, setDreamIdx] = useState(0);
  const dreamTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (dreams.length <= 1) return;
    dreamTimer.current = setInterval(() => setDreamIdx(i => (i + 1) % dreams.length), 10000);
    return () => { if (dreamTimer.current) clearInterval(dreamTimer.current); };
  }, [dreams.length]);

  /* ── Transaction modal ────────────────────── */
  const [txModal, setTxModal] = useState<TransactionMode | null>(null);

  /* ── Quick task add ────────────────────────── */
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask,   setAddingTask]   = useState(false);

  const quickAddTodo = async () => {
    if (!newTaskTitle.trim()) return;
    setAddingTask(true);
    try {
      const { data } = await api.post('/todos', { title: newTaskTitle.trim() });
      setTodos((prev) => [data, ...prev]);
      setNewTaskTitle('');
    } catch {} finally { setAddingTask(false); }
  };

  const [completingTodo, setCompletingTodo] = useState<string | null>(null);
  const completeTodo = async (id: string) => {
    setCompletingTodo(id);
    try {
      await api.patch(`/todos/${id}/complete`);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch {} finally { setCompletingTodo(null); }
  };

  /* ── Category / Payment method modals ─────── */
  /* Form state now lives inside CategoryModal / PaymentMethodModal — they're
     only mounted while open, so a fresh mount gives them fresh state (no
     manual reset needed on open, unlike the old inline version). */
  const [catOpen, setCatOpen] = useState(false);
  const [pmOpen,  setPmOpen]  = useState(false);

  /* ── load ─────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [dRes, tRes, iRes, toRes, drRes, cRes, wRes, pbRes, fmRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/transactions'),
        api.get('/transactions/installments'),
        api.get('/todos/pending'),
        api.get('/dreams'),
        api.get('/categories'),
        api.get('/wishlists'),
        api.get('/piggy-banks'),
        api.get('/family/members'),
      ]);
      setDash(dRes.data);
      setTransactions(tRes.data || []);
      setInstallments(iRes.data || []);
      setTodos(toRes.data || []);
      setDreams(drRes.data || []);
      setCategories(cRes.data || []);
      setWishlists(wRes.data || []);
      setPiggyBanks(pbRes.data || []);
      setFamilyMembers(fmRes.data?.members || []);
      setFamilyGroupName(fmRes.data?.group?.name || null);
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── time-of-day greeting (client-only to avoid SSR/hydration clock skew) ── */
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite');
  }, []);

  /* ── load category limits for selected month ─ */
  useEffect(() => {
    api.get(`/category-limits?month=${selMonth + 1}&year=${selYear}`)
      .then(r => setCategoryLimits(r.data || []))
      .catch(() => setCategoryLimits([]));
  }, [selMonth, selYear]);

  /* ── load challenges for selected year ────── */
  useEffect(() => {
    api.get(`/challenges?year=${selYear}`)
      .then(r => setChallenges(r.data || []))
      .catch(() => setChallenges([]));
  }, [selYear]);

  /* ── load calendar events + fixed bills for selected month ── */
  useEffect(() => {
    api.get(`/calendar-events/monthly?month=${selMonth + 1}&year=${selYear}`)
      .then(r => setCalendarEvents(r.data?.events || []))
      .catch(() => setCalendarEvents([]));
    api.get('/fixed-bills', { params: { month: selMonth + 1, year: selYear } })
      .then(r => setFixedBills(r.data || []))
      .catch(() => setFixedBills([]));
  }, [selMonth, selYear]);

  /* ── month navigation ─────────────────────── */
  const prevMonth = () => {
    if (selMonth === 0) { setSelYear(y => y - 1); setSelMonth(11); }
    else setSelMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selMonth === 11) { setSelYear(y => y + 1); setSelMonth(0); }
    else setSelMonth(m => m + 1);
  };

  /* ── filtered transactions for selected month ── */
  const monthTx = useMemo(
    () => transactions.filter(t => sameMonth(t.date, selYear, selMonth)),
    [transactions, selYear, selMonth],
  );

  const income  = useMemo(() => monthTx.filter(t => t.type === 'INCOME').reduce((s,t) => s + Number(t.amount), 0), [monthTx]);
  const expense = useMemo(() => monthTx.filter(t => t.type === 'EXPENSE').reduce((s,t) => s + Number(t.amount), 0), [monthTx]);
  const balance = income - expense;

  /* ── last 5 transactions (sorted desc) ─────── */
  const last5 = useMemo(() =>
    [...transactions].sort((a,b) => parseDateOnly(b.date).getTime() - parseDateOnly(a.date).getTime()).slice(0, 5),
  [transactions]);

  /* ── current month challenge ───────────────── */
  const monthChallenge = useMemo(
    () => challenges.find((c: any) => c.month === MONTHS_PT[selMonth]),
    [challenges, selMonth],
  );

  /* ── pending wishlist items ─────────────────── */
  const pendingWishlist = useMemo(
    () => wishlists.filter((w: any) => !w.bought).slice(0, 5),
    [wishlists],
  );

  /* ── planning (category limits) summary ────── */
  const totalPlanned = useMemo(
    () => categoryLimits.reduce((s: number, l: any) => s + Number(l.amount || 0), 0),
    [categoryLimits],
  );

  /* ── piggy banks summary ───────────────────── */
  const totalPiggySaved = useMemo(() => piggyBanks.reduce((s: number, b: any) => s + Number(b.balance || 0), 0), [piggyBanks]);
  const totalPiggyGoal  = useMemo(() => piggyBanks.reduce((s: number, b: any) => s + Number(b.yearlyGoal || b.monthlyGoal || 0), 0), [piggyBanks]);

  /* ── mini calendar grid for selected month (mirrors /calendar) ── */
  const calendarGrid = useMemo(() => {
    const firstWeekday = new Date(selYear, selMonth, 1).getDay(); // 0 = domingo
    const daysInMonth  = new Date(selYear, selMonth + 1, 0).getDate();

    type DayInfo = { day: number; events: any[]; bills: any[]; hasIncome: boolean; hasExpense: boolean; hasInvest: boolean };
    const byDay: Record<number, DayInfo> = {};
    const ensure = (day: number) => (byDay[day] ||= { day, events: [], bills: [], hasIncome: false, hasExpense: false, hasInvest: false });

    calendarEvents.forEach((ev: any) => {
      const d = new Date(ev.startDate);
      if (d.getFullYear() === selYear && d.getMonth() === selMonth) ensure(d.getDate()).events.push(ev);
    });
    fixedBills.forEach((b: any) => {
      if (b.dayOfMonth) ensure(b.dayOfMonth).bills.push(b);
    });
    monthTx.forEach((t: any) => {
      const d = ensure(parseDateOnly(t.date).getDate());
      if (t.piggyBankId) d.hasInvest = true;
      else if (t.type === 'INCOME') d.hasIncome = true;
      else if (t.type === 'EXPENSE') d.hasExpense = true;
    });

    const cells: (DayInfo | null)[] = [
      ...Array(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => byDay[i + 1] || ensure(i + 1)),
    ];

    const upcoming = [
      ...fixedBills.filter((b: any) => b.dayOfMonth).map((b: any) => ({
        id: `bill-${b.id}`, day: b.dayOfMonth, title: b.title, color: 'var(--series-3)',
      })),
      ...calendarEvents.map((ev: any) => ({
        id: `ev-${ev.id}`, day: new Date(ev.startDate).getDate(), title: ev.title, color: ev.color || 'var(--series-4)',
      })),
    ].sort((a, b) => a.day - b.day);

    return { cells, upcoming };
  }, [selYear, selMonth, calendarEvents, fixedBills, monthTx]);

  const isToday = (day: number) =>
    now.getFullYear() === selYear && now.getMonth() === selMonth && now.getDate() === day;

  /* ── family members (stable, colored) ──────── */
  const allMembers = useMemo(() => {
    const nameOf = (userId: string) =>
      familyMembers.find((m: any) => m.id === userId)?.name?.split(' ')[0]
      || dash?.user?.name?.split(' ')[0]
      || 'Você';
    const ids = Array.from(new Set(monthTx.filter((t: any) => t.userId).map((t: any) => t.userId)));
    return ids.map((id: any, idx: number) => ({ id, name: nameOf(id), color: MEMBER_COLORS[idx % MEMBER_COLORS.length] }));
  }, [monthTx, familyMembers, dash]);

  /* ── DRE columns: every family member, even without entries this month ── */
  const dreMembers = useMemo(() => {
    const extra = familyMembers
      .filter((m: any) => m.id && !allMembers.some((a) => a.id === m.id))
      .map((m: any, i: number) => ({ id: m.id, name: m.name?.split(' ')[0] || 'Membro', color: MEMBER_COLORS[(allMembers.length + i) % MEMBER_COLORS.length] }));
    return [...allMembers, ...extra];
  }, [allMembers, familyMembers]);

  /* ── previous month (for MoM comparison) ───── */
  const { prevMonthIdx, prevYearForMonth } = useMemo(() => (
    selMonth === 0 ? { prevMonthIdx: 11, prevYearForMonth: selYear - 1 } : { prevMonthIdx: selMonth - 1, prevYearForMonth: selYear }
  ), [selMonth, selYear]);
  const prevMonthTx = useMemo(
    () => transactions.filter(t => sameMonth(t.date, prevYearForMonth, prevMonthIdx)),
    [transactions, prevYearForMonth, prevMonthIdx],
  );
  const prevIncome  = useMemo(() => prevMonthTx.filter((t: any) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0), [prevMonthTx]);
  const prevExpense = useMemo(() => prevMonthTx.filter((t: any) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0), [prevMonthTx]);
  const prevInvest  = useMemo(() => prevMonthTx.filter((t: any) => t.piggyBankId).reduce((s, t) => s + Number(t.amount), 0), [prevMonthTx]);
  const prevReceitaLiquida = prevIncome - prevExpense;
  const prevResultado      = prevReceitaLiquida - prevInvest;

  const renderTrend = (curr: number, prev: number, invert = false) => {
    if (prev === 0 && curr === 0) return null;
    const diff = curr - prev;
    const pct  = prev !== 0 ? (Math.abs(diff) / Math.abs(prev)) * 100 : 100;
    const isUp = diff > 0;
    const good = diff === 0 ? true : (invert ? !isUp : isUp);
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className={cn('inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
          diff === 0 ? 'border-border text-fg-muted' : good ? 'border-primary-border bg-primary-soft text-accent' : 'border-danger/30 bg-danger-soft text-danger')}>
          {diff === 0 ? '=' : isUp ? '↑' : '↓'} {pct.toFixed(0)}%
        </span>
        <span className="text-[11px] text-fg-muted">vs {MONTHS_PT[prevMonthIdx].toLowerCase()}</span>
      </span>
    );
  };

  /* ── category expense breakdown ────────────── */
  const catBreakdown = useMemo(() => {
    const map: Record<string, { id: string; name: string; amount: number; color: string; byMember: Record<string, number> }> = {};
    monthTx.filter(t => t.type === 'EXPENSE').forEach(t => {
      const id    = t.category?.id   || 'sem-categoria';
      const name  = t.category?.name || 'Sem categoria';
      const color = categories.find(c => c.id === id)?.color || 'var(--text-muted)';
      if (!map[id]) map[id] = { id, name, amount: 0, color, byMember: {} };
      map[id].amount += Number(t.amount);
      if (t.userId) map[id].byMember[t.userId] = (map[id].byMember[t.userId] || 0) + Number(t.amount);
    });
    return Object.values(map).sort((a,b) => b.amount - a.amount);
  }, [monthTx, categories]);

  const totalCat = catBreakdown.reduce((s,c) => s + c.amount, 0);

  /* ── enrich with planning data ──────────────── */
  const catBreakdownWithPlanning = useMemo(() => {
    return catBreakdown.map(cat => {
      const limit      = categoryLimits.find(l => l.categoryId === cat.id || l.category?.id === cat.id);
      const planned    = limit ? Number(limit.amount) : null;
      const overBudget = planned !== null ? cat.amount > planned : false;
      return { ...cat, planned, overBudget };
    });
  }, [catBreakdown, categoryLimits]);

  /* ── "Despesas por categoria" chart: real expenses only, excludes
       investment/piggy-bank contributions (those are type EXPENSE too,
       but represent money moved into savings, not spent) ── */
  const chartBreakdown = useMemo(() => {
    const map: Record<string, { id: string; name: string; amount: number; color: string; byMember: Record<string, number> }> = {};
    monthTx.filter(t => t.type === 'EXPENSE' && !t.piggyBankId).forEach(t => {
      const id       = t.category?.id || 'sem-categoria';
      const catMatch = categories.find(c => c.id === id);
      // Skip transactions mistakenly tagged with an income/reserve category —
      // the tx-level `type` alone isn't enough to keep those out of "Despesas".
      if (catMatch && catMatch.type !== 'expense') return;
      const name  = t.category?.name || 'Sem categoria';
      const color = catMatch?.color || 'var(--text-muted)';
      if (!map[id]) map[id] = { id, name, amount: 0, color, byMember: {} };
      map[id].amount += Number(t.amount);
      if (t.userId) map[id].byMember[t.userId] = (map[id].byMember[t.userId] || 0) + Number(t.amount);
    });
    return Object.values(map).sort((a,b) => b.amount - a.amount);
  }, [monthTx, categories]);

  const chartTotal = chartBreakdown.reduce((s,c) => s + c.amount, 0);

  const chartBreakdownWithPlanning = useMemo(() => {
    return chartBreakdown.map(cat => {
      const limit      = categoryLimits.find(l => l.categoryId === cat.id || l.category?.id === cat.id);
      const planned    = limit ? Number(limit.amount) : null;
      const overBudget = planned !== null ? cat.amount > planned : false;
      return { ...cat, planned, overBudget };
    });
  }, [chartBreakdown, categoryLimits]);

  const hasChartPlanning = chartBreakdownWithPlanning.some(c => c.planned !== null);

  /* ── DRE data ───────────────────────────────── */
  const dreData = useMemo(() => {
    const incMap: Record<string, { name: string; amount: number; color: string; byMember: Record<string, number> }> = {};
    monthTx.filter(t => t.type === 'INCOME').forEach(t => {
      const id    = t.category?.id   || 'sem-receita';
      const name  = t.category?.name || 'Sem categoria';
      const color = categories.find(c => c.id === id)?.color || 'var(--primary)';
      if (!incMap[id]) incMap[id] = { name, amount: 0, color, byMember: {} };
      incMap[id].amount += Number(t.amount);
      if (t.userId) incMap[id].byMember[t.userId] = (incMap[id].byMember[t.userId] || 0) + Number(t.amount);
    });

    const invMap: Record<string, { name: string; amount: number; color: string; byMember: Record<string, number> }> = {};
    monthTx.filter(t => t.piggyBankId).forEach(t => {
      const id = t.piggyBankId as string;
      if (!invMap[id]) invMap[id] = { name: t.description || 'Cofrinho', amount: 0, color: 'var(--series-4)', byMember: {} };
      invMap[id].amount += Number(t.amount);
      if (t.userId) invMap[id].byMember[t.userId] = (invMap[id].byMember[t.userId] || 0) + Number(t.amount);
    });

    const incomeCategories  = Object.values(incMap).sort((a,b) => b.amount - a.amount);
    const expenseCategories = catBreakdownWithPlanning;
    const investCategories  = Object.values(invMap).sort((a,b) => b.amount - a.amount);

    const totalInvest    = investCategories.reduce((s,c) => s + c.amount, 0);
    const receitaLiquida = income - expense;
    const resultado      = receitaLiquida - totalInvest;
    const margem         = income > 0 ? (resultado / income) * 100 : 0;

    return {
      incomeCategories, expenseCategories, investCategories,
      totalIncome: income, totalExpense: expense, totalInvest,
      receitaLiquida, resultado, margem,
      pontoEquilibrio: expense + totalInvest,
    };
  }, [monthTx, catBreakdownWithPlanning, income, expense, categories]);

  /* ── installments summary ───────────────────── */
  const installGroups = useMemo(() => {
    const groups: Record<string, any> = {};
    installments.forEach((t: any) => {
      const g = t.installmentGroup || t.description;
      if (!groups[g]) groups[g] = { remaining: 0, total: 0 };
      if (!t.isPaid) { groups[g].remaining++; groups[g].total += Number(t.amount); }
    });
    return Object.values(groups).filter((g: any) => g.remaining > 0);
  }, [installments]);

  const installTotal = installGroups.reduce((s: number, g: any) => s + g.total, 0);

  /* ── onboarding steps ───────────────────────── */
  const onboardSteps = useMemo(() => [
    { done: (dash?.accounts?.length || 0) > 0,                        label: 'Adicionar forma de pagamento', href: '/accounts' },
    { done: catBreakdown.length > 0,                                   label: 'Lançar primeira transação',    href: '/transactions' },
    { done: categories.filter(c => c.type === 'expense').length >= 2, label: 'Criar categorias de despesa',  href: '/categories' },
    { done: dreams.length > 0,                                         label: 'Definir um sonho/meta',        href: '/dreams' },
    { done: todos.length === 0,                                        label: 'Zerar tarefas pendentes',      href: '/todos' },
  ], [dash, catBreakdown, categories, dreams, todos]);

  const onboardDone     = onboardSteps.filter(s => s.done).length;
  const onboardComplete = onboardDone === onboardSteps.length;

  /* ── onboarding is a one-time checklist: once fully done, never show it again ── */
  const [onboardDismissed, setOnboardDismissed] = useState(false);
  useEffect(() => {
    if (localStorage.getItem('dcash:onboarding-done') === 'true') setOnboardDismissed(true);
  }, []);
  useEffect(() => {
    if (onboardComplete && !onboardDismissed) {
      localStorage.setItem('dcash:onboarding-done', 'true');
      setOnboardDismissed(true);
    }
  }, [onboardComplete, onboardDismissed]);

  const showOnboard = !onboardDismissed && !onboardComplete;
  const activeDream     = dreams[dreamIdx];
  const overBudgetCount = catBreakdownWithPlanning.filter(c => c.overBudget).length;
  const hasPlanning     = catBreakdownWithPlanning.some(c => c.planned !== null);

  /* ── render ─────────────────────────────────── */
  const pageTitle = (
    <span data-tour="dashboard-greeting">Dashboard financeiro</span>
  );
  const pageSubtitle = `${familyGroupName ? `Família ${familyGroupName} · ` : ''}${MONTHS_PT[selMonth]} ${selYear} · ${greeting}, ${dash?.user?.name?.split(' ')[0] || 'usuário'}`;

  if (loading) return (
    <AppLayout title={pageTitle} subtitle={pageSubtitle}>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    </AppLayout>
  );

  if (loadError) return (
    <AppLayout title={pageTitle} subtitle={pageSubtitle}>
      <ErrorState
        title="Não foi possível carregar o painel."
        description="Verifique sua conexão e tente novamente. Se o problema persistir, tente recarregar a página."
        onRetry={() => load()}
      />
    </AppLayout>
  );

  const card = 'rounded-2xl border border-border bg-card p-5';
  const cardTitle = 'text-sm font-semibold text-fg';
  const linkBtn = 'text-xs font-medium text-accent hover:underline underline-offset-2';
  const btnSecondary = 'inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-fg-2 hover:bg-hover hover:text-fg hover:border-border-hover transition-colors';
  const piggyPct = totalPiggyGoal > 0 ? Math.min(100, (totalPiggySaved / totalPiggyGoal) * 100) : 0;
  const dreamPct = activeDream?.targetValue ? Math.min(100, (Number(activeDream.savedValue || 0) / Number(activeDream.targetValue)) * 100) : null;
  const installPct = income > 0 ? installTotal / income : null;
  const plannedCats = catBreakdownWithPlanning.filter(c => c.planned != null);

  return (
    <AppLayout title={pageTitle} subtitle={pageSubtitle} noPadding>
      <div className="h-full overflow-y-auto">
      <div className="w-full p-4 md:p-6 space-y-4">

        {/* ── Toolbar: quick actions + month selector ─────────── */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div data-tour="dashboard-quick-actions" className="flex flex-wrap items-center gap-2">
            <button onClick={() => setTxModal('INCOME')}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-[13px] font-medium text-on-primary hover:bg-primary-hover transition-colors">
              <Plus size={15} /> Nova receita
            </button>
            <button onClick={() => setTxModal('EXPENSE')} className={btnSecondary}>
              <ArrowDownCircle size={15} strokeWidth={1.75} className="text-danger" /> Nova despesa
            </button>
            <button onClick={() => setCatOpen(true)} className={btnSecondary}>
              <Tag size={15} strokeWidth={1.75} /> Nova categoria
            </button>
            <button onClick={() => setPmOpen(true)} className={btnSecondary}>
              <Wallet size={15} strokeWidth={1.75} /> Forma de pag.
            </button>
          </div>
          <div className="flex items-center self-start rounded-lg border border-border bg-card p-0.5 sm:self-auto">
            <button onClick={prevMonth} aria-label="Mês anterior" className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-fg transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[128px] px-2 text-center text-[13px] font-medium text-fg">
              {MONTHS_PT[selMonth]} {selYear}
            </span>
            <button onClick={nextMonth} aria-label="Próximo mês" className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-fg transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">

        {/* ═══════════════ Main column ═══════════════ */}
        <div className="space-y-4 min-w-0">

          {/* ── Onboarding ───────────────────────────── */}
          {showOnboard && (
            <div className={card}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <p className={cardTitle}>Primeiros passos</p>
                  <p className="text-xs text-fg-muted mt-0.5">{onboardDone} de {onboardSteps.length} concluídos</p>
                </div>
                <div className="flex gap-1">
                  {onboardSteps.map((s, i) => <div key={i} className={cn('h-1.5 w-8 rounded-full', s.done ? 'bg-primary' : 'bg-track')} />)}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                {onboardSteps.map((step) => (
                  <button key={step.label} onClick={() => router.push(step.href)}
                    className={cn('flex items-center gap-2 rounded-lg border p-3 text-left transition-colors',
                      step.done ? 'border-primary-border bg-primary-soft'
                                : 'border-border hover:border-border-hover hover:bg-hover')}>
                    {step.done ? <CheckCircle2 size={15} className="text-accent shrink-0" /> : <Circle size={15} className="text-fg-muted shrink-0" />}
                    <span className={cn('text-xs font-medium leading-tight', step.done ? 'text-fg-muted line-through' : 'text-fg-2')}>{step.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── KPIs ─────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Kpi tour="dashboard-balance-card" label="Saldo do mês" icon={Wallet}
              value={`${balance < 0 ? '−' : ''}R$ ${fmtBRL(Math.abs(balance))}`}
              tone={balance < 0 ? 'down' : undefined}
              trend={renderTrend(balance, prevReceitaLiquida)} />
            <Kpi label="Receitas" icon={ArrowUpCircle} tone="up"
              value={`R$ ${fmtBRL(income)}`} trend={renderTrend(income, prevIncome)} />
            <Kpi label="Despesas" icon={ArrowDownCircle}
              value={`R$ ${fmtBRL(expense)}`} trend={renderTrend(expense, prevExpense, true)} />
          </div>

          {/* ── Cash flow ─────────────────────────────── */}
          <CashFlowChart transactions={monthTx} year={selYear} month={selMonth} />

          {/* ── Category chart / DRE ──────────────────── */}
          <div className={card}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
              <div>
                <p className={cardTitle}>Despesas por categoria</p>
                {overBudgetCount > 0 ? (
                  <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-danger">
                    <AlertTriangle size={12} /> {overBudgetCount} categoria{overBudgetCount > 1 ? 's' : ''} acima do planejado
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-fg-muted">{MONTHS_PT[selMonth]} de {selYear}</p>
                )}
              </div>
              <div className="flex rounded-lg border border-border bg-surface-2 p-0.5" role="tablist">
                <button role="tab" aria-selected={chartView === 'chart'} onClick={() => setChartView('chart')}
                  className={cn('flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors border',
                    chartView === 'chart' ? 'bg-card text-fg border-border shadow-xs' : 'text-fg-muted hover:text-fg border-transparent')}>
                  <BarChart2 size={13} /> Gráfico
                </button>
                <button role="tab" aria-selected={chartView === 'dre'} data-tour="dashboard-dre-toggle" onClick={() => setChartView('dre')}
                  className={cn('flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors border',
                    chartView === 'dre' ? 'bg-card text-fg border-border shadow-xs' : 'text-fg-muted hover:text-fg border-transparent')}>
                  <AlignLeft size={13} /> DRE
                </button>
              </div>
            </div>

            {chartView === 'chart' && (
              <>
                {(allMembers.length > 1 || hasChartPlanning) && (
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-fg-2 mb-4">
                    <div className="flex items-center flex-wrap gap-3">
                      {allMembers.length > 1 && allMembers.map((m) => (
                        <span key={m.id} className="flex items-center gap-1.5">
                          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: m.color }} /> {m.name}
                        </span>
                      ))}
                      {hasChartPlanning && <span className="flex items-center gap-1.5"><span className="inline-block w-0.5 h-3 rounded-full bg-fg-muted" />Meta</span>}
                    </div>
                  </div>
                )}
                {chartBreakdownWithPlanning.length === 0 ? (
                  <p className="text-center py-10 text-[13px] text-fg-muted">Nenhuma despesa neste mês</p>
                ) : (
                  <div className="space-y-3.5">
                    {chartBreakdownWithPlanning.slice(0, 8).map((cat, i) => {
                      const segments = allMembers.length > 1
                        ? allMembers
                            .map((m) => ({ id: m.id, name: m.name, amount: cat.byMember?.[m.id] || 0, color: m.color }))
                            .filter((s) => s.amount > 0)
                        : [];
                      const finalSegments = segments.length > 0 ? segments : [{ id: 'total', name: cat.name, amount: cat.amount, color: 'var(--primary)' }];
                      return (
                        <CategoryBar key={cat.id} rank={i + 1} name={cat.name} amount={cat.amount}
                          total={chartTotal} planned={cat.planned} overBudget={cat.overBudget} segments={finalSegments} />
                      );
                    })}
                    {chartBreakdownWithPlanning.length > 8 && (
                      <p className="text-center text-xs text-fg-muted pt-1">+{chartBreakdownWithPlanning.length - 8} categorias</p>
                    )}
                  </div>
                )}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
                  <span className="text-fg-muted">Total <span className="font-semibold tabular-nums text-fg">R$ {fmtBRL(chartTotal)}</span></span>
                  {!hasChartPlanning && chartBreakdownWithPlanning.length > 0 && (
                    <span className="text-fg-muted">
                      <button onClick={() => router.push('/planning')} className={linkBtn}>Planejar este mês</button>
                      {' '}para ver metas por categoria
                    </span>
                  )}
                </div>
              </>
            )}

            {chartView === 'dre' && (
              <DRETable
                dre={dreData}
                members={dreMembers}
                trends={{
                  income: renderTrend(dreData.totalIncome, prevIncome),
                  expense: renderTrend(dreData.totalExpense, prevExpense, true),
                  liquid: renderTrend(dreData.receitaLiquida, prevReceitaLiquida),
                  result: renderTrend(dreData.resultado, prevResultado),
                }}
                expenseNote={totalPlanned > 0 ? (
                  <span className={cn('mt-0.5 block text-[11px] font-medium', dreData.totalExpense > totalPlanned ? 'text-danger' : 'text-fg-muted')}>
                    {dreData.totalExpense > totalPlanned ? 'Acima do orçamento' : `${((dreData.totalExpense / totalPlanned) * 100).toFixed(0)}% do orçamento`}
                  </span>
                ) : undefined}
              />
            )}
          </div>

          {/* ── Últimas transações (tabela) ───────────── */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <p className={cardTitle}>Últimas transações</p>
              <button onClick={() => router.push('/transactions')} className={linkBtn}>Ver todas</button>
            </div>
            {last5.length === 0 ? (
              <p className="text-center pb-10 pt-4 text-[13px] text-fg-muted">Nenhuma transação</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-[13px]">
                  <thead>
                    <tr className="border-y border-border bg-surface-2 text-left text-xs text-fg-muted">
                      <th className="px-5 py-2.5 font-medium">Descrição</th>
                      <th className="px-3 py-2.5 font-medium">Categoria</th>
                      <th className="px-3 py-2.5 font-medium">Data</th>
                      <th className="px-3 py-2.5 font-medium">Tipo</th>
                      <th className="px-5 py-2.5 font-medium text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {last5.map((t: any) => (
                      <tr key={t.id} className="hover:bg-hover transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border',
                              t.type === 'INCOME' ? 'text-accent' : 'text-fg-muted')}>
                              {t.type === 'INCOME' ? <ArrowUpCircle size={14} strokeWidth={1.75} /> : <ArrowDownCircle size={14} strokeWidth={1.75} />}
                            </span>
                            <span className="truncate font-medium text-fg max-w-[220px]">{t.description}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-fg-2 truncate max-w-[160px]">{t.category?.name || '—'}</td>
                        <td className="px-3 py-3 text-fg-2 tabular-nums">{fmtDate(t.date)}</td>
                        <td className="px-3 py-3">
                          <Badge tone={t.type === 'INCOME' ? 'success' : 'neutral'}>{t.type === 'INCOME' ? 'Receita' : 'Despesa'}</Badge>
                        </td>
                        <td className={cn('px-5 py-3 text-right font-semibold tabular-nums whitespace-nowrap', t.type === 'INCOME' ? 'text-accent' : 'text-fg')}>
                          {t.type === 'INCOME' ? '+' : '−'} R$ {fmtBRL(Number(t.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Agenda + Desafio ─────────────────────── */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className={card}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} strokeWidth={1.75} className="text-fg-muted" />
                  <p className={cardTitle}>Agenda da família</p>
                </div>
                <button onClick={() => router.push('/calendar')} className={linkBtn}>Ver agenda</button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                  <span key={i} className="text-[11px] font-medium text-fg-muted text-center">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarGrid.cells.map((cell, i) => {
                  if (cell === null) return <div key={i} />;
                  const hasBills = cell.bills.length > 0;
                  const hasAny = cell.hasIncome || cell.hasExpense || cell.hasInvest || hasBills || cell.events.length > 0;
                  const tooltip = [
                    ...cell.bills.map((b: any) => `Conta: ${b.title}`),
                    ...cell.events.map((e: any) => e.title),
                  ].join(', ') || undefined;
                  return (
                    <div key={i}
                      title={tooltip}
                      className={cn(
                        'relative aspect-square flex items-center justify-center rounded-md text-xs tabular-nums',
                        isToday(cell.day)
                          ? 'bg-primary text-on-primary font-semibold'
                          : hasAny
                            ? 'bg-surface-2 text-fg font-medium'
                            : 'text-fg-muted',
                      )}
                    >
                      {cell.day}
                      {hasAny && (
                        <span className="absolute bottom-1 flex items-center gap-0.5">
                          {cell.hasIncome && <span className="w-1 h-1 rounded-full bg-primary" />}
                          {cell.hasExpense && <span className="w-1 h-1 rounded-full bg-danger" />}
                          {cell.hasInvest && <span className="w-1 h-1 rounded-full" style={{ background: 'var(--series-2)' }} />}
                          {hasBills && <span className="w-1 h-1 rounded-full" style={{ background: 'var(--series-3)' }} />}
                          {cell.events.length > 0 && <span className="w-1 h-1 rounded-full" style={{ background: 'var(--series-4)' }} />}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-x-3 gap-y-1 mt-3 flex-wrap">
                {[
                  { color: 'var(--primary)', label: 'Receita' },
                  { color: 'var(--danger)', label: 'Despesa' },
                  { color: 'var(--series-2)', label: 'Investimento' },
                  { color: 'var(--series-3)', label: 'Conta fixa' },
                  { color: 'var(--series-4)', label: 'Evento' },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: l.color }} />
                    <span className="text-[11px] text-fg-muted">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={card}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy size={16} strokeWidth={1.75} className="text-fg-muted" />
                  <p className={cardTitle}>Desafio do mês</p>
                </div>
                <button onClick={() => router.push('/challenges')} className={linkBtn}>Ver todos</button>
              </div>
              {monthChallenge ? (
                <div className="rounded-xl border border-border bg-surface-2 p-4">
                  <p className="text-[13px] text-fg leading-relaxed whitespace-pre-line">
                    {monthChallenge.challenge}
                  </p>
                  <div className="mt-3">
                    <Badge tone={monthChallenge.status === 'Concluída' ? 'success' : monthChallenge.status === 'Em andamento' ? 'warning' : 'neutral'}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {monthChallenge.status}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                  <Trophy size={22} strokeWidth={1.5} className="text-fg-disabled" />
                  <p className="text-[13px] text-fg-muted">Nenhum desafio para este mês</p>
                  <button onClick={() => router.push('/challenges')} className={linkBtn}>Criar desafio</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════ Right rail ═══════════════ */}
        <div className="space-y-4 min-w-0">

          {/* ── Hero: cofrinhos + sonho ───────────────── */}
          <div className="hero-card relative overflow-hidden rounded-2xl p-5">
            <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-2 -top-8 h-28 w-28 rounded-full border border-white/10" />
            <button onClick={() => router.push('/piggy-banks')} className="block w-full text-left">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] font-medium text-white/70">
                  <PiggyBank size={16} strokeWidth={1.75} /> Cofrinhos
                </span>
                <span className="text-[11px] text-white/50">{piggyBanks.length} ativo{piggyBanks.length === 1 ? '' : 's'}</span>
              </div>
              {piggyBanks.length > 0 ? (
                <>
                  <p className="mt-5 text-[26px] leading-none font-semibold tracking-tight tabular-nums">R$ {fmtBRL(totalPiggySaved)}</p>
                  {totalPiggyGoal > 0 && (
                    <>
                      <div className="mt-4 h-1.5 rounded-full bg-white/15 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-300 transition-all duration-700" style={{ width: `${piggyPct}%` }} />
                      </div>
                      <p className="mt-2 text-[11px] text-white/60 tabular-nums">{piggyPct.toFixed(0)}% da meta de R$ {fmtBRL(totalPiggyGoal)}</p>
                    </>
                  )}
                </>
              ) : (
                <p className="mt-5 text-[13px] text-white/80">Crie seu primeiro cofrinho e acompanhe sua reserva aqui.</p>
              )}
            </button>

            <div className="mt-5 border-t border-white/10 pt-4">
              {dreams.length > 0 ? (
                <button onClick={() => router.push('/dreams')} className="flex w-full items-center gap-3 text-left">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10"><Star size={15} strokeWidth={1.75} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-white/50">Sonho {dreamIdx + 1} de {dreams.length}</p>
                    <p className="truncate text-[13px] font-medium">{activeDream?.title || activeDream?.name || '—'}</p>
                    {dreamPct !== null && (
                      <div className="mt-1.5 h-1 rounded-full bg-white/15 overflow-hidden">
                        <div className="h-full rounded-full bg-white/80 transition-all duration-700" style={{ width: `${dreamPct}%` }} />
                      </div>
                    )}
                  </div>
                </button>
              ) : (
                <button onClick={() => router.push('/dreams')} className="flex items-center gap-2 text-[13px] font-medium text-white/80 hover:text-white">
                  <Star size={15} strokeWidth={1.75} /> Definir um sonho
                </button>
              )}
            </div>
          </div>

          {/* ── Planejamento do mês ───────────────────── */}
          <div data-tour="dashboard-planning-card" className={card}>
            <div className="flex items-center justify-between mb-3">
              <p className={cardTitle}>Planejamento do mês</p>
              <button onClick={() => router.push('/planning')} className={linkBtn}>Ajustar</button>
            </div>
            {totalPlanned === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                <Target size={22} strokeWidth={1.5} className="text-fg-disabled" />
                <p className="text-[13px] text-fg-muted">Sem planejamento definido</p>
                <button onClick={() => router.push('/planning')} className={linkBtn}>Planejar este mês</button>
              </div>
            ) : (
              <>
                <p className="text-[22px] leading-tight font-semibold tracking-tight tabular-nums text-fg">
                  R$ {fmtBRL(totalCat)} <span className="text-[13px] font-normal text-fg-muted">usados de R$ {fmtBRL(totalPlanned)}</span>
                </p>
                <div className="mt-3 h-2 rounded-full bg-track overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-700', totalCat > totalPlanned ? 'bg-danger' : 'bg-primary')}
                    style={{ width: `${Math.min(100, (totalCat / totalPlanned) * 100)}%` }}
                  />
                </div>

                {plannedCats.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {plannedCats.slice(0, 4).map((cat) => (
                      <div key={cat.id}>
                        <div className="flex items-center justify-between gap-2 text-xs mb-1">
                          <span className="text-fg-2 truncate">{cat.name}</span>
                          <span className={cn('tabular-nums shrink-0', cat.overBudget ? 'text-danger font-medium' : 'text-fg-muted')}>
                            {fmtBRL(cat.amount)} / {fmtBRL(cat.planned!)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-track overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all duration-700', cat.overBudget ? 'bg-danger' : 'bg-primary/70')}
                            style={{ width: `${Math.min(100, (cat.amount / cat.planned!) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Tarefas ──────────────────────────────── */}
          <div className={cn(card, 'flex flex-col')}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCheck size={16} strokeWidth={1.75} className="text-fg-muted" />
                <p className={cardTitle}>Tarefas</p>
                {todos.length > 0 && <Badge>{todos.length}</Badge>}
              </div>
              <button onClick={() => router.push('/todos')} className={linkBtn}>Ver todas</button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && quickAddTodo()}
                placeholder="Nova tarefa..."
                className="field h-9 !text-[13px]"
              />
              <button
                onClick={quickAddTodo}
                disabled={addingTask || !newTaskTitle.trim()}
                aria-label="Adicionar tarefa"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary hover:bg-primary-hover disabled:opacity-40 transition-colors"
              >
                {addingTask ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              </button>
            </div>

            {todos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <CheckCircle2 size={22} strokeWidth={1.5} className="text-accent" />
                <p className="text-[13px] text-fg-muted">Tudo em dia!</p>
              </div>
            ) : (
              <div className="divide-y divide-border -mx-1">
                {todos.slice(0, 6).map((todo: any) => (
                  <div key={todo.id} className="flex items-center gap-3 px-1 py-2.5">
                    <button
                      onClick={() => completeTodo(todo.id)}
                      disabled={completingTodo === todo.id}
                      aria-label="Concluir tarefa"
                      className="shrink-0 text-fg-muted hover:text-accent disabled:opacity-50 transition-colors"
                    >
                      {completingTodo === todo.id
                        ? <Loader2 size={16} className="animate-spin" />
                        : <Circle size={16} strokeWidth={1.75} />}
                    </button>
                    <span className="flex-1 text-[13px] text-fg truncate">{todo.title}</span>
                    {todo.familyGroupId && <Badge tone="info">Família</Badge>}
                  </div>
                ))}
                {todos.length > 6 && <p className="text-center text-xs text-fg-muted pt-2.5">+{todos.length - 6} tarefas</p>}
              </div>
            )}
          </div>

          {/* ── Raio-X dos parcelamentos ──────────────── */}
          <div data-tour="dashboard-installments-card" className={card}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers size={16} strokeWidth={1.75} className="text-fg-muted" />
                <p className={cardTitle}>Raio-X parcelamentos</p>
              </div>
              <button onClick={() => router.push('/installments')} className={linkBtn}>Ver</button>
            </div>
            {installGroups.length === 0 ? (
              <p className="text-center py-6 text-[13px] text-fg-muted">Sem parcelamentos ativos</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Grupos', value: String(installGroups.length) },
                    { label: 'Saldo devedor', value: `R$ ${fmtBRL(installTotal)}` },
                    { label: '% da renda', value: installPct !== null ? `${(installPct * 100).toFixed(0)}%` : '—', danger: installPct !== null && installPct > 0.3 },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
                      <p className="text-[11px] text-fg-muted">{s.label}</p>
                      <p className={cn('mt-0.5 text-[15px] font-semibold tabular-nums truncate', s.danger ? 'text-danger' : 'text-fg')}>{s.value}</p>
                    </div>
                  ))}
                  <div className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
                    <p className="text-[11px] text-fg-muted">Status</p>
                    <div className="mt-1">
                      <Badge tone={installPct !== null && installPct < 0.3 ? 'success' : 'warning'}>
                        {installPct !== null && installPct < 0.3 ? 'Saudável' : 'Atenção'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Lista de desejos ──────────────────────── */}
          <div className={card}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} strokeWidth={1.75} className="text-fg-muted" />
                <p className={cardTitle}>Lista de desejos</p>
              </div>
              <button onClick={() => router.push('/wishlists')} className={linkBtn}>Ver todas</button>
            </div>
            {pendingWishlist.length === 0 ? (
              <p className="text-center py-6 text-[13px] text-fg-muted">Nenhum desejo pendente</p>
            ) : (
              <div className="divide-y divide-border -mx-1">
                {pendingWishlist.map((w: any) => (
                  <div key={w.id} className="flex items-center gap-3 px-1 py-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-fg-muted">
                      <ShoppingBag size={13} strokeWidth={1.75} />
                    </span>
                    <span className="flex-1 text-[13px] text-fg truncate">{w.product}</span>
                    {w.priority?.split(' - ')[1] && <Badge>{w.priority.split(' - ')[1]}</Badge>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
      </div>

      {/* ════════════════════════════════════════
          MODALS
          ════════════════════════════════════════ */}

      {/* ── Transaction modal (Receita / Despesa) ── */}
      {txModal && (
        <Modal
          onClose={() => setTxModal(null)}
          title={
            <>
              Nova{' '}
              <span className={txModal === 'EXPENSE' ? 'text-danger' : txModal === 'INCOME' ? 'text-accent' : 'text-info'}>
                {txModal === 'EXPENSE' ? 'despesa' : txModal === 'INCOME' ? 'receita' : 'investimento'}
              </span>
            </>
          }
        >
          <TransactionForm
            mode={txModal}
            onSuccess={() => { setTxModal(null); load(); }}
          />
        </Modal>
      )}

      {/* ── Category modal ───────────────────────── */}
      {catOpen && (
        <CategoryModal
          onClose={() => setCatOpen(false)}
          onSaved={() => { setCatOpen(false); load(); }}
        />
      )}

      {/* ── Payment method modal ─────────────────── */}
      {pmOpen && (
        <PaymentMethodModal
          onClose={() => setPmOpen(false)}
          onSaved={() => { setPmOpen(false); load(); }}
        />
      )}

    </AppLayout>
  );
}
