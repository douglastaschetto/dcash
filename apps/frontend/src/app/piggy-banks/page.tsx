'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { AppLayout } from '@/components/app-layout';
import { PlanGate } from '@/components/plan-gate';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import {
  PiggyBank as PiggyIcon, Plus, Loader2, ArrowDownCircle, ArrowUpCircle, CheckCircle2,
  Wallet, TrendingUp, TrendingDown, CalendarHeart, Gift,
} from '@/components/ui/icons';
import { PiggyBankModal } from '@/components/forms/PiggyBankModal';
import { CurrencyInput } from '@/lib/currency-input';
import { cn } from '@/lib/utils';
import { Modal } from '@/app/dashboard-v2/components/Modal';
import {
  type Allowance, type Challenge, type Movement,
  useLocalList, uid, toISODate, fromISODate, pendingOccurrences, describeSchedule,
} from './lib/local-store';
import {
  type Bank, type TxLike, buildEvents, monthlySeries, monthStreak, avgMonthly, projection,
  computeAchievements, levelInfo, goalOf,
} from './lib/insights';
import { LevelHero, AchievementsPanel, AchievementToast } from './components/Gamification';
import { ContributionsChart, DistributionChart } from './components/Charts';
import { BankCard } from './components/BankCard';
import {
  PendingAllowances, AllowancesPanel, AllowanceModal, ChallengesPanel, ChallengeModal, type ChallengeProgress,
} from './components/Rewards';

type OperationModal = { bank: Bank; type: 'deposit' | 'withdraw' } | null;

const fmtBRL = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const apiMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

function nextOccurrence(a: Allowance) {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 62; i++) {
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const hit = a.frequency === 'weekly' ? d.getDay() === a.day : d.getDate() === Math.min(a.day, lastDay);
    if (hit && d > fromISODate(a.lastHandled)) return new Date(d);
    d.setDate(d.getDate() + 1);
  }
  return null;
}

export default function PiggyBanksPage() {
  useAuth();

  const { data: banks = [], isLoading: loading, mutate } = useSWR<Bank[]>('/piggy-banks');
  const { data: transactions = [], isLoading: txLoading } = useSWR<TxLike[]>('/transactions');

  const [allowances, setAllowances] = useLocalList<Allowance[]>('allowances', []);
  const [challenges, setChallenges] = useLocalList<Challenge[]>('challenges', []);
  const [movements, setMovements] = useLocalList<Movement[]>('movements', []);
  const [seen, setSeen] = useLocalList<string[] | null>('seen-achievements', null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Bank | null>(null);
  const [opModal, setOpModal] = useState<OperationModal>(null);
  const [opAmount, setOpAmount] = useState(0);
  const [opLoading, setOpLoading] = useState(false);
  const [opSuccess, setOpSuccess] = useState(false);
  const [allowanceModal, setAllowanceModal] = useState(false);
  const [challengeModal, setChallengeModal] = useState(false);
  const [allowanceBusy, setAllowanceBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ── Derived data ──────────────────────────────────────────────────────────
  const events = useMemo(() => buildEvents(transactions, movements), [transactions, movements]);
  const series = useMemo(() => monthlySeries(events, 12), [events]);
  const streak = useMemo(() => monthStreak(events), [events]);
  const totalSaved = banks.reduce((s, b) => s + b.balance, 0);
  const totalGoal = banks.reduce((s, b) => s + goalOf(b), 0);
  const thisMonth = series[series.length - 1]?.value ?? 0;
  const avg3 = avgMonthly(events);

  const achievements = useMemo(
    () => computeAchievements({ banks, events, streak, allowances, challenges }),
    [banks, events, streak, allowances, challenges],
  );
  const unlockedIds = achievements.filter((a) => a.unlocked).map((a) => a.id);
  const level = levelInfo(totalSaved, unlockedIds.length, streak);

  // New achievements → toast. The first visit only records what's already unlocked.
  const dataReady = !loading && !txLoading;
  const freshIds = seen ? unlockedIds.filter((id) => !seen.includes(id)) : [];
  const markSeen = (ids: string[]) => setSeen((prev) => Array.from(new Set([...(prev ?? []), ...ids])));

  useEffect(() => {
    if (!dataReady || seen !== null) return;
    const t = setTimeout(() => setSeen(unlockedIds), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataReady, seen]);

  useEffect(() => {
    if (freshIds.length === 0) return;
    const id = freshIds[0];
    const t = setTimeout(() => markSeen([id]), 4500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshIds[0]]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const pending = allowances
    .map((a) => ({ allowance: a, occ: pendingOccurrences(a) }))
    .filter((p) => p.occ.length > 0)
    .map((p) => ({ allowance: p.allowance, date: p.occ[0], count: p.occ.length }));

  const nextAllowance = allowances
    .filter((a) => a.active)
    .map((a) => ({ a, date: nextOccurrence(a) }))
    .filter((x) => x.date)
    .sort((x, y) => x.date!.getTime() - y.date!.getTime())[0];

  const progressOf = (c: Challenge): ChallengeProgress => {
    const expired = !!c.deadline && new Date() > new Date(fromISODate(c.deadline).getTime() + 86400000);
    if (c.type === 'streak') {
      return { current: streak, pct: Math.min(100, (streak / c.target) * 100), complete: streak >= c.target, expired };
    }
    const since = new Date(c.createdAt);
    const net = events
      .filter((e) => e.date >= since && (!c.bankId || e.bankId === c.bankId))
      .reduce((s, e) => s + e.amount, 0);
    return { current: net, pct: Math.max(0, Math.min(100, (net / c.target) * 100)), complete: net >= c.target, expired };
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const openCreate = () => { setSelected(null); setModalOpen(true); };
  const openEdit = (b: Bank) => { setSelected(b); setModalOpen(true); };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Arquivar cofrinho "${name}"?`)) return;
    try {
      await api.delete(`/piggy-banks/${id}`);
      mutate((prev) => prev?.filter((b) => b.id !== id), { revalidate: false });
    } catch { /* ignore */ }
  };

  const moveMoney = async (bankId: string, type: 'deposit' | 'withdraw', amount: number) => {
    const { data } = await api.post(`/piggy-banks/${bankId}/${type}`, { amount });
    mutate((prev) => prev?.map((b) => {
      if (b.id !== bankId) return b;
      const balance = Number(data.balance ?? 0);
      const goal = Number(data.yearlyGoal || data.monthlyGoal || 1);
      return { ...b, balance, progress: Math.min((balance / goal) * 100, 100) };
    }), { revalidate: false });
    setMovements((prev) => [...prev, { id: uid(), bankId, amount: type === 'deposit' ? amount : -amount, date: new Date().toISOString() }]);
  };

  const openOp = (bank: Bank, type: 'deposit' | 'withdraw') => {
    setOpAmount(0); setOpSuccess(false); setOpModal({ bank, type });
  };

  const handleOperation = async () => {
    if (!opModal || opAmount <= 0) return;
    setOpLoading(true);
    try {
      await moveMoney(opModal.bank.id, opModal.type, opAmount);
      setOpSuccess(true);
      setTimeout(() => setOpModal(null), 1100);
    } catch (err) {
      alert(apiMessage(err, 'Erro na operação.'));
    } finally {
      setOpLoading(false);
    }
  };

  const confirmAllowance = async (a: Allowance, date: Date) => {
    setAllowanceBusy(a.id);
    try {
      await moveMoney(a.bankId, 'deposit', a.amount);
      setAllowances((prev) => prev.map((x) => (x.id === a.id ? { ...x, lastHandled: toISODate(date) } : x)));
      setNotice(`${a.name}: ${fmtBRL(a.amount)} depositado!`);
    } catch (err) {
      alert(apiMessage(err, 'Não foi possível depositar a mesada.'));
    } finally {
      setAllowanceBusy(null);
    }
  };

  const skipAllowance = (a: Allowance, date: Date) =>
    setAllowances((prev) => prev.map((x) => (x.id === a.id ? { ...x, lastHandled: toISODate(date) } : x)));

  const claimChallenge = (c: Challenge) => {
    if (c.rewardAllowance) {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      setAllowances((prev) => [...prev, {
        id: uid(),
        name: `Mesada · ${c.title}`,
        bankId: c.rewardAllowance!.bankId,
        amount: c.rewardAllowance!.amount,
        frequency: c.rewardAllowance!.frequency,
        day: c.rewardAllowance!.day,
        lastHandled: toISODate(yesterday),
        active: true,
        createdAt: new Date().toISOString(),
      }]);
    }
    setChallenges((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: 'claimed' } : x)));
    setNotice(c.rewardAllowance
      ? `Benefício liberado: mesada de ${fmtBRL(c.rewardAllowance.amount)} criada!`
      : `Desafio vencido! Benefício: ${c.reward || 'aproveite!'}`);
  };

  const addButton = (
    <button data-tour="piggy-banks-add-btn" onClick={openCreate} className="btn btn-primary">
      <Plus size={16} /> Novo cofrinho
    </button>
  );

  const toastAchievement = achievements.find((a) => a.id === freshIds[0]);
  const totalPct = totalGoal > 0 ? Math.min(100, (totalSaved / totalGoal) * 100) : 0;
  const monthDiff = avg3 > 0 ? ((thisMonth - avg3) / avg3) * 100 : null;
  const activeChallenges = challenges.filter((c) => c.status === 'active').length;

  return (
    <AppLayout title="Cofrinhos" subtitle="Poupe, conquiste e acompanhe suas metas" actions={addButton} noPadding>
      <PlanGate feature="dreams_goals">
      <div className="h-full overflow-y-auto">
      <div className="w-full p-4 md:p-6 space-y-4">

        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-accent" />
          </div>
        )}

        {!loading && banks.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <PiggyIcon size={36} strokeWidth={1.5} className="mx-auto mb-3 text-fg-disabled" />
            <p className="text-base font-semibold text-fg">Nenhum cofrinho ainda</p>
            <p className="mt-1 text-sm text-fg-muted">Crie um cofrinho para começar a poupar, ganhar conquistas e subir de nível.</p>
            <button onClick={openCreate} className="btn btn-primary mt-5"><Plus size={16} /> Criar primeiro cofrinho</button>
          </div>
        )}

        {!loading && banks.length > 0 && (
          <>
            {/* ── KPIs ─────────────────────────────────────────────── */}
            <section data-tour="piggy-banks-kpi-cards" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <LevelHero {...level} streak={streak} />

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-fg-2">Total guardado</p>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-fg-muted"><Wallet size={15} strokeWidth={1.75} /></span>
                </div>
                <p className="mt-3 text-[26px] leading-none font-semibold tracking-tight tabular-nums text-fg">{fmtBRL(totalSaved)}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-track">
                  <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${totalPct}%` }} />
                </div>
                <p className="mt-2 text-[11px] tabular-nums text-fg-muted">
                  {totalGoal > 0 ? `${totalPct.toFixed(0)}% das metas · ${fmtBRL(totalGoal)}` : 'Defina metas nos cofrinhos'}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-fg-2">Aportes no mês</p>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-fg-muted"><ArrowDownCircle size={15} strokeWidth={1.75} /></span>
                </div>
                <p className={cn('mt-3 text-[26px] leading-none font-semibold tracking-tight tabular-nums', thisMonth < 0 ? 'text-danger' : 'text-fg')}>{fmtBRL(thisMonth)}</p>
                <div className="mt-3 flex min-h-5 items-center gap-2">
                  {monthDiff !== null && Math.round(monthDiff) !== 0 && (
                    <span className={cn('inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
                      monthDiff > 0 ? 'border-primary-border bg-primary-soft text-accent' : 'border-danger/30 bg-danger-soft text-danger')}>
                      {monthDiff > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {Math.abs(monthDiff).toFixed(0)}%
                    </span>
                  )}
                  <span className="text-[11px] text-fg-muted">média de {fmtBRL(avg3)}/mês</span>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-fg-2">Próxima mesada</p>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-accent"><CalendarHeart size={15} strokeWidth={1.75} /></span>
                </div>
                {nextAllowance ? (
                  <>
                    <p className="mt-3 text-[26px] leading-none font-semibold tracking-tight tabular-nums text-fg">{fmtBRL(nextAllowance.a.amount)}</p>
                    <p className="mt-3 truncate text-[11px] text-fg-muted">
                      {nextAllowance.date!.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace(/\./g, '')} · {nextAllowance.a.name}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-[26px] leading-none font-semibold tracking-tight text-fg-muted">—</p>
                    <button onClick={() => setAllowanceModal(true)} className="mt-3 text-[11px] font-medium text-accent hover:underline">Programar uma mesada</button>
                  </>
                )}
                {activeChallenges > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-fg-muted"><Gift size={11} className="text-accent" /> {activeChallenges} desafio{activeChallenges === 1 ? '' : 's'} ativo{activeChallenges === 1 ? '' : 's'}</p>
                )}
              </div>
            </section>

            {/* ── Mesadas pendentes ────────────────────────────────── */}
            <PendingAllowances items={pending} banks={banks} onConfirm={confirmAllowance} onSkip={skipAllowance} busy={allowanceBusy} />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
              {/* ═══════ Cofrinhos + gráficos ═══════ */}
              <div className="min-w-0 space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-fg">Meus cofrinhos</h2>
                  <span className="text-xs text-fg-muted">{banks.length}</span>
                </div>
                <div data-tour="piggy-banks-grid" className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3 min-[1900px]:grid-cols-4">
                  {banks.map((bank) => (
                    <BankCard
                      key={bank.id}
                      bank={bank}
                      proj={projection(bank, events)}
                      monthContribution={monthlySeries(events, 1, bank.id)[0].value}
                      onDeposit={() => openOp(bank, 'deposit')}
                      onWithdraw={() => openOp(bank, 'withdraw')}
                      onEdit={() => openEdit(bank)}
                      onDelete={() => handleDelete(bank.id, bank.name)}
                    />
                  ))}
                  <button
                    onClick={openCreate}
                    className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-fg-muted transition-colors hover:border-primary-border hover:bg-primary-soft hover:text-accent"
                  >
                    <Plus size={22} strokeWidth={1.5} />
                    <span className="text-[13px] font-medium">Novo cofrinho</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <ContributionsChart series={series} />
                  <DistributionChart banks={banks} />
                </div>
              </div>

              {/* ═══════ Gamificação ═══════ */}
              <div className="min-w-0 space-y-4">
                <AchievementsPanel achievements={achievements} />
                <AllowancesPanel
                  allowances={allowances}
                  banks={banks}
                  onAdd={() => setAllowanceModal(true)}
                  onToggle={(id) => setAllowances((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)))}
                  onDelete={(id) => { if (confirm('Excluir esta mesada?')) setAllowances((prev) => prev.filter((a) => a.id !== id)); }}
                />
                <ChallengesPanel
                  challenges={challenges}
                  progressOf={progressOf}
                  banks={banks}
                  onAdd={() => setChallengeModal(true)}
                  onClaim={claimChallenge}
                  onDelete={(id) => { if (confirm('Excluir este desafio?')) setChallenges((prev) => prev.filter((c) => c.id !== id)); }}
                />
                <p className="px-1 text-[11px] leading-relaxed text-fg-muted">
                  Mesadas, desafios e depósitos feitos nesta tela ficam salvos neste navegador.
                  Aportes lançados como investimento nas transações entram automaticamente no histórico.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
      </div>

      {/* Create/Edit modal */}
      {modalOpen && (
        <PiggyBankModal bank={selected} onClose={() => setModalOpen(false)} onRefresh={() => mutate()} />
      )}

      {/* Deposit / Withdraw */}
      {opModal && (
        <Modal
          onClose={() => setOpModal(null)}
          title={<>{opModal.type === 'deposit' ? 'Depositar em' : 'Retirar de'} <span className="text-accent">{opModal.bank.name}</span></>}
        >
          {opSuccess ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 size={40} className="text-accent" />
              <p className="text-sm font-medium text-fg-2">{opModal.type === 'deposit' ? 'Depósito realizado!' : 'Retirada realizada!'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-4 py-3">
                <span className="text-xs text-fg-muted">Saldo atual</span>
                <span className="text-sm font-semibold tabular-nums text-fg">{fmtBRL(opModal.bank.balance)}</span>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-fg-2">Valor</label>
                <CurrencyInput
                  autoFocus
                  value={opAmount}
                  onChange={setOpAmount}
                  placeholder="0,00"
                  className="field !h-14 !text-2xl font-semibold tabular-nums"
                  onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleOperation()}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[50, 100, 200, 500].map((v) => (
                    <button key={v} type="button" onClick={() => setOpAmount(v)}
                      className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-fg-2 hover:border-primary-border hover:bg-primary-soft hover:text-accent transition-colors">
                      R$ {v}
                    </button>
                  ))}
                  {opModal.type === 'deposit' && goalOf(opModal.bank) > opModal.bank.balance && (
                    <button type="button" onClick={() => setOpAmount(Math.round((goalOf(opModal.bank) - opModal.bank.balance) * 100) / 100)}
                      className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-fg-2 hover:border-primary-border hover:bg-primary-soft hover:text-accent transition-colors">
                      Completar meta
                    </button>
                  )}
                </div>
                {opAmount > 0 && (
                  <p className="mt-2 text-[11px] tabular-nums text-fg-muted">
                    Novo saldo: <span className="font-medium text-fg">{fmtBRL(opModal.bank.balance + (opModal.type === 'deposit' ? opAmount : -opAmount))}</span>
                  </p>
                )}
              </div>
              <button onClick={handleOperation} disabled={opLoading || opAmount <= 0} className={cn('btn w-full !h-11', opModal.type === 'deposit' ? 'btn-primary' : 'btn-secondary')}>
                {opLoading ? <Loader2 size={16} className="animate-spin" /> : opModal.type === 'deposit' ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
                {opModal.type === 'deposit' ? 'Confirmar depósito' : 'Confirmar retirada'}
              </button>
            </div>
          )}
        </Modal>
      )}

      {allowanceModal && (
        <AllowanceModal
          banks={banks}
          onClose={() => setAllowanceModal(false)}
          onSave={(a) => { setAllowances((prev) => [...prev, a]); setAllowanceModal(false); setNotice(`Mesada criada: ${describeSchedule(a.frequency, a.day)}`); }}
        />
      )}

      {challengeModal && (
        <ChallengeModal
          banks={banks}
          onClose={() => setChallengeModal(false)}
          onSave={(c) => { setChallenges((prev) => [...prev, c]); setChallengeModal(false); }}
        />
      )}

      {toastAchievement && (
        <AchievementToast achievement={toastAchievement} onClose={() => markSeen([freshIds[0]])} />
      )}

      {notice && !toastAchievement && (
        <div className="fixed bottom-6 right-6 z-[210] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-2 rounded-xl border border-primary-border bg-card px-4 py-3 text-[13px] font-medium text-fg shadow-xl">
            <CheckCircle2 size={16} className="text-accent" /> {notice}
          </div>
        </div>
      )}
      </PlanGate>
    </AppLayout>
  );
}
