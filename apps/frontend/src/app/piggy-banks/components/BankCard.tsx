'use client';

import { ArrowDownCircle, ArrowUpCircle, CalendarClock, Edit3, Trash2, TrendingUp, Trophy, Gauge } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { parseDateOnly } from '@/lib/utils';
import type { Bank, projection } from '../lib/insights';

const fmtBRL = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtMonthYear = (s: string) =>
  parseDateOnly(s).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');

function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--track)" strokeWidth="6" />
        <circle
          cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (Math.min(100, pct) / 100) * c}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold tabular-nums text-fg">
        {Math.round(pct)}%
      </span>
    </div>
  );
}

export function BankCard({ bank, proj, monthContribution, onDeposit, onWithdraw, onEdit, onDelete }: {
  bank: Bank;
  proj: ReturnType<typeof projection>;
  monthContribution: number;
  onDeposit: () => void;
  onWithdraw: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const color = bank.color || 'var(--primary)';
  const pct = proj.goal > 0 ? (bank.balance / proj.goal) * 100 : 0;

  let insight: { icon: React.ElementType; text: string; tone: 'ok' | 'warn' | 'done' | 'muted' };
  if (proj.done) insight = { icon: Trophy, text: 'Meta concluída! Defina um novo objetivo.', tone: 'done' };
  else if (proj.goal === 0) insight = { icon: Gauge, text: 'Defina uma meta para acompanhar o progresso.', tone: 'muted' };
  else if (proj.neededPerMonth !== null && proj.monthsLeft !== null) {
    const onTrack = proj.avg >= proj.neededPerMonth;
    insight = proj.monthsLeft === 0
      ? { icon: CalendarClock, text: `Prazo chegou · faltam ${fmtBRL(proj.missing)}`, tone: 'warn' }
      : { icon: onTrack ? TrendingUp : CalendarClock, text: `Guarde ${fmtBRL(proj.neededPerMonth)}/mês para chegar em ${fmtMonthYear(bank.targetDate!)}`, tone: onTrack ? 'ok' : 'warn' };
  } else if (proj.monthsAtPace) {
    insight = { icon: TrendingUp, text: `No ritmo atual, meta em ~${proj.monthsAtPace} ${proj.monthsAtPace === 1 ? 'mês' : 'meses'}`, tone: 'ok' };
  } else insight = { icon: Gauge, text: `Faltam ${fmtBRL(proj.missing)} para a meta`, tone: 'muted' };

  const InsightIcon = insight.icon;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-border-hover">
      {/* Cover */}
      <div className="relative h-24 overflow-hidden">
        {bank.imageUrl ? (
          <img src={bank.imageUrl} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${color} 70%, white 10%), color-mix(in srgb, ${color} 55%, black))` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: color }} />
        <div className="absolute bottom-3 left-4 right-20">
          <p className="truncate text-[15px] font-semibold text-white">{bank.name}</p>
          {bank.targetDate && (
            <p className="flex items-center gap-1 text-[11px] text-white/70"><CalendarClock size={11} /> até {fmtMonthYear(bank.targetDate)}</p>
          )}
        </div>
        <div className="absolute right-3 top-3 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
          <button onClick={onEdit} aria-label="Editar" className="flex h-7 w-7 items-center justify-center rounded-md bg-black/35 text-white backdrop-blur-sm hover:bg-black/55 transition">
            <Edit3 size={13} />
          </button>
          <button onClick={onDelete} aria-label="Arquivar" className="flex h-7 w-7 items-center justify-center rounded-md bg-black/35 text-white backdrop-blur-sm hover:bg-danger transition">
            <Trash2 size={13} />
          </button>
        </div>
        {proj.done && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-on-primary">
            <Trophy size={11} /> Concluído
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center gap-4">
          <Ring pct={pct} color={color} />
          <div className="min-w-0">
            <p className="text-[11px] text-fg-muted">Guardado</p>
            <p className="truncate text-xl font-semibold tabular-nums tracking-tight text-fg">{fmtBRL(bank.balance)}</p>
            <p className="truncate text-[11px] tabular-nums text-fg-muted">
              {proj.goal > 0 ? `de ${fmtBRL(proj.goal)}` : 'sem meta definida'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-surface-2/60 px-3 py-2">
            <p className="text-[11px] text-fg-muted">Este mês</p>
            <p className={cn('text-[13px] font-semibold tabular-nums', monthContribution > 0 ? 'text-accent' : monthContribution < 0 ? 'text-danger' : 'text-fg-muted')}>
              {monthContribution > 0 ? '+' : ''}{fmtBRL(monthContribution)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-2/60 px-3 py-2">
            <p className="text-[11px] text-fg-muted">Média 3 meses</p>
            <p className="text-[13px] font-semibold tabular-nums text-fg">{fmtBRL(proj.avg)}</p>
          </div>
        </div>

        <p className={cn(
          'flex items-start gap-1.5 text-[11px] leading-snug',
          insight.tone === 'ok' ? 'text-accent' : insight.tone === 'warn' ? 'text-warning' : insight.tone === 'done' ? 'text-accent font-medium' : 'text-fg-muted',
        )}>
          <InsightIcon size={12} className="mt-px shrink-0" /> {insight.text}
        </p>

        <div className="mt-auto flex gap-2">
          <button onClick={onDeposit} className="btn btn-primary flex-1">
            <ArrowDownCircle size={14} /> Depositar
          </button>
          <button onClick={onWithdraw} className="btn btn-secondary flex-1">
            <ArrowUpCircle size={14} /> Retirar
          </button>
        </div>
      </div>
    </article>
  );
}
