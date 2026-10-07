import { parseDateOnly } from '@/lib/utils';
import type { Allowance, Challenge, Movement } from './local-store';

export type Bank = {
  id: string;
  name: string;
  balance: number;
  monthlyGoal?: number;
  yearlyGoal?: number;
  targetDate?: string;
  imageUrl?: string;
  color?: string;
  progress: number;
  createdAt?: string;
};

export type Event = { bankId: string; amount: number; date: Date };

export type TxLike = { piggyBankId?: string | null; isPaid?: boolean; amount: number | string; date: string };

export const goalOf = (b: Bank) => Number(b.yearlyGoal || b.monthlyGoal || 0);

/** Contribution history: paid investment transactions + direct moves logged on this page. */
export function buildEvents(transactions: TxLike[], movements: Movement[]): Event[] {
  const fromTx = transactions
    .filter((t) => t.piggyBankId && t.isPaid !== false)
    .map((t) => ({ bankId: t.piggyBankId as string, amount: Number(t.amount), date: parseDateOnly(t.date) }));
  const fromLog = movements.map((m) => ({ bankId: m.bankId, amount: m.amount, date: new Date(m.date) }));
  return [...fromTx, ...fromLog].sort((a, b) => a.date.getTime() - b.date.getTime());
}

const monthKey = (d: Date) => d.getFullYear() * 12 + d.getMonth();

/** Net contributions per month for the last `n` months (oldest first). */
export function monthlySeries(events: Event[], n = 12, bankId?: string) {
  const now = new Date();
  const start = monthKey(now) - (n - 1);
  const values = Array.from({ length: n }, (_, i) => {
    const k = start + i;
    return { month: new Date(Math.floor(k / 12), k % 12, 1), value: 0 };
  });
  events.forEach((e) => {
    if (bankId && e.bankId !== bankId) return;
    const idx = monthKey(e.date) - start;
    if (idx >= 0 && idx < n) values[idx].value += e.amount;
  });
  return values;
}

/** Consecutive months (ending this month, or last month if this one has none yet) with net deposits. */
export function monthStreak(events: Event[]) {
  const byMonth = new Map<number, number>();
  events.forEach((e) => byMonth.set(monthKey(e.date), (byMonth.get(monthKey(e.date)) || 0) + e.amount));
  let k = monthKey(new Date());
  if (!((byMonth.get(k) || 0) > 0)) k -= 1;
  let streak = 0;
  while ((byMonth.get(k) || 0) > 0) { streak++; k--; }
  return streak;
}

export function avgMonthly(events: Event[], bankId?: string, months = 3) {
  const series = monthlySeries(events, months + 1, bankId).slice(0, months);
  return series.reduce((s, m) => s + Math.max(0, m.value), 0) / months;
}

export function projection(bank: Bank, events: Event[]) {
  const goal = goalOf(bank);
  const missing = Math.max(0, goal - bank.balance);
  const avg = avgMonthly(events, bank.id);
  let monthsLeft: number | null = null;
  let neededPerMonth: number | null = null;
  if (bank.targetDate) {
    const t = parseDateOnly(bank.targetDate);
    const now = new Date();
    monthsLeft = Math.max(0, (t.getFullYear() - now.getFullYear()) * 12 + (t.getMonth() - now.getMonth()));
    neededPerMonth = monthsLeft > 0 ? missing / monthsLeft : missing;
  }
  const monthsAtPace = missing > 0 && avg > 0 ? Math.ceil(missing / avg) : null;
  return { goal, missing, avg, monthsLeft, neededPerMonth, monthsAtPace, done: goal > 0 && missing === 0 };
}

// ── Achievements ──────────────────────────────────────────────────────────

export type AchievementIcon =
  | 'sprout' | 'coins' | 'piggy' | 'target' | 'flame' | 'rocket' | 'gem' | 'crown' | 'layers' | 'calendar' | 'trophy';

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: AchievementIcon;
  current: number;
  target: number;
  unlocked: boolean;
  format?: 'money' | 'count';
};

export function computeAchievements(args: {
  banks: Bank[];
  events: Event[];
  streak: number;
  allowances: Allowance[];
  challenges: Challenge[];
}): Achievement[] {
  const { banks, events, streak, allowances, challenges } = args;
  const saved = banks.reduce((s, b) => s + b.balance, 0);
  const deposits = events.filter((e) => e.amount > 0).length;
  const goalsDone = banks.filter((b) => goalOf(b) > 0 && b.balance >= goalOf(b)).length;
  const claimed = challenges.filter((c) => c.status === 'claimed').length;

  const list: Omit<Achievement, 'unlocked'>[] = [
    { id: 'first-bank',  title: 'Primeiro cofrinho', description: 'Crie seu primeiro cofrinho',            icon: 'piggy',    current: banks.length, target: 1 },
    { id: 'first-dep',   title: 'Primeiro depósito', description: 'Faça o primeiro aporte',                icon: 'sprout',   current: Math.max(deposits, saved > 0 ? 1 : 0), target: 1 },
    { id: 'saved-1k',    title: 'Economizou 1 mil',  description: 'Some R$ 1.000 guardados',              icon: 'coins',    current: saved, target: 1000,   format: 'money' },
    { id: 'saved-10k',   title: 'Economizou 10 mil', description: 'Some R$ 10.000 guardados',             icon: 'gem',      current: saved, target: 10000,  format: 'money' },
    { id: 'saved-50k',   title: 'Economizou 50 mil', description: 'Some R$ 50.000 guardados',             icon: 'rocket',   current: saved, target: 50000,  format: 'money' },
    { id: 'saved-100k',  title: 'Clube dos 100 mil', description: 'Some R$ 100.000 guardados',            icon: 'crown',    current: saved, target: 100000, format: 'money' },
    { id: 'goal-1',      title: 'Meta alcançada',    description: 'Complete a meta de um cofrinho',        icon: 'target',   current: goalsDone, target: 1 },
    { id: 'streak-3',    title: 'Sequência de 3',    description: 'Poupe 3 meses seguidos',                icon: 'flame',    current: streak, target: 3 },
    { id: 'streak-6',    title: 'Sequência de 6',    description: 'Poupe 6 meses seguidos',                icon: 'flame',    current: streak, target: 6 },
    { id: 'streak-12',   title: 'Um ano poupando',   description: 'Poupe 12 meses seguidos',               icon: 'calendar', current: streak, target: 12 },
    { id: 'diverse',     title: 'Diversificado',     description: 'Mantenha 3 cofrinhos ativos',           icon: 'layers',   current: banks.length, target: 3 },
    { id: 'allowance',   title: 'Mesada em dia',     description: 'Configure uma mesada recorrente',       icon: 'calendar', current: allowances.length, target: 1 },
    { id: 'challenge',   title: 'Desafio vencido',   description: 'Resgate o benefício de um desafio',     icon: 'trophy',   current: claimed, target: 1 },
  ];
  return list.map((a) => ({ ...a, unlocked: a.current >= a.target }));
}

// ── Level / XP ────────────────────────────────────────────────────────────

const TITLES = ['Iniciante', 'Aprendiz', 'Poupador', 'Poupador Dedicado', 'Guardião', 'Estrategista', 'Mestre Poupador', 'Lenda da Poupança'];

export function levelInfo(saved: number, unlocked: number, streak: number) {
  const xp = Math.floor(saved / 10) + unlocked * 150 + streak * 50;
  // Each level costs 40% more XP than the previous one
  let level = 1, floor = 0, cost = 300;
  while (xp >= floor + cost) { floor += cost; cost = Math.round(cost * 1.4); level++; }
  return {
    xp,
    level,
    title: TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))],
    intoLevel: xp - floor,
    levelCost: cost,
    toNext: floor + cost - xp,
  };
}
