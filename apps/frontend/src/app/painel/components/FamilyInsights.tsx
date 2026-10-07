'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertOctagon, AlertTriangle, Cake, CheckCircle2, ChevronDown, Flame, Layers, ListChecks, MessageSquare,
  PiggyBank, Radar, ShoppingBasket, Sparkles, TrendingDown, TrendingUp, Wallet, Wrench,
} from '@/components/ui/icons';
import { cn, parseDateOnly } from '@/lib/utils';
import type { InstallmentTransaction } from '@/hooks/useInstallments';
import type { Home } from '@/app/dcaos/lib/dcaos';

type Level = 'critical' | 'warning' | 'info' | 'good';
type Insight = { id: string; level: Level; icon: React.ElementType; title: string; detail: string; href?: string };

const LEVEL: Record<Level, { rank: number; chip: string; text: string }> = {
  critical: { rank: 0, chip: 'bg-danger-soft text-danger', text: 'text-danger' },
  warning:  { rank: 1, chip: 'bg-warning-soft text-warning', text: 'text-warning' },
  info:     { rank: 2, chip: 'bg-info-soft text-info', text: 'text-fg' },
  good:     { rank: 3, chip: 'bg-primary-soft text-accent', text: 'text-fg' },
};
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 2 });
const pct = (n: number) => `${Math.round(n)}%`;
const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

type Cat = { name: string; amount: number; planned: number | null; overBudget: boolean };
type Piggy = { balance?: number | string; yearlyGoal?: number | string; monthlyGoal?: number | string };
type Dream = { title?: string; name?: string; targetValue?: number | string; savedValue?: number | string };

/**
 * "Radar da família": rule-based insights mixing finances (month result,
 * budget, installments) and household (DCaos) signals. Critical items are
 * pinned on top in a red block; the rest is ranked by severity.
 */
export function FamilyInsights({ income, expense, prevExpense, totalPlanned, categories, installments, piggyBanks, dreams, home, monthLabel }: {
  income: number; expense: number; prevExpense: number; totalPlanned: number; categories: Cat[];
  installments: InstallmentTransaction[]; piggyBanks: Piggy[]; dreams: Dream[]; home?: Home; monthLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const list: Insight[] = [];
  const balance = income - expense;

  /* ── Finanças do mês ─────────────────────────────── */
  if (income === 0 && expense > 0) {
    list.push({ id: 'no-income', level: 'warning', icon: Wallet, title: 'Nenhuma receita lançada', detail: `${brl(expense)} em gastos e nenhuma entrada em ${monthLabel}. Falta lançar o salário?`, href: '/transactions' });
  } else if (balance < 0) {
    list.push({ id: 'negative', level: 'critical', icon: AlertOctagon, title: 'Mês no vermelho', detail: `Os gastos superam as receitas em ${brl(-balance)}. Hora de segurar as despesas variáveis.`, href: '/dashboard-v2' });
  } else if (income > 0) {
    const rate = (balance / income) * 100;
    if (rate >= 20) list.push({ id: 'saving', level: 'good', icon: PiggyBank, title: `Sobrando ${pct(rate)} da renda`, detail: `${brl(balance)} livres no mês. Que tal mandar uma parte pros cofrinhos?`, href: '/piggy-banks' });
    else if (rate < 5) list.push({ id: 'tight', level: 'warning', icon: Wallet, title: 'Orçamento no limite', detail: `Sobra só ${pct(rate)} da renda (${brl(balance)}). Qualquer imprevisto pesa.` });
  }

  if (prevExpense > 0 && expense > prevExpense * 1.2) {
    list.push({ id: 'spend-up', level: 'warning', icon: TrendingUp, title: `Gastos ${pct(((expense - prevExpense) / prevExpense) * 100)} maiores`, detail: `${brl(expense)} contra ${brl(prevExpense)} no mês anterior.`, href: '/transactions' });
  } else if (prevExpense > 0 && expense < prevExpense * 0.85 && expense > 0) {
    list.push({ id: 'spend-down', level: 'good', icon: TrendingDown, title: `Gastos ${pct(((prevExpense - expense) / prevExpense) * 100)} menores`, detail: `Economia de ${brl(prevExpense - expense)} em relação ao mês anterior.` });
  }

  const over = categories.filter((c) => c.overBudget && c.planned !== null);
  if (totalPlanned > 0 && expense > totalPlanned) {
    list.push({ id: 'budget', level: 'critical', icon: AlertTriangle, title: 'Orçamento do mês estourado', detail: `${brl(expense - totalPlanned)} acima do planejado${over.length ? ` · ${over.length} categoria${over.length > 1 ? 's' : ''} acima do limite` : ''}.`, href: '/planning' });
  } else if (over.length) {
    const worst = [...over].sort((a, b) => (b.amount - (b.planned ?? 0)) - (a.amount - (a.planned ?? 0)))[0];
    list.push({ id: 'cat-over', level: 'warning', icon: AlertTriangle, title: `${over.length} categoria${over.length > 1 ? 's' : ''} acima do limite`, detail: `${worst.name} passou ${brl(worst.amount - (worst.planned ?? 0))} do orçado.`, href: '/planning' });
  } else if (totalPlanned === 0 && expense > 0) {
    list.push({ id: 'no-plan', level: 'info', icon: Sparkles, title: 'Mês sem planejamento', detail: 'Defina limites por categoria para receber alertas antes de estourar.', href: '/planning' });
  }

  const top = categories[0];
  if (top && expense > 0 && top.amount / expense >= 0.5 && categories.length > 1) {
    list.push({ id: 'concentration', level: 'info', icon: Flame, title: `${top.name} concentra ${pct((top.amount / expense) * 100)} dos gastos`, detail: `${brl(top.amount)} numa categoria só. Vale olhar com carinho.` });
  }

  /* ── Parcelamentos ───────────────────────────────── */
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdue = installments.filter((t) => !t.isPaid && parseDateOnly(t.date) < today);
  if (overdue.length) {
    list.push({ id: 'inst-overdue', level: 'critical', icon: Layers, title: `${overdue.length} parcela${overdue.length > 1 ? 's' : ''} vencida${overdue.length > 1 ? 's' : ''}`, detail: `${brl(overdue.reduce((s, t) => s + Number(t.amount), 0))} em atraso. Juros correm todo dia.`, href: '/installments' });
  }
  const monthInst = installments.filter((t) => sameMonth(parseDateOnly(t.date), today)).reduce((s, t) => s + Number(t.amount), 0);
  if (income > 0 && monthInst > 0) {
    const share = (monthInst / income) * 100;
    if (share >= 50) list.push({ id: 'inst-share', level: 'critical', icon: Layers, title: `Parcelas comprometem ${pct(share)} da renda`, detail: `${brl(monthInst)} em parcelas neste mês. Evite novas compras parceladas.`, href: '/installments' });
    else if (share >= 30) list.push({ id: 'inst-share', level: 'warning', icon: Layers, title: `Parcelas comprometem ${pct(share)} da renda`, detail: `O recomendado é ficar abaixo de 30%. Hoje são ${brl(monthInst)}.`, href: '/installments' });
  }
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const groups = new Map<string, InstallmentTransaction[]>();
  installments.forEach((t) => { const k = t.installmentGroup || t.description; groups.set(k, [...(groups.get(k) ?? []), t]); });
  const freeing = Array.from(groups.values())
    .map((g) => g.sort((a, b) => parseDateOnly(a.date).getTime() - parseDateOnly(b.date).getTime()).at(-1)!)
    .filter((last) => last && sameMonth(parseDateOnly(last.date), nextMonth));
  if (freeing.length) {
    list.push({ id: 'inst-free', level: 'good', icon: Sparkles, title: `Em ${MONTHS[nextMonth.getMonth()]} libera ${brl(freeing.reduce((s, t) => s + Number(t.amount), 0))}/mês`, detail: `${freeing.length} parcelamento${freeing.length > 1 ? 's' : ''} termina${freeing.length > 1 ? 'm' : ''}. Não troque por outro!`, href: '/installments' });
  }

  /* ── Metas ───────────────────────────────────────── */
  const saved = piggyBanks.reduce((s, b) => s + Number(b.balance || 0), 0);
  const goal = piggyBanks.reduce((s, b) => s + Number(b.yearlyGoal || b.monthlyGoal || 0), 0);
  if (piggyBanks.length && goal > 0 && saved / goal < 0.1 && today.getMonth() >= 6) {
    list.push({ id: 'piggy-low', level: 'warning', icon: PiggyBank, title: 'Cofrinhos bem atrás da meta', detail: `${pct((saved / goal) * 100)} da meta guardado e o ano já está no ${today.getMonth() + 1}º mês.`, href: '/piggy-banks' });
  }
  const nearDream = dreams
    .map((d) => ({ title: d.title || d.name || 'Sonho', target: Number(d.targetValue || 0), have: Number(d.savedValue || 0) }))
    .filter((d) => d.target > 0 && d.have < d.target)
    .sort((a, b) => b.have / b.target - a.have / a.target)[0];
  if (nearDream && nearDream.have / nearDream.target >= 0.75) {
    list.push({ id: 'dream', level: 'good', icon: Sparkles, title: `${nearDream.title} quase lá`, detail: `${pct((nearDream.have / nearDream.target) * 100)} conquistado · faltam ${brl(nearDream.target - nearDream.have)}.`, href: '/dreams' });
  }

  /* ── Casa (DCaos) ────────────────────────────────── */
  if (home) {
    if (home.maintenance.urgent > 0) {
      list.push({ id: 'maint', level: 'critical', icon: Wrench, title: `${home.maintenance.urgent} manutenção urgente`, detail: 'Algo na casa precisa de atenção antes que vire prejuízo maior.', href: '/dcaos/manutencao' });
    } else if (home.maintenance.preventiveDue > 0) {
      list.push({ id: 'maint-prev', level: 'info', icon: Wrench, title: `${home.maintenance.preventiveDue} preventiva${home.maintenance.preventiveDue > 1 ? 's' : ''} vencendo`, detail: 'Revisão em dia sai mais barato que conserto.', href: '/dcaos/manutencao' });
    }
    if (home.tasks.overdue > 0) {
      list.push({ id: 'tasks-late', level: home.tasks.overdue >= 4 ? 'critical' : 'warning', icon: ListChecks, title: `${home.tasks.overdue} tarefa${home.tasks.overdue > 1 ? 's' : ''} da casa atrasada${home.tasks.overdue > 1 ? 's' : ''}`, detail: home.tasks.unassigned ? `${home.tasks.unassigned} sem responsável. Alguém se habilita?` : 'Bora dividir antes que acumule.', href: '/dcaos/tarefas' });
    }
    const soon = home.dates.next.filter((d) => d.daysUntil <= 7);
    soon.slice(0, 2).forEach((d) => list.push({
      id: `date-${d.id}`, level: d.daysUntil <= 2 ? 'warning' : 'info', icon: Cake,
      title: d.daysUntil === 0 ? `Hoje: ${d.title}` : `${d.title} em ${d.daysUntil} dia${d.daysUntil > 1 ? 's' : ''}`,
      detail: d.kind === 'birthday' ? 'Já pensou no presente?' : d.kind === 'document' ? 'Documento vencendo, não deixe pra última hora.' : 'Data importante chegando.',
      href: '/dcaos/datas',
    }));
    if (home.market.low > 0) list.push({ id: 'pantry', level: 'info', icon: ShoppingBasket, title: `${home.market.low} ite${home.market.low > 1 ? 'ns' : 'm'} acabando na despensa`, detail: 'Coloque na lista antes da próxima ida ao mercado.', href: '/dcaos/mercado' });
    if (home.notes.unread > 0) list.push({ id: 'notes', level: 'info', icon: MessageSquare, title: `${home.notes.unread} bilhete${home.notes.unread > 1 ? 's' : ''} não lido${home.notes.unread > 1 ? 's' : ''}`, detail: 'Tem recado da família esperando por você.', href: '/dcaos/recados' });
    if (home.habits.today > 0 && home.habits.doneToday === home.habits.today) {
      list.push({ id: 'habits', level: 'good', icon: CheckCircle2, title: 'Hábitos de hoje concluídos', detail: home.habits.bestStreak > 1 ? `Melhor sequência: ${home.habits.bestStreak} dias seguidos.` : 'Constância é tudo.', href: '/dcaos/habitos' });
    }
  }

  const sorted = list.sort((a, b) => LEVEL[a.level].rank - LEVEL[b.level].rank);
  const critical = sorted.filter((i) => i.level === 'critical');
  const rest = sorted.filter((i) => i.level !== 'critical');
  const warnings = rest.filter((i) => i.level === 'warning').length;
  const visibleRest = expanded ? rest : rest.slice(0, 5);

  const row = (i: Insight) => {
    const lv = LEVEL[i.level];
    const body = (
      <>
        <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', lv.chip)}><i.icon size={14} strokeWidth={2} /></span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-[13px] font-semibold leading-snug', lv.text)}>{i.title}</span>
          <span className="block text-[11px] leading-snug text-fg-muted">{i.detail}</span>
        </span>
      </>
    );
    return i.href
      ? <Link key={i.id} href={i.href} className="flex gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-hover">{body}</Link>
      : <div key={i.id} className="flex gap-2.5 p-1.5">{body}</div>;
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-fg"><Radar size={16} className="text-accent" /> Radar da família</p>
        <div className="flex gap-1">
          {critical.length > 0 && <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold text-white">{critical.length} crítico{critical.length > 1 ? 's' : ''}</span>}
          {warnings > 0 && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning">{warnings} atenção</span>}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-xl bg-primary-soft p-3">
          <CheckCircle2 size={18} className="shrink-0 text-accent" />
          <p className="text-[13px] text-fg">Tudo sob controle por aqui. Nenhum ponto de atenção no momento.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {critical.length > 0 && (
            <div className="rounded-xl border border-danger/30 bg-danger-soft/60 p-1.5">
              <p className="flex items-center gap-1 px-1.5 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-wide text-danger">
                <AlertOctagon size={11} className="motion-safe:animate-pulse" /> Precisa de atenção agora
              </p>
              {critical.map(row)}
            </div>
          )}
          {visibleRest.length > 0 && <div className="space-y-0.5">{visibleRest.map(row)}</div>}
          {rest.length > 5 && (
            <button onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-center gap-1 pt-1 text-[11px] font-semibold text-accent hover:underline">
              {expanded ? 'Mostrar menos' : `Ver mais ${rest.length - 5}`} <ChevronDown size={12} className={cn('transition-transform', expanded && 'rotate-180')} />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
