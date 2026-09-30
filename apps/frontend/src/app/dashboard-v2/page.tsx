'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import { AppLayout } from '@/components/app-layout';
import {
  ChevronLeft, ChevronRight, CheckCheck, CheckCircle2, Circle,
  Loader2, ArrowUpCircle, ArrowDownCircle, Layers,
  Star, BarChart2, AlignLeft, Tag, Wallet, Plus, PiggyBank,
  Trophy, ShoppingBag, Target, CalendarDays,
} from 'lucide-react';
import { cn, parseDateOnly } from '@/lib/utils';
import { ErrorState } from '@/components/ui';
import TransactionForm, { TransactionMode } from '@/components/forms/TransactionForm';
import { Modal } from './components/Modal';
import { CategoryBar } from './components/CategoryBar';
import { DRERow } from './components/DRERow';
import { CategoryModal } from './components/CategoryModal';
import { PaymentMethodModal } from './components/PaymentMethodModal';

/* ── Inline helpers ──────────────────────────────────────────────── */
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (iso: string) => { const d = parseDateOnly(iso); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; };
const sameMonth = (iso: string, y: number, m: number) => { const d = parseDateOnly(iso); return d.getFullYear() === y && d.getMonth() === m; };

/* ── Family member color palette (stable per member across chart + DRE) ── */
const MEMBER_COLORS = ['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

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
        id: `bill-${b.id}`, day: b.dayOfMonth, title: b.title, color: '#f97316',
      })),
      ...calendarEvents.map((ev: any) => ({
        id: `ev-${ev.id}`, day: new Date(ev.startDate).getDate(), title: ev.title, color: ev.color || '#8b5cf6',
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
      <span className={cn('text-[9px] font-bold', diff === 0 ? 'text-zinc-400' : good ? 'text-emerald-500' : 'text-red-500')}>
        {diff === 0 ? '=' : isUp ? '▲' : '▼'} {pct.toFixed(0)}% vs {MONTHS_PT[prevMonthIdx].slice(0, 3)}
      </span>
    );
  };

  /* ── category expense breakdown ────────────── */
  const catBreakdown = useMemo(() => {
    const map: Record<string, { id: string; name: string; amount: number; color: string; byMember: Record<string, number> }> = {};
    monthTx.filter(t => t.type === 'EXPENSE').forEach(t => {
      const id    = t.category?.id   || 'sem-categoria';
      const name  = t.category?.name || 'Sem categoria';
      const color = categories.find(c => c.id === id)?.color || '#94a3b8';
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
      const color = catMatch?.color || '#94a3b8';
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
      const color = categories.find(c => c.id === id)?.color || '#10b981';
      if (!incMap[id]) incMap[id] = { name, amount: 0, color, byMember: {} };
      incMap[id].amount += Number(t.amount);
      if (t.userId) incMap[id].byMember[t.userId] = (incMap[id].byMember[t.userId] || 0) + Number(t.amount);
    });

    const invMap: Record<string, { name: string; amount: number; color: string; byMember: Record<string, number> }> = {};
    monthTx.filter(t => t.piggyBankId).forEach(t => {
      const id = t.piggyBankId as string;
      if (!invMap[id]) invMap[id] = { name: t.description || 'Cofrinho', amount: 0, color: '#8b5cf6', byMember: {} };
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
    <div data-tour="dashboard-greeting">
      <span className="block text-xl font-black">
        {greeting}, {dash?.user?.name || 'usuário'}! 👋
      </span>
      {familyGroupName && (
        <span className="block text-[11px] font-semibold text-zinc-400 mt-0.5">
          {familyGroupName} 👨‍👩‍👧‍👦
        </span>
      )}
    </div>
  );
  const pageSubtitle = 'Bem-vindo(a)';

  if (loading) return (
    <AppLayout title={pageTitle} subtitle={pageSubtitle}>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-emerald-500" size={36} />
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

  return (
    <AppLayout title={pageTitle} subtitle={pageSubtitle} noPadding>
      <div className="h-full flex flex-col overflow-hidden">

        {/* Frozen zone: quick actions, month selector, KPIs (does not scroll) */}
        <div className="shrink-0 px-6 lg:px-8 pt-4 pb-3 space-y-3">

        {/* ── Quick actions + Month selector ────────────────── */}
        <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center justify-between">
          <div data-tour="dashboard-quick-actions" className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
            {([
              { icon: ArrowUpCircle,   label: 'Nova receita',   color: 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border-emerald-200 dark:border-emerald-900/40', action: () => setTxModal('INCOME')  },
              { icon: ArrowDownCircle, label: 'Nova despesa',   color: 'bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white border-red-200 dark:border-red-900/40',                     action: () => setTxModal('EXPENSE') },
              { icon: Tag,             label: 'Nova categoria', color: 'bg-purple-500/10 text-purple-600 hover:bg-purple-500 hover:text-white border-purple-200 dark:border-purple-900/40',      action: () => setCatOpen(true) },
              { icon: Wallet,          label: 'Forma de pag.',  color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white border-blue-200 dark:border-blue-900/40',                 action: () => setPmOpen(true) },
            ] as const).map(({ icon: Icon, label, color, action }) => (
              <button key={label} onClick={action}
                className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all font-black text-[10px] uppercase tracking-tight', color)}>
                <Icon size={15} className="shrink-0" />{label}
              </button>
            ))}
          </div>
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl p-1 shrink-0">
            <button onClick={prevMonth} className="p-1.5 hover:bg-emerald-500 hover:text-white rounded-lg transition text-zinc-600 dark:text-zinc-300">
              <ChevronLeft size={14} />
            </button>
            <span className="px-3 text-[11px] font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-200 min-w-[110px] text-center">
              {MONTHS_PT[selMonth]} {selYear}
            </span>
            <button onClick={nextMonth} className="p-1.5 hover:bg-emerald-500 hover:text-white rounded-lg transition text-zinc-600 dark:text-zinc-300">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* ── Summary + Dreams ──────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div data-tour="dashboard-balance-card" className="col-span-2 rounded-xl bg-white dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4">
            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Saldo do mês</p>
            <p className={cn('text-xl font-black italic tracking-tighter mt-0.5', balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
              {balance >= 0 ? '+' : ''} R$ {fmtBRL(balance)}
            </p>
            <div className="flex gap-4 mt-2">
              <div><p className="text-[8px] text-zinc-500 uppercase">Receitas</p><p className="text-xs font-black text-emerald-600 dark:text-emerald-400">+ R$ {fmtBRL(income)}</p></div>
              <div><p className="text-[8px] text-zinc-500 uppercase">Despesas</p><p className="text-xs font-black text-red-600 dark:text-red-400">- R$ {fmtBRL(expense)}</p></div>
            </div>
          </div>

          {dreams.length > 0 ? (
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-blue-600 to-purple-700 text-white p-3 flex items-center gap-2">
              <div className="p-1.5 bg-white/15 rounded-lg shrink-0"><Star size={15} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[7px] font-black uppercase tracking-widest opacity-70">Sonho {dreamIdx + 1}/{dreams.length}</p>
                <p className="text-xs font-black italic tracking-tight truncate mt-0.5">
                  {activeDream?.title || activeDream?.name || '—'}
                </p>
                {activeDream?.targetValue && (
                  <div className="h-1 bg-white/20 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-white rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, (Number(activeDream.savedValue || 0) / Number(activeDream.targetValue)) * 100)}%` }} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-purple-200 dark:border-purple-900 flex flex-col items-center justify-center gap-1 p-3 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-950/20 transition"
              onClick={() => router.push('/dreams')}>
              <Star size={15} className="text-purple-400" />
              <p className="text-[8px] font-black text-purple-500 uppercase tracking-widest text-center">Definir sonho</p>
            </div>
          )}

          {piggyBanks.length > 0 ? (
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-3 flex items-center gap-2 cursor-pointer"
              onClick={() => router.push('/piggy-banks')}>
              <div className="p-1.5 bg-white/15 rounded-lg shrink-0"><PiggyBank size={15} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[7px] font-black uppercase tracking-widest opacity-70">Cofrinhos</p>
                <p className="text-xs font-black italic tracking-tight truncate mt-0.5">
                  R$ {fmtBRL(totalPiggySaved)}
                </p>
                {totalPiggyGoal > 0 && (
                  <div className="h-1 bg-white/20 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-white rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, (totalPiggySaved / totalPiggyGoal) * 100)}%` }} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-emerald-200 dark:border-emerald-900 flex flex-col items-center justify-center gap-1 p-3 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition"
              onClick={() => router.push('/piggy-banks')}>
              <PiggyBank size={15} className="text-emerald-400" />
              <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest text-center">Criar cofrinho</p>
            </div>
          )}
        </div>
        </div>

        {/* Scrollable zone: everything below the frozen KPIs/buttons */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-6 space-y-4">

        {/* ── Category chart + Todos ─────────────────────────
              [Chart/DRE (2-col)]   [Todos (1-col)]            */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Category chart */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                  Despesas por categoria — {MONTHS_PT[selMonth]}
                </p>
                {overBudgetCount > 0 && (
                  <p className="text-[10px] font-black text-red-600 mt-0.5">
                    ⚠ {overBudgetCount} categoria{overBudgetCount > 1 ? 's' : ''} acima do planejado
                  </p>
                )}
              </div>
              <div className="flex rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                <button onClick={() => setChartView('chart')}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase transition',
                    chartView === 'chart' ? 'bg-emerald-500 text-white' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800')}>
                  <BarChart2 size={12} /> Gráfico
                </button>
                <button data-tour="dashboard-dre-toggle" onClick={() => setChartView('dre')}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase transition',
                    chartView === 'dre' ? 'bg-emerald-500 text-white' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800')}>
                  <AlignLeft size={12} /> DRE
                </button>
              </div>
            </div>

            {chartView === 'chart' && (
              <>
                <div className="flex items-center justify-between flex-wrap gap-2 text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-3">
                  <div className="flex items-center flex-wrap gap-3">
                    {allMembers.map((m) => (
                      <span key={m.id} className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} /> {m.name}
                      </span>
                    ))}
                    {hasChartPlanning && <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-zinc-400 opacity-70" />Meta</span>}
                  </div>
                  <span className="text-zinc-500">Total: R$ {fmtBRL(chartTotal)}</span>
                </div>
                {chartBreakdownWithPlanning.length === 0 ? (
                  <p className="text-center py-8 text-[11px] text-zinc-400 font-black uppercase tracking-widest">Nenhuma despesa neste mês</p>
                ) : (
                  <div className="space-y-3">
                    {chartBreakdownWithPlanning.slice(0, 8).map((cat, i) => {
                      const segments = allMembers
                        .map((m) => ({ id: m.id, name: m.name, amount: cat.byMember?.[m.id] || 0, color: m.color }))
                        .filter((s) => s.amount > 0);
                      const finalSegments = segments.length > 0 ? segments : [{ id: 'total', name: cat.name, amount: cat.amount, color: cat.color }];
                      return (
                        <CategoryBar key={cat.id} rank={i + 1} name={cat.name} amount={cat.amount}
                          total={chartTotal} planned={cat.planned} overBudget={cat.overBudget} segments={finalSegments} />
                      );
                    })}
                    {chartBreakdownWithPlanning.length > 8 && (
                      <p className="text-center text-[9px] font-black text-zinc-400 mt-2">+{chartBreakdownWithPlanning.length - 8} categorias</p>
                    )}
                  </div>
                )}
                {!hasChartPlanning && chartBreakdownWithPlanning.length > 0 && (
                  <p className="text-center text-[9px] text-zinc-400 mt-4 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                    <button onClick={() => router.push('/planning')} className="text-emerald-600 font-black hover:underline">Planejar este mês</button>
                    {' '}para ver metas por categoria
                  </p>
                )}
              </>
            )}

            {chartView === 'dre' && (
              <div className="space-y-0.5">
                <DRERow label="RECEITA BRUTA" value={dreData.totalIncome} bold positive
                  sub={renderTrend(dreData.totalIncome, prevIncome)} />
                {dreData.incomeCategories.map((c: any) => (
                  <div key={c.name}>
                    <DRERow indent label={c.name} value={c.amount} color={c.color} positive />
                    {Object.entries(c.byMember || {}).map(([uid, amt]: [string, any]) => (
                      <DRERow key={uid} indent2 label={allMembers.find((m) => m.id === uid)?.name || 'Você'} value={amt} muted />
                    ))}
                  </div>
                ))}
                {dreData.incomeCategories.length === 0 && <DRERow indent label="Sem receitas lançadas" muted />}
                <DRERow separator label="" />

                <DRERow label="(-) DESPESAS OPERACIONAIS" value={dreData.totalExpense} bold negative
                  sub={
                    <div className="flex items-center gap-3 flex-wrap">
                      {renderTrend(dreData.totalExpense, prevExpense, true)}
                      {totalPlanned > 0 && (
                        <span className={cn('text-[9px] font-bold', dreData.totalExpense > totalPlanned ? 'text-red-500' : 'text-zinc-400')}>
                          {dreData.totalExpense > totalPlanned ? '⚠ acima do orçamento' : `${((dreData.totalExpense / totalPlanned) * 100).toFixed(0)}% do orçamento`}
                        </span>
                      )}
                    </div>
                  } />
                {dreData.expenseCategories.map(c => (
                  <div key={c.id}>
                    <DRERow indent label={c.name} value={c.amount} color={c.color} negative />
                    {Object.entries((c as any).byMember || {}).map(([uid, amt]: [string, any]) => (
                      <DRERow key={uid} indent2 label={allMembers.find((m) => m.id === uid)?.name || 'Você'} value={amt} muted />
                    ))}
                    {c.planned != null && (
                      <div className={cn('pl-8 text-[9px] font-bold pb-0.5', c.overBudget ? 'text-red-500' : 'text-zinc-400')}>
                        {c.overBudget ? `⚠ Acima do orçado (R$ ${fmtBRL(c.planned)})` : `Orçado: R$ ${fmtBRL(c.planned)}`}
                      </div>
                    )}
                  </div>
                ))}
                {dreData.expenseCategories.length === 0 && <DRERow indent label="Sem despesas lançadas" muted />}
                <DRERow separator label="" />

                <DRERow label="= RECEITA LÍQUIDA" value={Math.abs(dreData.receitaLiquida)} bold
                  positive={dreData.receitaLiquida >= 0} negative={dreData.receitaLiquida < 0}
                  sub={renderTrend(dreData.receitaLiquida, prevReceitaLiquida)} />

                {dreData.investCategories.length > 0 && (<>
                  <DRERow separator label="" />
                  <DRERow label="(-) INVESTIMENTOS / POUPANÇA" value={dreData.totalInvest} bold negative />
                  {dreData.investCategories.map((c: any) => (
                    <div key={c.name}>
                      <DRERow indent label={c.name} value={c.amount} color={c.color} negative />
                      {Object.entries(c.byMember || {}).map(([uid, amt]: [string, any]) => (
                        <DRERow key={uid} indent2 label={allMembers.find((m) => m.id === uid)?.name || 'Você'} value={amt} muted />
                      ))}
                    </div>
                  ))}
                  <DRERow separator label="" />
                </>)}

                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-2 mt-2 space-y-1.5">
                  <DRERow label="= RESULTADO FINAL" value={Math.abs(dreData.resultado)} bold
                    positive={dreData.resultado >= 0} negative={dreData.resultado < 0}
                    sub={renderTrend(dreData.resultado, prevResultado)} />
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Margem líquida</span>
                    <span className={cn('text-[12px] font-black', dreData.margem >= 0 ? 'text-emerald-600' : 'text-red-600')}>{dreData.margem.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ponto de equilíbrio</span>
                    <span className="text-[12px] font-black text-zinc-700 dark:text-zinc-300">R$ {fmtBRL(dreData.pontoEquilibrio)}</span>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status</span>
                    <span className={cn('text-[11px] font-black px-2 py-0.5 rounded-full',
                      dreData.resultado >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400')}>
                      {dreData.resultado >= 0 ? 'Superávit' : 'Déficit'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Todos */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCheck size={16} className="text-emerald-500" />
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Tarefas</p>
              </div>
              <button onClick={() => router.push('/todos')} className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest">Ver todas</button>
            </div>

            {/* Quick add */}
            <div className="flex items-center gap-2 mb-3">
              <input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && quickAddTodo()}
                placeholder="Nova tarefa..."
                className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500 transition"
              />
              <button
                onClick={quickAddTodo}
                disabled={addingTask || !newTaskTitle.trim()}
                className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition shrink-0"
              >
                {addingTask ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              </button>
            </div>

            {todos.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-8 text-zinc-400">
                <CheckCircle2 size={32} className="mb-2 text-emerald-300" />
                <p className="text-xs font-black uppercase tracking-widest">Tudo em dia!</p>
              </div>
            ) : (
              <div className="space-y-2 flex-1">
                {todos.slice(0, 7).map((todo: any) => (
                  <div key={todo.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                    <button
                      onClick={() => completeTodo(todo.id)}
                      disabled={completingTodo === todo.id}
                      className="shrink-0 text-zinc-400 hover:text-emerald-500 disabled:opacity-50 transition"
                    >
                      {completingTodo === todo.id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Circle size={13} />}
                    </button>
                    <span className="flex-1 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 truncate">{todo.title}</span>
                    {todo.familyGroupId && (
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 uppercase shrink-0">Fam.</span>
                    )}
                  </div>
                ))}
                {todos.length > 7 && <p className="text-center text-[9px] font-black text-zinc-400 pt-1">+{todos.length - 7} tarefas</p>}
              </div>
            )}
          </div>
        </div>

        {/* ── Onboarding ───────────────────────────────────── */}
        {showOnboard && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Bem-vindo!</p>
                <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{onboardDone} de {onboardSteps.length} passos concluídos</p>
              </div>
              <div className="flex gap-1">
                {onboardSteps.map((s, i) => <div key={i} className={cn('h-2 w-6 rounded-full', s.done ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700')} />)}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {onboardSteps.map((step) => (
                <button key={step.label} onClick={() => router.push(step.href)}
                  className={cn('flex items-center gap-2 p-3 rounded-xl border text-left transition-all',
                    step.done ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 opacity-60'
                              : 'border-zinc-300 dark:border-zinc-600 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/10')}>
                  {step.done ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> : <Circle size={14} className="text-zinc-400 shrink-0" />}
                  <span className="text-[10px] font-black text-zinc-700 dark:text-zinc-300 leading-tight">{step.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Gastos por categoria-família · Desafio do mês · Planejamento (maior) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Agenda da família */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarDays size={14} className="text-blue-500" />
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Agenda da família</p>
              </div>
              <button onClick={() => router.push('/calendar')} className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest">Ver agenda</button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                <span key={i} className="text-[8px] font-black text-zinc-400 uppercase text-center">{d}</span>
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
                      'relative aspect-square flex items-center justify-center rounded-lg text-[10px] font-bold',
                      isToday(cell.day)
                        ? 'bg-emerald-500 text-white'
                        : hasAny
                          ? 'bg-blue-50 dark:bg-blue-950/30 text-zinc-800 dark:text-zinc-200'
                          : 'text-zinc-500 dark:text-zinc-400',
                    )}
                  >
                    {cell.day}
                    {hasAny && (
                      <span className="absolute bottom-0.5 flex items-center gap-0.5">
                        {cell.hasIncome && <span className="w-1 h-1 rounded-full bg-emerald-500" />}
                        {cell.hasExpense && <span className="w-1 h-1 rounded-full bg-red-500" />}
                        {cell.hasInvest && <span className="w-1 h-1 rounded-full bg-blue-500" />}
                        {hasBills && <span className="w-1 h-1 rounded-full bg-orange-500" />}
                        {cell.events.length > 0 && <span className="w-1 h-1 rounded-full bg-purple-500" />}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {[
                { color: 'bg-emerald-500', label: 'Receita' },
                { color: 'bg-red-500', label: 'Despesa' },
                { color: 'bg-blue-500', label: 'Investimento' },
                { color: 'bg-orange-500', label: 'Conta fixa' },
                { color: 'bg-purple-500', label: 'Evento' },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1">
                  <span className={cn('w-1.5 h-1.5 rounded-full', l.color)} />
                  <span className="text-[8px] font-bold text-zinc-400 uppercase">{l.label}</span>
                </div>
              ))}
            </div>

          </div>

          {/* Desafio do mês */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy size={14} className="text-emerald-500" />
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Desafio do mês</p>
              </div>
              <button onClick={() => router.push('/challenges')} className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest">Ver todos</button>
            </div>
            {monthChallenge ? (
              <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className={cn('shrink-0 mt-0.5 h-2.5 w-2.5 rounded-full',
                  monthChallenge.status === 'Concluída' ? 'bg-emerald-500' :
                  monthChallenge.status === 'Em andamento' ? 'bg-amber-500' : 'bg-slate-400')} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-line">
                    {monthChallenge.challenge}
                  </p>
                  <span className={cn('inline-block mt-2 text-[9px] font-semibold px-2 py-0.5 rounded-full',
                    monthChallenge.status === 'Concluída' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                    monthChallenge.status === 'Em andamento' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                    'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300')}>
                    {monthChallenge.status}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-zinc-400">
                <Trophy size={28} className="text-zinc-200 dark:text-zinc-700" />
                <p className="text-xs font-black uppercase tracking-widest text-center">Nenhum desafio para este mês</p>
                <button onClick={() => router.push('/challenges')} className="text-[10px] font-black text-emerald-600 hover:underline">Criar desafio →</button>
              </div>
            )}
          </div>

          {/* Planejamento do mês (maior) */}
          <div data-tour="dashboard-planning-card" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target size={14} className="text-blue-500" />
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Planejamento do mês</p>
              </div>
              <button onClick={() => router.push('/planning')} className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest">Ajustar</button>
            </div>
            {totalPlanned === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-8 text-zinc-400">
                <Target size={28} className="mb-2 text-zinc-200 dark:text-zinc-700" />
                <p className="text-xs font-black uppercase tracking-widest text-center">Sem planejamento definido</p>
                <button onClick={() => router.push('/planning')} className="mt-2 text-[10px] font-black text-emerald-600 hover:underline">Planejar este mês →</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-[10px] font-black mb-1.5">
                  <span className="text-zinc-500">R$ {fmtBRL(totalCat)} gasto</span>
                  <span className={cn(totalCat > totalPlanned ? 'text-red-500' : 'text-zinc-700 dark:text-zinc-300')}>
                    de R$ {fmtBRL(totalPlanned)}
                  </span>
                </div>
                <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-700', totalCat > totalPlanned ? 'bg-red-500' : 'bg-blue-500')}
                    style={{ width: `${Math.min(100, (totalCat / totalPlanned) * 100)}%` }}
                  />
                </div>

                <div className="space-y-2 mt-3 flex-1">
                  {catBreakdownWithPlanning.filter(c => c.planned != null).slice(0, 4).map((cat) => (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between text-[9px] font-bold mb-0.5">
                        <span className="text-zinc-600 dark:text-zinc-300 truncate">{cat.name}</span>
                        <span className={cn(cat.overBudget ? 'text-red-500' : 'text-zinc-400')}>
                          R$ {fmtBRL(cat.amount)} / {fmtBRL(cat.planned!)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(100, (cat.amount / cat.planned!) * 100)}%`, backgroundColor: cat.overBudget ? '#ef4444' : (cat.color || '#3b82f6') }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Últimas transações + Lista de desejos  +  Raio-X parcelamentos ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Últimas transações (menor) + Lista de desejos, lado a lado */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Últimas transações (5) */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Últimas transações</p>
                <button onClick={() => router.push('/transactions')} className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest">Ver todas</button>
              </div>
              <div className="space-y-1.5">
                {last5.length === 0 ? (
                  <p className="text-center py-8 text-xs text-zinc-400 font-black uppercase tracking-widest">Nenhuma transação</p>
                ) : (
                  last5.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">
                      <div className={cn('p-1.5 rounded-lg shrink-0', t.type === 'INCOME' ? 'bg-emerald-500/10' : 'bg-red-500/10')}>
                        {t.type === 'INCOME' ? <ArrowUpCircle size={12} className="text-emerald-600" /> : <ArrowDownCircle size={12} className="text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-zinc-800 dark:text-zinc-200 truncate">{t.description}</p>
                        <p className="text-[9px] text-zinc-400">{fmtDate(t.date)}</p>
                      </div>
                      <span className={cn('text-[10px] font-black shrink-0', t.type === 'INCOME' ? 'text-emerald-600' : 'text-zinc-700 dark:text-zinc-300')}>
                        {t.type === 'INCOME' ? '+' : '-'} R$ {fmtBRL(Number(t.amount))}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Lista de desejos pendentes */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={14} className="text-pink-500" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Lista de desejos</p>
                </div>
                <button onClick={() => router.push('/wishlists')} className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest">Ver todas</button>
              </div>
              {pendingWishlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
                  <ShoppingBag size={28} className="mb-2 text-zinc-200 dark:text-zinc-700" />
                  <p className="text-xs font-black uppercase tracking-widest">Nenhum desejo pendente</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {pendingWishlist.map((w: any) => (
                    <div key={w.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">
                      <div className="p-1.5 rounded-lg bg-pink-500/10 shrink-0">
                        <ShoppingBag size={12} className="text-pink-500" />
                      </div>
                      <span className="flex-1 text-[10px] font-black text-zinc-800 dark:text-zinc-200 truncate">{w.product}</span>
                      <span className="text-[8px] font-black text-zinc-400 uppercase shrink-0">{w.priority?.split(' - ')[1]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Raio-X dos parcelamentos */}
          <div data-tour="dashboard-installments-card" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-orange-500" />
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Raio-X parcelamentos</p>
              </div>
              <button onClick={() => router.push('/installments')} className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest">Ver</button>
            </div>
            {installGroups.length === 0 ? (
              <p className="text-center py-6 text-xs text-zinc-400 font-black uppercase tracking-widest">Sem parcelamentos ativos</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
                  <p className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Grupos</p>
                  <p className="text-lg font-black text-zinc-900 dark:text-zinc-100 mt-0.5">{installGroups.length}</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
                  <p className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Devedor</p>
                  <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 mt-0.5">R$ {fmtBRL(installTotal)}</p>
                </div>
                <div className={cn('rounded-xl p-3 border', income > 0 && (installTotal / income) > 0.3 ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700')}>
                  <p className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">% da renda</p>
                  <p className={cn('text-lg font-black mt-0.5', income > 0 && (installTotal / income) > 0.3 ? 'text-red-600' : 'text-zinc-900 dark:text-zinc-100')}>
                    {income > 0 ? `${((installTotal / income) * 100).toFixed(0)}%` : '—'}
                  </p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-3 border border-emerald-200 dark:border-emerald-900">
                  <p className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Status</p>
                  <p className={cn('text-xs font-black mt-0.5', income > 0 && (installTotal / income) < 0.3 ? 'text-emerald-600' : 'text-amber-600')}>
                    {income > 0 && (installTotal / income) < 0.3 ? 'Saudável' : 'Atenção'}
                  </p>
                </div>
              </div>
            )}
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
              <span className={txModal === 'EXPENSE' ? 'text-red-500' : txModal === 'INCOME' ? 'text-emerald-500' : 'text-blue-500'}>
                {txModal === 'EXPENSE' ? 'Despesa' : txModal === 'INCOME' ? 'Receita' : 'Investimento'}
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
