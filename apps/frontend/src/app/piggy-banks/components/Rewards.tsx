'use client';

import { useState } from 'react';
import {
  CalendarHeart, Plus, Trash2, Pause, Play, Swords, Gift, Check, Loader2, Flame, Coins, Clock,
} from '@/components/ui/icons';
import { CurrencyInput } from '@/lib/currency-input';
import { cn } from '@/lib/utils';
import { Modal } from '@/app/dashboard-v2/components/Modal';
import {
  type Allowance, type Challenge, type Frequency, WEEKDAYS, describeSchedule, toISODate, uid, fromISODate,
} from '../lib/local-store';
import type { Bank } from '../lib/insights';

const fmtBRL = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const label = 'mb-1.5 block text-xs font-medium text-fg-2';

// ── Pending allowance banner ──────────────────────────────────────────────

export function PendingAllowances({ items, banks, onConfirm, onSkip, busy }: {
  items: { allowance: Allowance; date: Date; count: number }[];
  banks: Bank[];
  onConfirm: (a: Allowance, date: Date) => void;
  onSkip: (a: Allowance, date: Date) => void;
  busy: string | null;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      {items.map(({ allowance: a, date, count }) => {
        const bank = banks.find((b) => b.id === a.bankId);
        return (
          <div key={a.id} className="flex flex-col gap-3 rounded-2xl border border-primary-border bg-primary-soft p-4 sm:flex-row sm:items-center">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary">
              <CalendarHeart size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">Dia da mesada! <span className="font-normal text-fg-2">· {a.name}</span></p>
              <p className="text-xs text-fg-2">
                {fmtBRL(a.amount)} para <span className="font-medium">{bank?.name ?? 'cofrinho removido'}</span>
                {' '}· {date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}
                {count > 1 && <span className="text-fg-muted"> · +{count - 1} pendente{count > 2 ? 's' : ''}</span>}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onSkip(a, date)} disabled={busy === a.id} className="btn btn-secondary">Pular</button>
              <button onClick={() => onConfirm(a, date)} disabled={busy === a.id || !bank} className="btn btn-primary">
                {busy === a.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Confirmar depósito
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Allowances panel ──────────────────────────────────────────────────────

export function AllowancesPanel({ allowances, banks, onAdd, onToggle, onDelete }: {
  allowances: Allowance[];
  banks: Bank[];
  onAdd: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const monthlyTotal = allowances
    .filter((a) => a.active)
    .reduce((s, a) => s + (a.frequency === 'weekly' ? a.amount * 4.33 : a.amount), 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarHeart size={16} strokeWidth={1.75} className="text-accent" />
          <p className="text-sm font-semibold text-fg">Mesadas recorrentes</p>
        </div>
        <button onClick={onAdd} className="btn btn-secondary h-8 px-2.5 text-xs"><Plus size={13} /> Adicionar</button>
      </div>

      {allowances.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-fg-muted">
          Programe depósitos semanais ou mensais. No dia, você só confirma.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {allowances.map((a) => {
              const bank = banks.find((b) => b.id === a.bankId);
              return (
                <li key={a.id} className={cn('group flex items-center gap-3 py-2.5', !a.active && 'opacity-60')}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-fg-2">
                    <Coins size={16} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-fg">{a.name}</p>
                    <p className="truncate text-[11px] text-fg-muted">{describeSchedule(a.frequency, a.day)} · {bank?.name ?? '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold tabular-nums text-accent">+{fmtBRL(a.amount)}</p>
                    <span className="rounded border border-border bg-surface-2 px-1 text-[10px] text-fg-2">{a.frequency === 'weekly' ? 'Semanal' : 'Mensal'}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                    <button onClick={() => onToggle(a.id)} aria-label={a.active ? 'Pausar' : 'Retomar'} className="flex h-6 w-6 items-center justify-center rounded text-fg-muted hover:bg-hover hover:text-fg">
                      {a.active ? <Pause size={12} /> : <Play size={12} />}
                    </button>
                    <button onClick={() => onDelete(a.id)} aria-label="Excluir" className="flex h-6 w-6 items-center justify-center rounded text-fg-muted hover:bg-danger-soft hover:text-danger">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 border-t border-border pt-2.5 text-[11px] text-fg-muted">
            ≈ <span className="font-medium tabular-nums text-fg">{fmtBRL(monthlyTotal)}</span> por mês em mesadas ativas
          </p>
        </>
      )}
    </div>
  );
}

export function AllowanceModal({ banks, onClose, onSave }: {
  banks: Bank[];
  onClose: () => void;
  onSave: (a: Allowance) => void;
}) {
  const [name, setName] = useState('Mesada semanal');
  const [bankId, setBankId] = useState(banks[0]?.id ?? '');
  const [amount, setAmount] = useState(0);
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [day, setDay] = useState(1);

  const save = () => {
    if (!name.trim() || !bankId || amount <= 0) return;
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    onSave({
      id: uid(), name: name.trim(), bankId, amount, frequency, day,
      lastHandled: toISODate(yesterday), active: true, createdAt: new Date().toISOString(),
    });
  };

  return (
    <Modal title="Nova mesada recorrente" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={label}>Nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="field" placeholder="Ex: Mesada semanal" />
        </div>
        <div>
          <label className={label}>Cofrinho de destino</label>
          <select value={bankId} onChange={(e) => setBankId(e.target.value)} className="field">
            {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Valor</label>
          <CurrencyInput value={amount} onChange={setAmount} placeholder="0,00" className="field" />
        </div>
        <div>
          <label className={label}>Frequência</label>
          <div className="grid grid-cols-2 gap-2">
            {(['weekly', 'monthly'] as Frequency[]).map((f) => (
              <button key={f} type="button"
                onClick={() => { setFrequency(f); setDay(f === 'weekly' ? 1 : 1); if (name === 'Mesada semanal' || name === 'Mesada mensal') setName(f === 'weekly' ? 'Mesada semanal' : 'Mesada mensal'); }}
                className={cn('h-9 rounded-lg border text-xs font-medium transition-colors', frequency === f ? 'border-primary bg-primary-soft text-accent' : 'border-border text-fg-2 hover:bg-hover')}>
                {f === 'weekly' ? 'Semanal' : 'Mensal'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={label}>{frequency === 'weekly' ? 'Dia da semana' : 'Dia do mês'}</label>
          {frequency === 'weekly' ? (
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((w, i) => (
                <button key={w} type="button" onClick={() => setDay(i)}
                  className={cn('h-8 rounded-md border text-[11px] font-medium transition-colors', day === i ? 'border-primary bg-primary-soft text-accent' : 'border-border text-fg-2 hover:bg-hover')}>
                  {w}
                </button>
              ))}
            </div>
          ) : (
            <input type="number" min={1} max={31} value={day} onChange={(e) => setDay(Math.min(31, Math.max(1, Number(e.target.value) || 1)))} className="field" />
          )}
        </div>
        <p className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-[11px] text-fg-muted">
          No dia programado aparece um aviso no topo desta tela para você confirmar (ou pular) o depósito.
        </p>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
          <button onClick={save} disabled={!name.trim() || !bankId || amount <= 0} className="btn btn-primary flex-1"><Check size={14} /> Salvar</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Challenges ────────────────────────────────────────────────────────────

export type ChallengeProgress = { current: number; pct: number; complete: boolean; expired: boolean };

export function ChallengesPanel({ challenges, progressOf, banks, onAdd, onClaim, onDelete }: {
  challenges: Challenge[];
  progressOf: (c: Challenge) => ChallengeProgress;
  banks: Bank[];
  onAdd: () => void;
  onClaim: (c: Challenge) => void;
  onDelete: (id: string) => void;
}) {
  const active = challenges.filter((c) => c.status === 'active');
  const claimed = challenges.filter((c) => c.status === 'claimed');

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords size={16} strokeWidth={1.75} className="text-accent" />
          <p className="text-sm font-semibold text-fg">Desafios e benefícios</p>
        </div>
        <button onClick={onAdd} className="btn btn-secondary h-8 px-2.5 text-xs"><Plus size={13} /> Novo</button>
      </div>

      {active.length === 0 && (
        <p className="py-4 text-center text-[13px] text-fg-muted">
          Crie um desafio de poupança e defina um benefício, como liberar uma mesada.
        </p>
      )}

      <ul className="space-y-2.5">
        {active.map((c) => {
          const p = progressOf(c);
          const bank = c.bankId ? banks.find((b) => b.id === c.bankId) : null;
          return (
            <li key={c.id} className={cn('group rounded-xl border p-3', p.complete ? 'border-primary-border bg-primary-soft' : 'border-border bg-surface-2/50')}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-fg">{c.title}</p>
                  <p className="truncate text-[11px] text-fg-muted">
                    {c.type === 'amount' ? `Guardar ${fmtBRL(c.target)}` : `${c.target} meses seguidos`}
                    {bank ? ` · ${bank.name}` : ' · todos os cofrinhos'}
                    {c.deadline ? ` · até ${fromISODate(c.deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}` : ''}
                  </p>
                </div>
                <button onClick={() => onDelete(c.id)} aria-label="Excluir desafio" className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-fg-muted opacity-100 hover:bg-danger-soft hover:text-danger md:opacity-0 md:group-hover:opacity-100">
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-track">
                  <div className={cn('h-full rounded-full transition-all duration-700', p.expired && !p.complete ? 'bg-danger' : 'bg-primary')} style={{ width: `${p.pct}%` }} />
                </div>
                <span className="text-[11px] tabular-nums text-fg-muted">
                  {c.type === 'amount' ? `${Math.round(p.pct)}%` : `${Math.min(p.current, c.target)}/${c.target}`}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="flex min-w-0 items-center gap-1 text-[11px] text-fg-2">
                  <Gift size={11} className="shrink-0 text-accent" />
                  <span className="truncate">{c.reward || (c.rewardAllowance ? `Mesada de ${fmtBRL(c.rewardAllowance.amount)}` : 'Benefício')}</span>
                </p>
                {p.complete ? (
                  <button onClick={() => onClaim(c)} className="btn btn-primary h-7 px-2.5 text-xs"><Gift size={12} /> Resgatar</button>
                ) : p.expired ? (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-danger"><Clock size={11} /> Expirado</span>
                ) : c.type === 'streak' ? (
                  <span className="flex items-center gap-1 text-[11px] text-fg-muted"><Flame size={11} /> em andamento</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {claimed.length > 0 && (
        <p className="mt-3 border-t border-border pt-2.5 text-[11px] text-fg-muted">
          {claimed.length} desafio{claimed.length === 1 ? '' : 's'} vencido{claimed.length === 1 ? '' : 's'} 🎉
        </p>
      )}
    </div>
  );
}

const TEMPLATES: { title: string; type: 'amount' | 'streak'; target: number; days: number | null; reward: string; allowance: number | null }[] = [
  { title: 'Guardar R$ 500 este mês', type: 'amount', target: 500, days: 30, reward: 'Liberar mesada semanal de R$ 25', allowance: 25 },
  { title: '3 meses seguidos poupando', type: 'streak', target: 3, days: null, reward: 'Jantar especial', allowance: null },
  { title: 'Juntar R$ 2.000 em 90 dias', type: 'amount', target: 2000, days: 90, reward: 'Liberar mesada mensal de R$ 100', allowance: 100 },
];

export function ChallengeModal({ banks, onClose, onSave }: {
  banks: Bank[];
  onClose: () => void;
  onSave: (c: Challenge) => void;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'amount' | 'streak'>('amount');
  const [target, setTarget] = useState(0);
  const [bankId, setBankId] = useState<string>('');
  const [deadline, setDeadline] = useState('');
  const [reward, setReward] = useState('');
  const [withAllowance, setWithAllowance] = useState(false);
  const [allowanceAmount, setAllowanceAmount] = useState(0);
  const [allowanceFreq, setAllowanceFreq] = useState<Frequency>('weekly');
  const [allowanceBank, setAllowanceBank] = useState(banks[0]?.id ?? '');

  const applyTemplate = (t: typeof TEMPLATES[number]) => {
    setTitle(t.title); setType(t.type); setTarget(t.target); setReward(t.reward);
    if (t.days) { const d = new Date(); d.setDate(d.getDate() + t.days); setDeadline(toISODate(d)); } else setDeadline('');
    setWithAllowance(!!t.allowance);
    if (t.allowance) { setAllowanceAmount(t.allowance); setAllowanceFreq(t.title.includes('mensal') || t.reward.includes('mensal') ? 'monthly' : 'weekly'); }
  };

  const valid = title.trim() && target > 0 && (!withAllowance || (allowanceAmount > 0 && allowanceBank));

  const save = () => {
    if (!valid) return;
    onSave({
      id: uid(), title: title.trim(), type, target,
      bankId: bankId || null, deadline: deadline || null, reward: reward.trim(),
      rewardAllowance: withAllowance ? { amount: allowanceAmount, frequency: allowanceFreq, day: 1, bankId: allowanceBank } : null,
      status: 'active', createdAt: new Date().toISOString(),
    });
  };

  return (
    <Modal title="Novo desafio" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className={label}>Modelos rápidos</p>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((t) => (
              <button key={t.title} type="button" onClick={() => applyTemplate(t)}
                className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-fg-2 hover:border-primary-border hover:bg-primary-soft hover:text-accent transition-colors">
                {t.title}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={label}>Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="field" placeholder="Ex: Guardar R$ 500 este mês" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {([['amount', 'Juntar um valor'], ['streak', 'Meses seguidos']] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => { setType(v); setTarget(0); }}
              className={cn('h-9 rounded-lg border text-xs font-medium transition-colors', type === v ? 'border-primary bg-primary-soft text-accent' : 'border-border text-fg-2 hover:bg-hover')}>
              {l}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>{type === 'amount' ? 'Valor a guardar' : 'Meses seguidos'}</label>
            {type === 'amount'
              ? <CurrencyInput value={target} onChange={setTarget} placeholder="0,00" className="field" />
              : <input type="number" min={1} max={24} value={target || ''} onChange={(e) => setTarget(Number(e.target.value) || 0)} className="field" placeholder="3" />}
          </div>
          <div>
            <label className={label}>Prazo (opcional)</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="field" />
          </div>
        </div>
        {type === 'amount' && (
          <div>
            <label className={label}>Conta para o desafio</label>
            <select value={bankId} onChange={(e) => setBankId(e.target.value)} className="field">
              <option value="">Todos os cofrinhos</option>
              {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <p className="mt-1 text-[11px] text-fg-muted">Conta o que for guardado a partir de hoje.</p>
          </div>
        )}
        <div>
          <label className={label}>Benefício ao concluir</label>
          <input value={reward} onChange={(e) => setReward(e.target.value)} className="field" placeholder="Ex: Liberar mesada, passeio, presente..." />
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-fg-2">
          <input type="checkbox" checked={withAllowance} onChange={(e) => setWithAllowance(e.target.checked)} />
          Ao resgatar, criar uma mesada recorrente
        </label>
        {withAllowance && (
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-surface-2 p-3 sm:grid-cols-3">
            <div>
              <label className={label}>Valor</label>
              <CurrencyInput value={allowanceAmount} onChange={setAllowanceAmount} placeholder="0,00" className="field" />
            </div>
            <div>
              <label className={label}>Frequência</label>
              <select value={allowanceFreq} onChange={(e) => setAllowanceFreq(e.target.value as Frequency)} className="field">
                <option value="weekly">Semanal (seg)</option>
                <option value="monthly">Mensal (dia 1)</option>
              </select>
            </div>
            <div>
              <label className={label}>Cofrinho</label>
              <select value={allowanceBank} onChange={(e) => setAllowanceBank(e.target.value)} className="field">
                {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
          <button onClick={save} disabled={!valid} className="btn btn-primary flex-1"><Check size={14} /> Criar desafio</button>
        </div>
      </div>
    </Modal>
  );
}
