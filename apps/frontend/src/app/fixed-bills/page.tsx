'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { AppLayout } from '@/components/app-layout';
import { PlanGate } from '@/components/plan-gate';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { FixedBillModal } from '@/components/forms/FixedBillModal';
import { cn } from '@/lib/utils';
import {
  Plus, Trash2, Edit3,
  ChevronLeft, ChevronRight,
  RefreshCw, Loader2, CheckCircle2, AlertCircle,
  CreditCard, Receipt, Search, CalendarClock, Wallet, Clock, PieChart,
} from '@/components/ui/icons';

type Bill = {
  id: string;
  fixedBillId: string;
  title: string;
  value: number;
  dayOfMonth: number;
  isPaid: boolean;
  type: 'transaction' | 'aggregation' | 'card';
  paymentMethodType?: string;
  paymentMethodId?: string;
  categoryId?: string;
};

type StatusKey = 'paid' | 'overdue' | 'today' | 'soon' | 'pending';
type Filter = 'all' | 'pending' | 'overdue' | 'paid';

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const MONTHS_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const STATUS_STYLE: Record<StatusKey, string> = {
  paid: 'bg-primary-soft text-accent',
  overdue: 'bg-danger-soft text-danger',
  today: 'bg-warning-soft text-warning',
  soon: 'bg-warning-soft text-warning',
  pending: 'bg-surface-2 text-fg-2 border border-border',
};

export default function FixedBillsPage() {
  useAuth();

  const [bills, setBills] = useState<Bill[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<{ open: boolean; data: Bill | null }>({
    open: false,
    data: null,
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [resBills, resMethods] = await Promise.all([
        api.get('/fixed-bills', { params: { month, year } }),
        api.get('/payment-methods'),
      ]);
      setBills(resBills.data ?? []);
      setPaymentMethods(resMethods.data ?? []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () =>
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const handleSave = async (payload: any, id?: string) => {
    if (id) await api.patch(`/fixed-bills/${id}`, payload);
    else await api.post('/fixed-bills', payload);
    load();
  };

  const handleDelete = async (bill: Bill) => {
    const msg = bill.type === 'card'
      ? `Remover a regra "${bill.title}" e todas as transações futuras pendentes?`
      : `Remover "${bill.title}" e todos os lançamentos futuros não pagos?`;
    if (!confirm(msg)) return;
    try {
      await api.delete(`/fixed-bills/${bill.fixedBillId}`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Erro ao remover.');
    }
  };

  // Due-date status relative to today
  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayYear = today.getFullYear();
  const todayDay = today.getDate();
  const isCurrentMonth = month === todayMonth && year === todayYear;
  const isPastMonth = year < todayYear || (year === todayYear && month < todayMonth);

  const getStatus = useCallback((bill: Bill): { key: StatusKey; label: string } => {
    if (bill.isPaid) return { key: 'paid', label: 'Pago' };
    if (isPastMonth || (isCurrentMonth && bill.dayOfMonth < todayDay)) {
      return { key: 'overdue', label: 'Vencida' };
    }
    if (isCurrentMonth && bill.dayOfMonth === todayDay) return { key: 'today', label: 'Vence hoje' };
    if (isCurrentMonth && bill.dayOfMonth - todayDay <= 5) {
      const diff = bill.dayOfMonth - todayDay;
      return { key: 'soon', label: `Em ${diff} dia${diff > 1 ? 's' : ''}` };
    }
    return { key: 'pending', label: 'Pendente' };
  }, [isPastMonth, isCurrentMonth, todayDay]);

  const sortedBills = useMemo(
    () => [...bills].sort((a, b) => a.dayOfMonth - b.dayOfMonth || b.value - a.value),
    [bills],
  );

  const totalPending = bills.filter((b) => !b.isPaid).reduce((s, b) => s + b.value, 0);
  const totalPaid = bills.filter((b) => b.isPaid).reduce((s, b) => s + b.value, 0);
  const totalMonth = bills.reduce((s, b) => s + b.value, 0);
  const paidCount = bills.filter((b) => b.isPaid).length;
  const pendingCount = bills.length - paidCount;
  const overdueBills = sortedBills.filter((b) => getStatus(b).key === 'overdue');
  const totalOverdue = overdueBills.reduce((s, b) => s + b.value, 0);
  const paidPct = totalMonth > 0 ? Math.round((totalPaid / totalMonth) * 100) : 0;

  const cardTotal = bills.filter((b) => b.type === 'card').reduce((s, b) => s + b.value, 0);
  const billTotal = totalMonth - cardTotal;

  const upcoming = sortedBills.filter((b) => !b.isPaid).slice(0, 6);
  const topBills = [...bills].filter((b) => b.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);

  const visibleBills = sortedBills.filter((b) => {
    if (search && !b.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'paid') return b.isPaid;
    if (filter === 'pending') return !b.isPaid;
    if (filter === 'overdue') return getStatus(b).key === 'overdue';
    return true;
  });

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'Todas', count: bills.length },
    { key: 'pending', label: 'Pendentes', count: pendingCount },
    { key: 'overdue', label: 'Vencidas', count: overdueBills.length },
    { key: 'paid', label: 'Pagas', count: paidCount },
  ];

  const addButton = (
    <button
      data-tour="fixed-bills-add-btn"
      onClick={() => setModalState({ open: true, data: null })}
      className="btn btn-primary"
    >
      <Plus size={18} strokeWidth={3} /> Nova Conta Fixa
    </button>
  );

  return (
    <AppLayout title="Contas Fixas" subtitle="Despesas recorrentes mensais" actions={addButton} noPadding>
      <PlanGate feature="fixed_bills">
      <div className="h-full flex flex-col overflow-y-auto lg:overflow-hidden">

        {/* Frozen zone: month navigator + KPIs */}
        <div className="shrink-0 px-6 lg:px-8 pt-6 pb-4 space-y-4 w-full">

          {/* Month navigator */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <div className="flex items-center gap-2 text-accent font-semibold text-[11px]">
                <RefreshCw size={12} className={cn(loading && 'animate-spin')} />
                Fluxo Recorrente
              </div>
              <h2 className="text-xl font-semibold text-fg mt-1">
                {MONTHS_FULL[month - 1]} <span className="text-fg-muted font-normal">{year}</span>
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {!isCurrentMonth && (
                <button
                  onClick={goToday}
                  className="text-[11px] font-semibold px-3 py-2 rounded-lg border border-border text-fg-muted hover:text-fg hover:bg-surface-2 transition"
                >
                  Mês atual
                </button>
              )}
              <div data-tour="fixed-bills-month-nav" className="flex items-center bg-surface-2 dark:bg-card p-1 rounded-xl border border-border">
                <button
                  onClick={prevMonth}
                  className="p-2 hover:bg-card dark:hover:bg-hover rounded-lg transition active:scale-90"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="px-5 text-center min-w-[110px]">
                  <p className="text-[11px] font-semibold text-fg-muted leading-none">{year}</p>
                  <p className="text-xs font-semibold text-fg mt-0.5">
                    {MONTHS[month - 1]}
                  </p>
                </div>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-card dark:hover:bg-hover rounded-lg transition active:scale-90"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div data-tour="fixed-bills-kpi-cards" className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiCard
              icon={<Wallet size={16} />}
              iconClass="bg-surface-2 text-fg"
              label="Total do Mês"
              value={fmt(totalMonth)}
              valueClass="text-fg"
              hint={`${bills.length} conta${bills.length !== 1 ? 's' : ''} fixa${bills.length !== 1 ? 's' : ''}`}
            />
            <KpiCard
              icon={<Clock size={16} />}
              iconClass="bg-danger-soft text-danger"
              label="Pendente"
              value={fmt(totalPending)}
              valueClass="text-danger"
              hint={
                overdueBills.length > 0
                  ? `${overdueBills.length} vencida${overdueBills.length > 1 ? 's' : ''} · ${fmt(totalOverdue)}`
                  : `${pendingCount} a pagar`
              }
            />
            <KpiCard
              icon={<CheckCircle2 size={16} />}
              iconClass="bg-primary-soft text-accent"
              label="Pago"
              value={fmt(totalPaid)}
              valueClass="text-accent"
              hint={`${paidCount} de ${bills.length} quitada${paidCount !== 1 ? 's' : ''}`}
            />
            <div className="bg-card rounded-xl p-4 border border-border flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-fg-muted">Progresso do mês</p>
                <span className="text-sm font-semibold text-fg">{paidPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-track overflow-hidden mt-3">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${paidPct}%` }}
                />
              </div>
              <p className="text-[11px] text-fg-muted mt-2">
                {pendingCount === 0 && bills.length > 0
                  ? 'Tudo pago neste mês 🎉'
                  : `Faltam ${fmt(totalPending)}`}
              </p>
            </div>
          </div>
        </div>

        {/* Main area: list + insights sidebar */}
        <div className="lg:flex-1 lg:min-h-0 px-6 lg:px-8 pb-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4">

          {/* Bills list */}
          <div
            data-tour="fixed-bills-table"
            className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col lg:min-h-0"
          >
            {/* Toolbar */}
            <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-border">
              <div className="flex items-center gap-1 overflow-x-auto">
                {filters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap',
                      filter === f.key
                        ? 'bg-card text-fg shadow-sm border border-border'
                        : 'text-fg-muted hover:text-fg',
                    )}
                  >
                    {f.label}
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-md',
                        f.key === 'overdue' && f.count > 0
                          ? 'bg-danger-soft text-danger'
                          : 'bg-surface-2 text-fg-muted',
                      )}
                    >
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
              <div className="relative sm:w-56">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar conta..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-card border border-border text-fg placeholder:text-fg-muted focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="lg:flex-1 lg:min-h-0 overflow-auto">
              {loading ? (
                <div className="py-24 flex justify-center">
                  <Loader2 className="text-accent animate-spin" size={32} />
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-surface-2 z-10">
                    <tr className="border-b border-border text-[11px] font-semibold text-fg-muted">
                      <th className="pl-4 pr-2 py-3 text-left w-16">Venc.</th>
                      <th className="px-3 py-3 text-left">Conta / Origem</th>
                      <th className="px-3 py-3 text-center hidden md:table-cell">Tipo</th>
                      <th className="px-3 py-3 text-center">Status</th>
                      <th className="px-3 py-3 text-right">Valor</th>
                      <th className="pl-3 pr-4 py-3 text-right w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visibleBills.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center text-fg-muted text-[11px] font-semibold">
                          {bills.length === 0 ? 'Nenhuma conta fixa neste mês' : 'Nenhuma conta encontrada com esse filtro'}
                        </td>
                      </tr>
                    ) : (
                      visibleBills.map((bill) => {
                        const status = getStatus(bill);
                        const share = totalMonth > 0 ? (bill.value / totalMonth) * 100 : 0;
                        return (
                          <tr
                            key={bill.id}
                            className={cn(
                              'transition-all hover:bg-card-hover group',
                              bill.isPaid && 'opacity-70 hover:opacity-100',
                            )}
                          >
                            {/* Due day */}
                            <td className="pl-4 pr-2 py-3">
                              <div
                                className={cn(
                                  'w-11 h-11 rounded-xl flex flex-col items-center justify-center border',
                                  status.key === 'overdue'
                                    ? 'border-danger/30 bg-danger-soft text-danger'
                                    : status.key === 'today'
                                      ? 'border-warning/30 bg-warning-soft text-warning'
                                      : 'border-border bg-card text-fg',
                                )}
                              >
                                <span className="text-sm font-bold leading-none">{bill.dayOfMonth}</span>
                                <span className="text-[9px] font-semibold uppercase opacity-70 mt-0.5">
                                  {MONTHS[month - 1]}
                                </span>
                              </div>
                            </td>

                            {/* Title + share bar */}
                            <td className="px-3 py-3">
                              <p className="font-semibold text-fg text-sm tracking-tight leading-none">
                                {bill.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <div className="h-1 w-24 rounded-full bg-track overflow-hidden">
                                  <div
                                    className={cn('h-full rounded-full', bill.type === 'card' ? 'bg-info' : 'bg-primary')}
                                    style={{ width: `${Math.max(share, share > 0 ? 2 : 0)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-semibold text-fg-muted">
                                  {share.toFixed(1)}% do mês
                                </span>
                              </div>
                            </td>

                            {/* Type badge */}
                            <td className="px-3 py-3 text-center hidden md:table-cell">
                              {bill.type === 'card' ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-info-soft text-info">
                                  <CreditCard size={11} />
                                  <span className="text-[11px] font-semibold">Cartão</span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-warning-soft text-warning">
                                  <Receipt size={11} />
                                  <span className="text-[11px] font-semibold">Conta</span>
                                </div>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-3 py-3 text-center">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap',
                                  STATUS_STYLE[status.key],
                                )}
                              >
                                {status.key === 'paid'
                                  ? <CheckCircle2 size={12} strokeWidth={2.5} />
                                  : status.key === 'overdue'
                                    ? <AlertCircle size={12} strokeWidth={2.5} />
                                    : <Clock size={12} strokeWidth={2.5} />}
                                {status.label}
                              </span>
                            </td>

                            {/* Value */}
                            <td className="px-3 py-3 text-right">
                              <span
                                className={cn(
                                  'font-semibold text-base tracking-tight whitespace-nowrap',
                                  bill.isPaid ? 'text-fg-muted line-through decoration-1' : 'text-fg',
                                )}
                              >
                                {fmt(bill.value)}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="pl-3 pr-4 py-3 text-right">
                              <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition">
                                {bill.type === 'transaction' && (
                                  <button
                                    onClick={() => setModalState({ open: true, data: bill })}
                                    className="p-2 text-fg-muted hover:text-accent transition rounded-lg hover:bg-primary-soft"
                                    title="Editar lançamento"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(bill)}
                                  className="p-2 text-fg-disabled dark:text-fg-muted hover:text-danger transition rounded-lg hover:bg-danger-soft"
                                  title="Remover regra e lançamentos futuros"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {visibleBills.length > 0 && (
                    <tfoot className="sticky bottom-0 bg-surface-2">
                      <tr className="border-t border-border">
                        <td colSpan={4} className="pl-4 py-3 text-[11px] font-semibold text-fg-muted">
                          {visibleBills.length} conta{visibleBills.length !== 1 ? 's' : ''} exibida{visibleBills.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-semibold text-fg whitespace-nowrap">
                          {fmt(visibleBills.reduce((s, b) => s + b.value, 0))}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              )}
            </div>
          </div>

          {/* Insights sidebar */}
          <aside className="flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto">

            {/* Upcoming */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarClock size={15} className="text-accent" />
                <h3 className="text-sm font-semibold text-fg">Próximos vencimentos</h3>
              </div>
              {upcoming.length === 0 ? (
                <p className="text-[11px] text-fg-muted py-4 text-center">
                  {bills.length === 0 ? 'Nada por aqui.' : 'Nenhuma conta pendente 🎉'}
                </p>
              ) : (
                <ol className="relative space-y-3 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                  {upcoming.map((bill) => {
                    const status = getStatus(bill);
                    return (
                      <li key={bill.id} className="relative flex items-start gap-3 pl-0">
                        <span
                          className={cn(
                            'relative z-10 mt-1 w-[15px] h-[15px] rounded-full border-2 border-card shrink-0',
                            status.key === 'overdue'
                              ? 'bg-danger'
                              : status.key === 'today' || status.key === 'soon'
                                ? 'bg-warning'
                                : 'bg-fg-muted/40',
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-fg truncate">{bill.title}</p>
                            <p className="text-xs font-semibold text-fg whitespace-nowrap">{fmt(bill.value)}</p>
                          </div>
                          <p
                            className={cn(
                              'text-[11px] mt-0.5',
                              status.key === 'overdue' ? 'text-danger' : 'text-fg-muted',
                            )}
                          >
                            Dia {bill.dayOfMonth} · {status.label}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            {/* Composition */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <PieChart size={15} className="text-accent" />
                <h3 className="text-sm font-semibold text-fg">Composição</h3>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-surface-2">
                {totalMonth > 0 && (
                  <>
                    <div className="bg-primary h-full" style={{ width: `${(billTotal / totalMonth) * 100}%` }} />
                    <div className="bg-info h-full" style={{ width: `${(cardTotal / totalMonth) * 100}%` }} />
                  </>
                )}
              </div>
              <div className="mt-3 space-y-2">
                {[
                  { label: 'Contas', value: billTotal, dot: 'bg-primary', count: bills.filter((b) => b.type !== 'card').length },
                  { label: 'Faturas de cartão', value: cardTotal, dot: 'bg-info', count: bills.filter((b) => b.type === 'card').length },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-fg-muted">
                      <span className={cn('w-2 h-2 rounded-full', row.dot)} />
                      {row.label}
                      <span className="text-[10px]">({row.count})</span>
                    </div>
                    <span className="font-semibold text-fg">{fmt(row.value)}</span>
                  </div>
                ))}
              </div>

              {topBills.length > 0 && (
                <>
                  <p className="text-[11px] font-semibold text-fg-muted mt-5 mb-2">Maiores despesas</p>
                  <div className="space-y-2.5">
                    {topBills.map((bill) => {
                      const pct = totalMonth > 0 ? (bill.value / totalMonth) * 100 : 0;
                      return (
                        <div key={bill.id}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-fg truncate pr-2">{bill.title}</span>
                            <span className="text-fg-muted whitespace-nowrap">{pct.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-track overflow-hidden mt-1">
                            <div
                              className={cn('h-full rounded-full', bill.type === 'card' ? 'bg-info' : 'bg-primary')}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>

      <FixedBillModal
        isOpen={modalState.open}
        onClose={() => setModalState({ open: false, data: null })}
        onSave={handleSave}
        initialData={modalState.data}
        paymentMethods={paymentMethods}
      />
      </PlanGate>
    </AppLayout>
  );
}

function KpiCard({
  icon, iconClass, label, value, valueClass, hint,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: string;
  valueClass: string;
  hint: string;
}) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border flex items-start gap-3">
      <div className={cn('p-2 rounded-lg shrink-0', iconClass)}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-fg-muted">{label}</p>
        <p className={cn('text-lg font-semibold mt-0.5 truncate', valueClass)}>{value}</p>
        <p className="text-[11px] text-fg-muted mt-0.5 truncate">{hint}</p>
      </div>
    </div>
  );
}
