'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { AppLayout } from '@/components/app-layout';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { cn } from '@/lib/utils';
import { Modal } from '@/app/dashboard-v2/components/Modal';
import { Bell, Cake, Check, Edit3, FileText, Flag, Gift, Heart, Loader2, Plus, Star, Trash2 } from '@/components/ui/icons';
import { DcaosGate } from '../components/DcaosGate';
import { apiError, fmtShortDate, type ImportantDate } from '../lib/dcaos';

const KINDS: { value: ImportantDate['kind']; label: string; icon: React.ElementType; cls: string }[] = [
  { value: 'birthday',      label: 'Aniversário',       icon: Cake,     cls: 'border-warning/30 bg-warning-soft text-warning' },
  { value: 'anniversary',   label: 'Data do casal',     icon: Heart,    cls: 'border-danger/30 bg-danger-soft text-danger' },
  { value: 'commemorative', label: 'Comemorativa',      icon: Flag,     cls: 'border-info/30 bg-info-soft text-info' },
  { value: 'document',      label: 'Documento/prazo',   icon: FileText, cls: 'border-border bg-surface-2 text-fg-2' },
  { value: 'other',         label: 'Outra',             icon: Star,     cls: 'border-primary-border bg-primary-soft text-accent' },
];
const kindOf = (k: string) => KINDS.find((x) => x.value === k) ?? KINDS[4];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const headline = (d: ImportantDate) =>
  d.kind === 'birthday' && d.personName ? `Aniversário de ${d.personName}` : d.title;

const countdown = (days: number) =>
  days < 0 ? 'Já passou' : days === 0 ? 'Hoje!' : days === 1 ? 'Amanhã' : `Em ${days} dias`;

type Form = {
  id?: string; kind: ImportantDate['kind']; title: string; personName: string; eventDate: string;
  yearKnown: boolean; yearly: boolean; remindDaysBefore: number; notes: string;
};
const EMPTY: Form = { kind: 'birthday', title: '', personName: '', eventDate: '', yearKnown: true, yearly: true, remindDaysBefore: 3, notes: '' };

function DatesContent() {
  const params = useSearchParams();
  const { data: dates = [], mutate, isLoading } = useSWR<ImportantDate[]>('/dcaos/dates');
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState<number | null>(null);
  const [form, setForm] = useState<Form | null>(() => (params.get('novo') === '1' ? { ...EMPTY } : null));

  const upcoming = dates.filter((d) => !d.past);
  const next = upcoming[0];
  const visible = month === null ? dates : dates.filter((d) => Number(d.nextDate.slice(5, 7)) - 1 === month);
  const groups = [
    { key: 'today', title: 'Hoje', items: visible.filter((d) => d.daysUntil === 0) },
    { key: 'week', title: 'Próximos 7 dias', items: visible.filter((d) => d.daysUntil > 0 && d.daysUntil <= 7) },
    { key: 'month', title: 'Próximos 30 dias', items: visible.filter((d) => d.daysUntil > 7 && d.daysUntil <= 30) },
    { key: 'later', title: 'Mais adiante', items: visible.filter((d) => d.daysUntil > 30) },
    { key: 'past', title: 'Já passaram', items: visible.filter((d) => d.past) },
  ].filter((g) => g.items.length);
  const perMonth = MONTHS.map((_, i) => dates.filter((d) => Number(d.nextDate.slice(5, 7)) - 1 === i).length);

  const save = async () => {
    if (!form || !form.eventDate) return;
    const title = form.title.trim() || (form.kind === 'birthday' && form.personName.trim() ? `Aniversário de ${form.personName.trim()}` : '');
    if (title.length < 2) return;
    setSaving(true);
    const payload = {
      title, personName: form.personName.trim() || null, kind: form.kind, eventDate: form.eventDate,
      yearKnown: form.yearKnown, yearly: form.yearly, remindDaysBefore: form.remindDaysBefore, notes: form.notes.trim() || null,
    };
    try {
      if (form.id) await api.patch(`/dcaos/dates/${form.id}`, payload);
      else await api.post('/dcaos/dates', payload);
      setForm(null);
      mutate();
    } catch (err) {
      alert(apiError(err, 'Não foi possível salvar a data.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-tour="dcaos-dates-page" className="w-full p-4 md:p-6 space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="hero-card relative overflow-hidden rounded-2xl p-6">
          <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/60">Próxima data</p>
          {next ? (
            <>
              <p className="mt-2 text-2xl font-semibold">{headline(next)}{next.years ? <span className="text-white/60"> · {next.years} {next.kind === 'birthday' ? 'anos' : next.years === 1 ? 'ano' : 'anos'}</span> : null}</p>
              <p className="mt-1 text-sm text-white/70">{fmtShortDate(next.nextDate)} · {countdown(next.daysUntil)}</p>
              <p className="mt-4 text-sm text-white/80">
                {next.daysUntil === 0 ? 'É hoje. Se esqueceu, ainda dá tempo de fingir que não.'
                  : next.daysUntil <= 7 ? 'Presente comprado? Imaginamos que não.'
                    : 'Ainda dá tempo. Por enquanto.'}
              </p>
              {next.notes && <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs text-white/80"><Gift size={13} className="mt-0.5 shrink-0" /> {next.notes}</p>}
            </>
          ) : (
            <p className="mt-2 text-xl font-semibold">Nenhuma data cadastrada. A sogra agradece o esquecimento.</p>
          )}
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-fg">Por mês</p>
            {month !== null && <button onClick={() => setMonth(null)} className="text-[11px] font-medium text-accent hover:underline">Ver todos</button>}
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {MONTHS.map((m, i) => (
              <button key={m} onClick={() => setMonth(month === i ? null : i)}
                className={cn('flex flex-col items-center rounded-lg border py-2 transition-colors',
                  month === i ? 'border-primary bg-primary-soft' : 'border-border hover:bg-hover', i === new Date().getMonth() && month !== i && 'border-primary-border')}>
                <span className="text-[10px] font-medium text-fg-muted">{m}</span>
                <span className={cn('text-sm font-semibold tabular-nums', perMonth[i] ? 'text-fg' : 'text-fg-disabled')}>{perMonth[i]}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setForm({ ...EMPTY })} className="btn btn-primary mt-4 w-full"><Plus size={15} /> Nova data</button>
        </section>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-accent" /></div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-14 text-center text-[13px] text-fg-muted">
          {dates.length === 0 ? 'Cadastre aniversários, datas do casal e prazos importantes.' : 'Nada neste mês.'}
        </div>
      ) : groups.map((g) => (
        <section key={g.key} className="space-y-2">
          <h2 className={cn('text-sm font-semibold', g.key === 'today' ? 'text-accent' : 'text-fg')}>{g.title} <span className="font-normal text-fg-muted">· {g.items.length}</span></h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {g.items.map((d) => {
              const k = kindOf(d.kind);
              const Icon = k.icon;
              return (
                <article key={d.id} className={cn('group flex flex-col gap-3 rounded-2xl border bg-card p-4', d.daysUntil === 0 ? 'border-primary-border ring-1 ring-primary-border' : 'border-border', d.past && 'opacity-60')}>
                  <div className="flex items-start gap-3">
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', k.cls)}><Icon size={18} strokeWidth={1.75} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-fg">{headline(d)}</p>
                      <p className="text-[11px] text-fg-muted">
                        {k.label} · {fmtShortDate(d.nextDate)}{d.years ? ` · ${d.years} ${d.kind === 'birthday' ? 'anos' : d.years === 1 ? 'ano' : 'anos'}` : ''}
                      </p>
                    </div>
                    <div className="flex opacity-100 md:opacity-0 md:group-hover:opacity-100">
                      <button onClick={() => setForm({ id: d.id, kind: d.kind, title: d.title, personName: d.personName ?? '', eventDate: d.eventDate, yearKnown: d.yearKnown, yearly: d.yearly, remindDaysBefore: d.remindDaysBefore, notes: d.notes ?? '' })}
                        aria-label="Editar" className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-accent"><Edit3 size={13} /></button>
                      <button onClick={async () => { if (!confirm(`Excluir "${headline(d)}"?`)) return; await api.delete(`/dcaos/dates/${d.id}`); mutate(); }}
                        aria-label="Excluir" className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-danger-soft hover:text-danger"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  {d.notes && <p className="line-clamp-2 flex items-start gap-1.5 text-xs text-fg-2"><Gift size={12} className="mt-0.5 shrink-0 text-fg-muted" /> {d.notes}</p>}
                  <div className="mt-auto flex items-center justify-between border-t border-border pt-2.5">
                    <span className={cn('rounded-md border px-1.5 py-0.5 text-[11px] font-semibold',
                      d.daysUntil === 0 ? 'border-primary bg-primary text-on-primary' : d.daysUntil <= 7 && !d.past ? 'border-warning/30 bg-warning-soft text-warning' : 'border-border text-fg-2')}>
                      {countdown(d.daysUntil)}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-fg-muted"><Bell size={11} /> {d.remindDaysBefore === 0 ? 'no dia' : `${d.remindDaysBefore}d antes`}{d.yearly ? ' · todo ano' : ''}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {form && (
        <Modal title={form.id ? 'Editar data' : 'Nova data importante'} onClose={() => setForm(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {KINDS.map((k) => (
                <button key={k.value} type="button" onClick={() => setForm({ ...form, kind: k.value, yearly: k.value === 'document' ? false : form.yearly })}
                  className={cn('flex flex-col items-center gap-1 rounded-lg border py-2 text-[10px] font-medium', form.kind === k.value ? k.cls : 'border-border text-fg-2 hover:bg-hover')}>
                  <k.icon size={15} /> {k.label}
                </button>
              ))}
            </div>
            {form.kind === 'birthday' && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-fg-2">De quem?</label>
                <input autoFocus value={form.personName} onChange={(e) => setForm({ ...form, personName: e.target.value })} placeholder="Ex: Sogra, Vó Maria, Pedro" className="field" />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg-2">{form.kind === 'birthday' ? 'Título (opcional)' : 'O que é?'}</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={form.kind === 'birthday' ? `Aniversário de ${form.personName || '...'}` : form.kind === 'anniversary' ? 'Ex: Aniversário de casamento' : form.kind === 'document' ? 'Ex: Vencimento da CNH' : 'Ex: Dia das Mães'}
                className="field" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-fg-2">Data</label>
                <input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} className="field" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-fg-2">Avisar</label>
                <select value={form.remindDaysBefore} onChange={(e) => setForm({ ...form, remindDaysBefore: Number(e.target.value) })} className="field">
                  {[[0, 'Só no dia'], [1, '1 dia antes'], [3, '3 dias antes'], [7, '1 semana antes'], [15, '15 dias antes'], [30, '1 mês antes']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-medium text-fg-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.yearly} onChange={(e) => setForm({ ...form, yearly: e.target.checked })} /> Repete todo ano</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.yearKnown} onChange={(e) => setForm({ ...form, yearKnown: e.target.checked })} /> Sei o ano (calcula idade/tempo)</label>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg-2">Ideias de presente / observações</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ex: gosta de orquídeas, não dar meia de novo" className="field !h-auto resize-none py-2.5" />
            </div>
            <p className="text-[11px] text-fg-muted">A família inteira é avisada no dia, na véspera e com a antecedência escolhida.</p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setForm(null)} className="btn btn-secondary flex-1">Cancelar</button>
              <button onClick={save} disabled={saving || !form.eventDate || (form.title.trim().length < 2 && !(form.kind === 'birthday' && form.personName.trim()))} className="btn btn-primary flex-1">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function DcaosDatesPage() {
  useAuth();
  return (
    <AppLayout title="Não Esquece" subtitle="Datas importantes · aniversário da sogra incluso" noPadding>
      <div className="h-full overflow-y-auto">
        <DcaosGate>
          <Suspense fallback={null}><DatesContent /></Suspense>
        </DcaosGate>
      </div>
    </AppLayout>
  );
}
