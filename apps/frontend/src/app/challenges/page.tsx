'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Trophy, Plus, Edit3, Trash2, Loader2,
  ChevronLeft, ChevronRight, CheckCircle2, X, Flame,
} from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { PlanGate } from '@/components/plan-gate';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const STATUSES = [
  { value: 'Não iniciada', label: 'Pendente',      dot: 'bg-slate-400',   chip: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' },
  { value: 'Em andamento', label: 'Em andamento',  dot: 'bg-amber-500',   chip: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  { value: 'Concluída',    label: 'Concluída',     dot: 'bg-emerald-500', chip: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
];

type Challenge = {
  id: string;
  month: string;
  year: number;
  challenge: string;
  status: string;
  achieved?: string;
  observations?: string;
  userId?: string;
  familyGroupId?: string | null;
};

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dcash:token') : null;
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

function statusMeta(status: string) {
  return STATUSES.find((s) => s.value === status) ?? STATUSES[0];
}

export default function ChallengesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const currentMonth = MONTHS[now.getMonth()];

  const [form, setForm] = useState({
    id: '', month: currentMonth, challenge: '', status: 'Não iniciada', observations: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/challenges?year=${year}`, { headers: getAuthHeaders() });
      if (res.ok) setChallenges(await res.json());
    } catch {}
    setLoading(false);
  }, [year]);

  useEffect(() => { load(); }, [load]);

  function openNew(month: string) {
    setForm({ id: '', month, challenge: '', status: 'Não iniciada', observations: '' });
    setPanelOpen(true);
  }

  function openEdit(c: Challenge) {
    setForm({ id: c.id, month: c.month, challenge: c.challenge, status: c.status, observations: c.observations ?? '' });
    setPanelOpen(true);
  }

  async function save() {
    if (!form.challenge.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/challenges`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: form.id || undefined,
          month: form.month,
          year,
          challenge: form.challenge,
          status: form.status,
          observations: form.observations,
        }),
      });
      if (res.ok) { await load(); setPanelOpen(false); }
    } catch {}
    setSaving(false);
  }

  async function quickStatus(c: Challenge, newStatus: string) {
    try {
      await fetch(`${API}/challenges`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: c.id, month: c.month, year, challenge: c.challenge, status: newStatus, observations: c.observations ?? '' }),
      });
      setChallenges((prev) => prev.map((ch) => ch.id === c.id ? { ...ch, status: newStatus } : ch));
    } catch {}
  }

  async function deleteChallenge(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`${API}/challenges/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (res.ok) setChallenges((prev) => prev.filter((c) => c.id !== id));
    } catch {}
    setDeleting(null);
  }

  const map = new Map(challenges.map((c) => [c.month, c]));
  const completed  = challenges.filter((c) => c.status === 'Concluída').length;
  const inProgress = challenges.filter((c) => c.status === 'Em andamento').length;
  const pct = challenges.length > 0 ? Math.round((completed / challenges.length) * 100) : 0;
  const circumference = 2 * Math.PI * 45;
  const dash = (pct / 100) * circumference;

  return (
    <AppLayout title="Desafios Financeiros" subtitle="Seus objetivos mensais" noPadding>
      <PlanGate feature="financial_challenges">
      <div className="h-full flex flex-col overflow-hidden">

      {/* Frozen zone: stats + year (does not scroll) */}
      <div className="shrink-0 px-6 lg:px-8 pt-6 pb-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Stats card */}
        <div className="lg:col-span-2 rounded-[1.75rem] bg-gradient-to-br from-emerald-950 to-emerald-800 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Flame className="h-3.5 w-3.5 text-emerald-300 animate-pulse" />
                <p className="text-emerald-200 text-[10px] uppercase tracking-widest font-semibold">Performance anual</p>
              </div>
              <h2 className="text-2xl font-bold">{pct}% concluído</h2>
            </div>
            {/* Progress ring */}
            <div className="relative h-12 w-12 shrink-0">
              <svg className="h-12 w-12 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="45" fill="none"
                  stroke="#6ee7b7" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${dash} ${circumference}`}
                  className="transition-all duration-700"
                />
              </svg>
              <Trophy className="absolute inset-0 m-auto h-4 w-4 text-emerald-300" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-emerald-200 text-[10px] uppercase tracking-wide">Registrados</p>
              <p className="text-lg font-bold mt-0.5">{challenges.length}</p>
            </div>
            <div>
              <p className="text-emerald-200 text-[10px] uppercase tracking-wide">Concluídos</p>
              <p className="text-lg font-bold mt-0.5 text-emerald-300">{completed}</p>
            </div>
            <div>
              <p className="text-emerald-200 text-[10px] uppercase tracking-wide">Em andamento</p>
              <p className="text-lg font-bold mt-0.5 text-amber-300">{inProgress}</p>
            </div>
          </div>
        </div>

        {/* Year + action */}
        <div className="rounded-[1.75rem] border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-lg flex flex-col items-center justify-center gap-2.5">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Ano</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ChevronLeft className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            </button>
            <span className="text-xl font-bold text-emerald-950 dark:text-white w-16 text-center">{year}</span>
            <button
              onClick={() => setYear((y) => y + 1)}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ChevronRight className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            </button>
          </div>
          <button
            onClick={() => openNew(currentMonth)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
          >
            <Plus className="h-3.5 w-3.5" /> Novo desafio
          </button>
        </div>
      </div>
      </div>

      {/* Zone: challenges as a 12-month card grid (fits without scrolling on typical screens) */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-6">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MONTHS.map((month) => {
            const c = map.get(month);
            const isCurrent = month === currentMonth && year === now.getFullYear();
            const meta = c ? statusMeta(c.status) : null;
            return (
              <div
                key={month}
                className={`group rounded-2xl border p-4 flex flex-col gap-3 transition-colors ${
                  isCurrent
                    ? 'border-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/20 dark:border-emerald-700'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                {/* Month header */}
                <div className="flex items-center justify-between gap-1">
                  <span className={`font-bold text-xs uppercase tracking-wide ${c ? 'text-emerald-950 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                    {month}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 uppercase tracking-wide shrink-0">
                      Atual
                    </span>
                  )}
                </div>

                {c ? (
                  <>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line line-clamp-5 flex-1">
                      {c.challenge}
                    </p>

                    <select
                      value={c.status}
                      onChange={(e) => quickStatus(c, e.target.value)}
                      className={`text-[10px] font-semibold px-2 py-1.5 rounded-full border-0 outline-none cursor-pointer w-full ${meta?.chip}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                          {s.label}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-2 rounded-lg text-slate-400 hover:bg-emerald-50 dark:hover:bg-slate-800 hover:text-emerald-600 transition"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteChallenge(c.id)}
                        disabled={deleting === c.id}
                        className="p-2 rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 disabled:opacity-50 transition"
                      >
                        {deleting === c.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />
                        }
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-slate-300 dark:text-slate-600 italic flex-1">
                      Sem desafio
                    </p>
                    <button
                      onClick={() => openNew(month)}
                      className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-semibold text-emerald-600
                                 border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-50 dark:hover:bg-slate-800 transition"
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>
      </div>

      {/* Slide-over panel */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setPanelOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                  {form.id ? 'Editar desafio' : 'Novo desafio'}
                </p>
                <h2 className="text-lg font-bold text-emerald-950 dark:text-white mt-0.5">{form.month} · {year}</h2>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {/* Month (only new) */}
              {!form.id && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Mês</label>
                  <select
                    value={form.month}
                    onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm font-medium text-emerald-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}

              {/* Challenge */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Desafio / Objetivo</label>
                <textarea
                  rows={5}
                  value={form.challenge}
                  onChange={(e) => setForm((f) => ({ ...f, challenge: e.target.value }))}
                  placeholder={'Ex:\n🎯 Desafios:\n✅ Registrar 100% das receitas'}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5
                             text-sm text-emerald-950 dark:text-white placeholder:text-slate-400
                             focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Status</label>
                <div className="flex flex-col gap-1.5">
                  {STATUSES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, status: s.value }))}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 text-xs font-semibold transition text-left
                        ${form.status === s.value
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'
                        }`}
                    >
                      <div className={`h-2 w-2 rounded-full shrink-0 ${s.dot}`} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Observations */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Observações (opcional)</label>
                <textarea
                  rows={2}
                  value={form.observations}
                  onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
                  placeholder="Anotações sobre este desafio..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5
                             text-sm text-emerald-950 dark:text-white placeholder:text-slate-400
                             focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={save}
                disabled={saving || !form.challenge.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-950 px-4 py-3
                           text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {form.id ? 'Salvar alterações' : 'Criar desafio'}
              </button>
            </div>
          </div>
        </>
      )}
      </PlanGate>
    </AppLayout>
  );
}
