'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { AppLayout } from '@/components/app-layout';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { cn } from '@/lib/utils';
import { Modal } from '@/app/dashboard-v2/components/Modal';
import { CurrencyInput } from '@/lib/currency-input';
import {
  AlertTriangle, CalendarClock, Check, CheckCircle2, Edit3, Hammer, Loader2, Plus, ShieldCheck, Trash2, User, Wallet, Wrench,
} from '@/components/ui/icons';
import { DcaosGate } from '../components/DcaosGate';
import { apiError, firstName, fmtShortDate, todayISO, useMe, type Home, type Maintenance } from '../lib/dcaos';

const AREAS = ['Cozinha', 'Banheiro', 'Sala', 'Quartos', 'Lavanderia', 'Quintal', 'Elétrica', 'Hidráulica', 'Eletrodomésticos', 'Carro', 'Geral'];
const PRIORITIES: { value: Maintenance['priority']; label: string; cls: string }[] = [
  { value: 'urgent', label: 'Urgente', cls: 'border-danger bg-danger text-white' },
  { value: 'high',   label: 'Alta',    cls: 'border-danger/30 bg-danger-soft text-danger' },
  { value: 'medium', label: 'Média',   cls: 'border-warning/30 bg-warning-soft text-warning' },
  { value: 'low',    label: 'Baixa',   cls: 'border-border bg-surface-2 text-fg-2' },
];
const COLUMNS: { value: Maintenance['status']; label: string; hint: string }[] = [
  { value: 'open',        label: 'Deu ruim',      hint: 'Ninguém mexeu ainda' },
  { value: 'in_progress', label: 'Em andamento',  hint: 'Alguém está resolvendo' },
  { value: 'waiting',     label: 'Aguardando',    hint: 'Peça, orçamento ou profissional' },
];
const prio = (p: string) => PRIORITIES.find((x) => x.value === p) ?? PRIORITIES[2];
const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
const daysUntil = (iso: string) => Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(`${todayISO()}T00:00:00`).getTime()) / 86400000);

type Tab = 'issues' | 'preventive' | 'done';
type Form = {
  id?: string; kind: Maintenance['kind']; title: string; description: string; area: string; priority: Maintenance['priority'];
  assigneeId: string; professional: string; cost: number; intervalMonths: number; nextDue: string;
};
const EMPTY: Form = { kind: 'issue', title: '', description: '', area: '', priority: 'medium', assigneeId: '', professional: '', cost: 0, intervalMonths: 6, nextDue: '' };

function MaintenanceContent() {
  const params = useSearchParams();
  const me = useMe();
  const { data: items = [], mutate, isLoading } = useSWR<Maintenance[]>('/dcaos/maintenance');
  const { data: home } = useSWR<Home>('/dcaos/home');
  const members = home?.members ?? [];
  const [tab, setTab] = useState<Tab>('issues');
  const [form, setForm] = useState<Form | null>(() => (params.get('novo') === '1' ? { ...EMPTY } : null));
  const [resolving, setResolving] = useState<{ item: Maintenance; cost: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const issues = items.filter((i) => i.kind === 'issue' && i.status !== 'done');
  const preventive = items.filter((i) => i.kind === 'preventive');
  const done = items.filter((i) => i.kind === 'issue' && i.status === 'done');
  const year = new Date().getFullYear();
  const spentYear = items.filter((i) => i.cost && i.resolvedAt && new Date(i.resolvedAt).getFullYear() === year).reduce((s, i) => s + (i.cost ?? 0), 0);
  const dueSoon = preventive.filter((p) => p.nextDue && daysUntil(p.nextDue) <= 7);
  const urgent = issues.filter((i) => i.priority === 'urgent' || i.priority === 'high').length;

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    try { await fn(); await mutate(); } catch (err) { alert(apiError(err, 'Não foi possível atualizar.')); } finally { setBusy(null); }
  };

  const save = async () => {
    if (!form || form.title.trim().length < 2) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: form.title.trim(), description: form.description.trim() || null, area: form.area || null,
      assigneeId: form.assigneeId || null, professional: form.professional.trim() || null, cost: form.cost || null,
    };
    if (form.kind === 'issue') payload.priority = form.priority;
    else { payload.intervalMonths = form.intervalMonths; if (form.nextDue) payload.nextDue = form.nextDue; }
    if (!form.id) payload.kind = form.kind;
    try {
      if (form.id) await api.patch(`/dcaos/maintenance/${form.id}`, payload);
      else await api.post('/dcaos/maintenance', payload);
      setForm(null);
      mutate();
    } catch (err) {
      alert(apiError(err, 'Não foi possível salvar.'));
    } finally {
      setSaving(false);
    }
  };

  const confirmResolve = async () => {
    if (!resolving) return;
    const { item, cost } = resolving;
    setResolving(null);
    await act(item.id, () => api.post(`/dcaos/maintenance/${item.id}/resolve`, { cost: cost || undefined }));
  };

  const edit = (m: Maintenance) => setForm({
    id: m.id, kind: m.kind, title: m.title, description: m.description ?? '', area: m.area ?? '', priority: m.priority,
    assigneeId: m.assigneeId ?? '', professional: m.professional ?? '', cost: m.cost ?? 0, intervalMonths: m.intervalMonths ?? 6, nextDue: m.nextDue ?? '',
  });

  const renderIssue = (m: Maintenance) => {
    const age = daysSince(m.createdAt);
    const p = prio(m.priority);
    return (
      <article key={m.id} className="group rounded-xl border border-border bg-card p-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-semibold text-fg">{m.title}</p>
          <span className={cn('shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', p.cls)}>{p.label}</span>
        </div>
        {m.description && <p className="mt-1 line-clamp-2 text-xs text-fg-muted">{m.description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-fg-muted">
          {m.area && <span className="rounded-md border border-border px-1.5 py-0.5">{m.area}</span>}
          <span className={cn(age >= 7 && 'font-medium text-danger')}>
            {age === 0 ? 'hoje' : `há ${age} dia${age === 1 ? '' : 's'}`}{age >= 7 ? ' · já virou decoração' : ''}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fg-2">
          <span className="flex items-center gap-1"><User size={11} /> {m.assigneeId ? (m.assigneeId === me.id ? 'Você' : firstName(m.assigneeName)) : 'Sem responsável'}</span>
          {m.professional && <span className="flex items-center gap-1"><Hammer size={11} /> {m.professional}</span>}
          {m.cost ? <span className="flex items-center gap-1"><Wallet size={11} /> {fmtBRL(m.cost)}</span> : null}
        </div>
        <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-2.5">
          <select value={m.status} onChange={(e) => act(m.id, () => api.patch(`/dcaos/maintenance/${m.id}`, { status: e.target.value }))}
            disabled={busy === m.id} aria-label="Status" className="field h-7 !w-auto flex-1 !px-2 !text-[11px]">
            {COLUMNS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <button onClick={() => setResolving({ item: m, cost: m.cost ?? 0 })} disabled={busy === m.id} className="btn btn-primary h-7 px-2 text-[11px]">
            {busy === m.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Resolvido
          </button>
          <button onClick={() => edit(m)} aria-label="Editar" className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-accent"><Edit3 size={13} /></button>
          <button onClick={() => { if (confirm(`Excluir "${m.title}"?`)) act(m.id, () => api.delete(`/dcaos/maintenance/${m.id}`)); }}
            aria-label="Excluir" className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-danger-soft hover:text-danger"><Trash2 size={13} /></button>
        </div>
      </article>
    );
  };

  return (
    <div data-tour="dcaos-maintenance-page" className="w-full p-4 md:p-6 space-y-4">
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: 'Problemas abertos', value: String(issues.length), sub: urgent ? `${urgent} urgente${urgent === 1 ? '' : 's'}/alta` : 'nenhum urgente', icon: AlertTriangle, tone: urgent ? 'text-danger' : 'text-fg' },
          { label: 'Em andamento', value: String(issues.filter((i) => i.status === 'in_progress').length), sub: `${issues.filter((i) => i.status === 'waiting').length} aguardando`, icon: Wrench, tone: 'text-fg' },
          { label: 'Preventivas na semana', value: String(dueSoon.length), sub: `${preventive.length} rotina${preventive.length === 1 ? '' : 's'} cadastrada${preventive.length === 1 ? '' : 's'}`, icon: ShieldCheck, tone: dueSoon.length ? 'text-warning' : 'text-fg' },
          { label: `Gasto em ${year}`, value: fmtBRL(spentYear), sub: `${done.length} problema${done.length === 1 ? '' : 's'} resolvido${done.length === 1 ? '' : 's'}`, icon: Wallet, tone: 'text-fg' },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between"><p className="text-[12px] font-medium text-fg-2">{k.label}</p><k.icon size={15} strokeWidth={1.75} className="text-fg-muted" /></div>
            <p className={cn('mt-2 truncate text-2xl font-semibold tabular-nums', k.tone)}>{k.value}</p>
            <p className="mt-1 text-[11px] text-fg-muted">{k.sub}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-fit rounded-lg border border-border bg-surface-2 p-0.5">
          {([['issues', `Deu ruim · ${issues.length}`], ['preventive', `Preventivas · ${preventive.length}`], ['done', `Resolvidos · ${done.length}`]] as [Tab, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={cn('flex h-7 items-center rounded-md border px-3 text-xs font-medium transition-colors', tab === k ? 'bg-card text-fg border-border shadow-xs' : 'text-fg-muted hover:text-fg border-transparent')}>{l}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setForm({ ...EMPTY, kind: 'preventive' })} className="btn btn-secondary"><ShieldCheck size={15} /> Preventiva</button>
          <button onClick={() => setForm({ ...EMPTY })} className="btn btn-primary"><Plus size={15} /> Deu ruim!</button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-accent" /></div>
      ) : tab === 'issues' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {COLUMNS.map((c) => {
            const list = issues.filter((i) => i.status === c.value);
            return (
              <section key={c.value} className="flex flex-col rounded-2xl border border-border bg-surface-2/50">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div><p className="text-sm font-semibold text-fg">{c.label}</p><p className="text-[11px] text-fg-muted">{c.hint}</p></div>
                  <span className="rounded-md bg-card px-1.5 py-0.5 text-xs font-semibold tabular-nums text-fg-2">{list.length}</span>
                </div>
                <div className="space-y-2 p-3">
                  {list.length === 0 ? <p className="py-6 text-center text-xs text-fg-muted">{c.value === 'open' ? 'Nada quebrado. Milagre.' : 'Vazio'}</p>
                    : list.map(renderIssue)}
                </div>
              </section>
            );
          })}
        </div>
      ) : tab === 'preventive' ? (
        preventive.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-14 text-center">
            <p className="text-sm font-medium text-fg">Nenhuma rotina preventiva.</p>
            <p className="text-xs text-fg-muted">Ex: limpar ar-condicionado, trocar filtro de água, revisar o carro. Prevenir é mais barato que o &quot;Deu Ruim&quot;.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {preventive.map((m) => {
              const d = m.nextDue ? daysUntil(m.nextDue) : null;
              return (
                <article key={m.id} className={cn('group flex flex-col gap-3 rounded-2xl border bg-card p-4', d !== null && d < 0 ? 'border-danger/30' : d !== null && d <= 7 ? 'border-warning/30' : 'border-border')}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-fg">{m.title}</p>
                      <p className="text-[11px] text-fg-muted">A cada {m.intervalMonths} {m.intervalMonths === 1 ? 'mês' : 'meses'}{m.area ? ` · ${m.area}` : ''}{m.professional ? ` · ${m.professional}` : ''}</p>
                    </div>
                    <div className="flex opacity-100 md:opacity-0 md:group-hover:opacity-100">
                      <button onClick={() => edit(m)} aria-label="Editar" className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-accent"><Edit3 size={13} /></button>
                      <button onClick={() => { if (confirm(`Excluir "${m.title}"?`)) act(m.id, () => api.delete(`/dcaos/maintenance/${m.id}`)); }}
                        aria-label="Excluir" className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-danger-soft hover:text-danger"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarClock size={14} className="text-fg-muted" />
                    <span className={cn('text-sm font-semibold', d !== null && d < 0 ? 'text-danger' : d !== null && d <= 7 ? 'text-warning' : 'text-fg')}>
                      {m.nextDue ? `${fmtShortDate(m.nextDue)} · ${d! < 0 ? `atrasada ${-d!}d` : d === 0 ? 'hoje' : `em ${d} dias`}` : 'Sem data'}
                    </span>
                  </div>
                  {m.resolvedAt && <p className="text-[11px] text-fg-muted">Última vez: {new Date(m.resolvedAt).toLocaleDateString('pt-BR')}{m.resolvedByName ? ` por ${firstName(m.resolvedByName)}` : ''}</p>}
                  <button onClick={() => setResolving({ item: m, cost: 0 })} disabled={busy === m.id} className="btn btn-secondary mt-auto h-8 text-xs">
                    {busy === m.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Feito! Reagendar
                  </button>
                </article>
              );
            })}
          </div>
        )
      ) : (
        done.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-14 text-center text-[13px] text-fg-muted">Nenhum problema resolvido ainda.</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead><tr className="border-b border-border bg-surface-2 text-left text-xs text-fg-muted">
                <th className="px-4 py-2.5 font-medium">Problema</th><th className="px-3 py-2.5 font-medium">Área</th>
                <th className="px-3 py-2.5 font-medium">Resolvido por</th><th className="px-3 py-2.5 font-medium">Quando</th>
                <th className="px-3 py-2.5 font-medium">Levou</th><th className="px-4 py-2.5 text-right font-medium">Custo</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {done.map((m) => (
                  <tr key={m.id} className="hover:bg-hover">
                    <td className="px-4 py-2.5 font-medium text-fg">{m.title}</td>
                    <td className="px-3 py-2.5 text-fg-2">{m.area ?? '—'}</td>
                    <td className="px-3 py-2.5 text-fg-2">{m.resolvedByName ? firstName(m.resolvedByName) : '—'}{m.professional ? ` · ${m.professional}` : ''}</td>
                    <td className="px-3 py-2.5 tabular-nums text-fg-2">{m.resolvedAt ? new Date(m.resolvedAt).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-3 py-2.5 tabular-nums text-fg-muted">{m.resolvedAt ? `${Math.max(0, Math.floor((new Date(m.resolvedAt).getTime() - new Date(m.createdAt).getTime()) / 86400000))} dias` : '—'}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-fg">{m.cost ? fmtBRL(m.cost) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {resolving && (
        <Modal title={resolving.item.kind === 'preventive' ? 'Manutenção feita' : 'Resolvido!'} onClose={() => setResolving(null)}>
          <div className="space-y-4">
            <p className="text-sm text-fg-2">
              {resolving.item.kind === 'preventive'
                ? `"${resolving.item.title}" será reagendada para daqui a ${resolving.item.intervalMonths} meses.`
                : `"${resolving.item.title}" vai para os resolvidos e a família é avisada.`}
            </p>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg-2">Quanto custou? (opcional)</label>
              <CurrencyInput value={resolving.cost} onChange={(v) => setResolving({ ...resolving, cost: v })} placeholder="0,00" className="field" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setResolving(null)} className="btn btn-secondary flex-1">Cancelar</button>
              <button onClick={confirmResolve} className="btn btn-primary flex-1"><Check size={14} /> Confirmar</button>
            </div>
          </div>
        </Modal>
      )}

      {form && (
        <Modal title={form.id ? 'Editar' : form.kind === 'issue' ? 'Deu ruim!' : 'Nova manutenção preventiva'} onClose={() => setForm(null)}>
          <div className="space-y-4">
            {!form.id && (
              <div className="grid grid-cols-2 gap-1.5">
                {([['issue', 'Algo quebrou', Wrench], ['preventive', 'Preventiva', ShieldCheck]] as const).map(([v, l, I]) => (
                  <button key={v} type="button" onClick={() => setForm({ ...form, kind: v })}
                    className={cn('flex h-9 items-center justify-center gap-1.5 rounded-lg border text-xs font-medium', form.kind === v ? 'border-primary bg-primary-soft text-accent' : 'border-border text-fg-2 hover:bg-hover')}>
                    <I size={14} /> {l}
                  </button>
                ))}
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg-2">{form.kind === 'issue' ? 'O que deu ruim?' : 'Qual manutenção?'}</label>
              <input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={form.kind === 'issue' ? 'Ex: Torneira da cozinha vazando' : 'Ex: Limpar filtro do ar-condicionado'} className="field" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg-2">Onde?</label>
              <div className="flex flex-wrap gap-1.5">
                {AREAS.map((a) => (
                  <button key={a} type="button" onClick={() => setForm({ ...form, area: form.area === a ? '' : a })}
                    className={cn('rounded-md border px-2 py-1 text-[11px] font-medium', form.area === a ? 'border-primary bg-primary-soft text-accent' : 'border-border text-fg-2 hover:bg-hover')}>{a}</button>
                ))}
              </div>
            </div>
            {form.kind === 'issue' ? (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-fg-2">Gravidade</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {PRIORITIES.map((p) => (
                    <button key={p.value} type="button" onClick={() => setForm({ ...form, priority: p.value })}
                      className={cn('h-8 rounded-lg border text-[11px] font-semibold', form.priority === p.value ? p.cls : 'border-border text-fg-2 hover:bg-hover')}>{p.label}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-fg-2">Repetir a cada</label>
                  <select value={form.intervalMonths} onChange={(e) => setForm({ ...form, intervalMonths: Number(e.target.value) })} className="field">
                    {[1, 2, 3, 4, 6, 12, 24].map((m) => <option key={m} value={m}>{m} {m === 1 ? 'mês' : 'meses'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-fg-2">Próxima vez</label>
                  <input type="date" value={form.nextDue} onChange={(e) => setForm({ ...form, nextDue: e.target.value })} className="field" />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-fg-2">Quem resolve?</label>
                <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} className="field">
                  <option value="">Ninguém (ainda)</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.id === me.id ? 'Eu' : firstName(m.name)}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-fg-2">Profissional</label>
                <input value={form.professional} onChange={(e) => setForm({ ...form, professional: e.target.value })} placeholder="Ex: Encanador João" className="field" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg-2">Custo estimado (opcional)</label>
              <CurrencyInput value={form.cost} onChange={(v) => setForm({ ...form, cost: v })} placeholder="0,00" className="field" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg-2">Detalhes</label>
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="field !h-auto resize-none py-2.5" />
            </div>
            {form.kind === 'issue' && !form.id && <p className="text-[11px] text-fg-muted">A família será avisada. Se ficar parado, o sistema cobra a cada 3 dias.</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setForm(null)} className="btn btn-secondary flex-1">Cancelar</button>
              <button onClick={save} disabled={saving || form.title.trim().length < 2} className="btn btn-primary flex-1">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function DcaosMaintenancePage() {
  useAuth();
  return (
    <AppLayout title="Deu Ruim" subtitle="Manutenção da casa · a torneira já virou decoração" noPadding>
      <div className="h-full overflow-y-auto">
        <DcaosGate>
          <Suspense fallback={null}><MaintenanceContent /></Suspense>
        </DcaosGate>
      </div>
    </AppLayout>
  );
}
