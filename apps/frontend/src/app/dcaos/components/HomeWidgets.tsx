'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Caveat } from 'next/font/google';
import useSWR from 'swr';
import api from '@/services/api';
import { cn } from '@/lib/utils';
import { Check, Loader2, Plus, Send, ShoppingBasket, SmilePlus, StickyNote } from '@/components/ui/icons';
import { apiError, firstName, type Member, type Note, type PantryItem, type Task } from '../lib/dcaos';
import { fmtQty, guessItem, parseQuickAdd } from '../lib/units';

/* Handwriting is an illustration style for the paper notes only (theme stays Inter). */
const hand = Caveat({ subsets: ['latin'], weight: ['500', '700'], display: 'swap' });

/* Person colors from the theme's categorical series; shared items use the brand color. */
const PERSON_COLORS = ['var(--series-3)', 'var(--series-2)', 'var(--series-4)', 'var(--series-5)'];
export const SHARED_COLOR = 'var(--primary)';
export const personColor = (members: Member[], id?: string | null) => {
  const i = members.findIndex((m) => m.id === id);
  return i >= 0 ? PERSON_COLORS[i % PERSON_COLORS.length] : SHARED_COLOR;
};

/* Paper surfaces (illustration palette, same in both themes) */
const PAPER = 'bg-[#fbf7ee] text-[#3b2f2a] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45)]';
const INK_SOFT = 'text-[#8a7a70]';

function Tape({ className }: { className?: string }) {
  return <span aria-hidden className={cn('absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-[-2deg] rounded-sm bg-[#e9b9a3]/70 backdrop-blur-[1px]', className)} />;
}

// ── Mercado da semana (paper shopping list) ──────────────────────────────

export function ShoppingNote({ members }: { members: Member[] }) {
  const { data: items = [], mutate } = useSWR<PantryItem[]>('/dcaos/market');
  const [busy, setBusy] = useState<string | null>(null);
  const [text, setText] = useState('');
  const list = items.filter((i) => i.onList).sort((a, b) => Number(a.checked) - Number(b.checked));
  const inCart = list.filter((i) => i.checked).length;

  const toggle = async (i: PantryItem) => {
    setBusy(i.id);
    mutate((prev) => prev?.map((x) => (x.id === i.id ? { ...x, checked: !x.checked } : x)), { revalidate: false });
    try { await api.patch(`/dcaos/market/${i.id}`, { checked: !i.checked }); } catch { mutate(); } finally { setBusy(null); }
  };

  const add = async () => {
    const p = parseQuickAdd(text);
    if (!p.name.trim()) return;
    const guess = guessItem(p.name);
    setBusy('new');
    try {
      await api.post('/dcaos/market', {
        name: p.name.trim(), onList: true, listQuantity: p.quantity ?? 1,
        unit: p.unit ?? guess?.unit ?? 'un', category: guess?.category,
      });
      setText('');
      mutate();
    } catch (err) {
      alert(apiError(err, 'Não foi possível anotar.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative rotate-[-0.6deg] rounded-2xl border border-border bg-card px-6 pb-5 pt-7 text-fg shadow-lg">
      <Tape className="bg-primary/25" />
      <div className="flex items-start justify-between">
        <div>
          <p className={cn(hand.className, 'text-[30px] font-bold leading-none text-accent')}>Mercado da semana</p>
          <p className="mt-1 text-xs text-fg-muted">{list.length ? `${inCart} de ${list.length} no carrinho` : 'Lista vazia. Por enquanto.'}</p>
        </div>
        <Link href="/dcaos/mercado" aria-label="Abrir mercado" className="text-accent transition-transform hover:scale-110">
          <ShoppingBasket size={20} />
        </Link>
      </div>

      <ul className="mt-3 divide-y divide-border border-y border-border">
        {list.slice(0, 7).map((i) => (
          <li key={i.id} className="flex items-center gap-3 py-2">
            <button onClick={() => toggle(i)} disabled={busy === i.id} aria-label={i.checked ? 'Desmarcar' : 'Peguei'}
              className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] border-2 transition-colors',
                i.checked ? 'border-primary bg-primary text-on-primary' : 'border-border-hover hover:border-primary hover:bg-primary-soft')}>
              {i.checked && <Check size={14} strokeWidth={3} />}
            </button>
            <span className={cn('min-w-0 flex-1 truncate', i.checked && 'text-fg-muted line-through decoration-accent decoration-2')}>
              <span className={cn(hand.className, 'text-[22px] font-bold leading-none')}>{i.name}</span>
              <span className="ml-1.5 text-xs text-fg-muted">· {fmtQty(i.listQuantity, i.unit)}</span>
            </span>
            <span className="h-2 w-2 shrink-0 rounded-full" title={i.addedByName ? `Anotado por ${firstName(i.addedByName)}` : undefined}
              style={{ backgroundColor: personColor(members, i.addedBy) }} />
          </li>
        ))}
        {list.length > 7 && (
          <li className="py-2 text-center text-xs text-fg-muted">
            <Link href="/dcaos/mercado" className="underline">+{list.length - 7} itens na lista</Link>
          </li>
        )}
      </ul>

      <div className="mt-3 flex items-center gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="anotar: 2 kg açúcar..."
          className={cn(hand.className, 'min-w-0 flex-1 border-b border-dashed border-border-hover bg-transparent pb-0.5 text-[20px] text-fg outline-none placeholder:text-fg-disabled focus:border-primary')} />
        <button onClick={add} disabled={!text.trim() || busy === 'new'} aria-label="Anotar"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-40">
          {busy === 'new' ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />}
        </button>
      </div>
      <p className={cn(hand.className, 'mt-3 text-center text-[17px] text-fg-muted')}>Toque pra marcar o que já foi</p>
    </div>
  );
}

// ── Bilhetinhos (handwritten family notes) ───────────────────────────────

const NOTE_TINT: Record<Note['color'], string> = {
  yellow: 'bg-[#fdf3c8]', green: 'bg-[#e3f1e6]', blue: 'bg-[#e2ecf8]', pink: 'bg-[#f9e1e4]', purple: 'bg-[#fbf7ee]',
};
const TILTS = ['rotate-[-1.5deg]', 'rotate-[1deg]', 'rotate-[-0.5deg]', 'rotate-[1.5deg]'];

/** Quick reactions (WhatsApp/Instagram style): one per person, tap again to remove. */
let burstSeq = 0;
export const NOTE_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '😡'];
const REACTION_LABEL: Record<string, string> = { '❤️': 'Amei', '👍': 'Curti', '😂': 'Haha', '😮': 'Uau', '😢': 'Triste', '😡': 'Bravo' };

/**
 * Toggles `emoji` for `meId` keeping a single reaction per person.
 * Returns the optimistic note plus the emojis to send to the toggle endpoint.
 */
export function applyReaction(n: Note, meId: string, emoji: string) {
  const reactions: Record<string, string[]> = {};
  const calls: string[] = [];
  let had = false;
  for (const [e, users] of Object.entries(n.reactions ?? {})) {
    const mine = users.includes(meId);
    if (e === emoji && mine) had = true;
    if (mine) calls.push(e); // remove previous (or the same one = toggle off)
    const rest = users.filter((u) => u !== meId);
    if (rest.length) reactions[e] = rest;
  }
  if (!had) {
    reactions[emoji] = [...(reactions[emoji] ?? []), meId];
    calls.push(emoji);
  }
  return { note: { ...n, reactions }, calls };
}

export function NotesWall({ members, meId }: { members: Member[]; meId: string }) {
  const { data: notes = [], mutate } = useSWR<Note[]>('/dcaos/notes');
  const [message, setMessage] = useState('');
  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  /* Notes addressed to me or to the whole family (my own family notes included), not read yet.
     Only "Li" takes them off the panel; read ones live in /dcaos/recados → Meus bilhetes. */
  const forMe = notes.filter((n) => !!meId && (!n.recipientId || n.recipientId === meId));
  const pending = forMe.filter((n) => !n.read);
  const shown = pending.slice(0, 3);
  const archived = forMe.filter((n) => n.read).length;

  const [picker, setPicker] = useState<string | null>(null);
  const [burst, setBurst] = useState<{ id: string; emoji: string; k: number } | null>(null);

  const react = async (n: Note, emoji: string) => {
    setPicker(null);
    const { note, calls } = applyReaction(n, meId, emoji);
    if (note.reactions[emoji]?.includes(meId)) setBurst({ id: n.id, emoji, k: ++burstSeq });
    mutate((prev) => prev?.map((x) => (x.id === n.id ? note : x)), { revalidate: false });
    try {
      for (const e of calls) await api.post(`/dcaos/notes/${n.id}/react`, { emoji: e });
    } catch { mutate(); }
  };

  const markRead = async (id: string) => {
    setLeaving((s) => new Set(s).add(id));
    setTimeout(() => {
      mutate((prev) => prev?.map((n) => (n.id === id ? { ...n, read: true, readCount: n.readCount + (n.authorId === meId ? 0 : 1) } : n)), { revalidate: false });
      setLeaving((s) => { const next = new Set(s); next.delete(id); return next; });
    }, 300);
    try { await api.post(`/dcaos/notes/${id}/read`); } catch { mutate(); }
  };

  const send = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.post('/dcaos/notes', { message: message.trim(), recipientId: to || null, color: 'yellow' });
      setMessage('');
      mutate();
    } catch (err) {
      alert(apiError(err, 'Não foi possível enviar.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <style>{`
        @keyframes dcash-pop { from { opacity: 0; transform: translateY(6px) scale(.6); } to { opacity: 1; transform: none; } }
        @keyframes dcash-burst { 0% { opacity: 0; transform: scale(.3); } 25% { opacity: 1; transform: scale(1.25); } 60% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.1) translateY(-12px); } }
      `}</style>
      <div className="space-y-4 pt-1">
        {shown.length === 0 ? (
          <div className={cn('rounded-md px-5 py-4', PAPER, TILTS[0])}>
            <p className={cn(hand.className, 'text-[24px] leading-tight')}>
              {archived > 0 ? 'Tudo lido por aqui. Os bilhetes ficam guardados no mural.' : 'Ninguém deixou recado ainda. Seja o primeiro a mandar um "te amo" (ou um "lava a louça").'}
            </p>
            {archived > 0 && (
              <Link href="/dcaos/recados" className={cn(hand.className, 'mt-1 block text-right text-[19px] underline', INK_SOFT)}>ver meus bilhetes ({archived})</Link>
            )}
          </div>
        ) : shown.map((n, i) => {
          const isNew = !n.read;
          const mine = n.authorId === meId;
          return (
            <div key={n.id} className={cn('group relative rounded-md px-5 py-4 text-[#3b2f2a] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45)] transition-all duration-300',
              NOTE_TINT[n.color] ?? NOTE_TINT.yellow, TILTS[i % TILTS.length], leaving.has(n.id) && 'pointer-events-none translate-x-6 rotate-6 opacity-0')}>
              {isNew && !mine && <span className="absolute -right-2 -top-2 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase text-on-primary">novo</span>}
              <p onDoubleClick={() => { if (!n.reactions?.['❤️']?.includes(meId)) react(n, '❤️'); }} title="Toque duas vezes para amar"
                className={cn(hand.className, 'cursor-default select-none break-words text-[25px] leading-tight')}>{n.message}</p>
              {burst?.id === n.id && (
                <span key={burst.k} aria-hidden onAnimationEnd={() => setBurst(null)}
                  className="pointer-events-none absolute inset-0 flex items-center justify-center text-6xl animate-[dcash-burst_700ms_ease-out_forwards]">
                  {burst.emoji}
                </span>
              )}
              {/* Reactions */}
              <div className="relative mt-2 flex flex-wrap items-center gap-1">
                {Object.entries(n.reactions ?? {}).map(([emoji, users]) => {
                  const mine = users.includes(meId);
                  const who = users.map((u) => (u === meId ? 'você' : firstName(members.find((m) => m.id === u)?.name ?? ''))).filter(Boolean).join(', ');
                  return (
                    <button key={emoji} onClick={() => react(n, emoji)} title={`${REACTION_LABEL[emoji] ?? emoji}: ${who}`}
                      className={cn('inline-flex h-6 items-center gap-1 rounded-full border px-1.5 text-xs transition-transform hover:scale-105',
                        mine ? 'border-[#3b2f2a]/40 bg-white/80' : 'border-[#3b2f2a]/15 bg-white/40')}>
                      <span className="leading-none">{emoji}</span>
                      <span className="text-[10px] font-semibold tabular-nums text-[#3b2f2a]">{users.length}</span>
                    </button>
                  );
                })}
                <button onClick={() => setPicker(picker === n.id ? null : n.id)} aria-label="Reagir" aria-expanded={picker === n.id}
                  className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[#8a7a70] transition-all hover:bg-white/60 hover:text-[#3b2f2a]',
                    picker === n.id ? 'bg-white/70 text-[#3b2f2a]' : 'opacity-70 group-hover:opacity-100')}>
                  <SmilePlus size={14} />
                </button>
                {isNew && (
                  <button onClick={() => markRead(n.id)} title="Marcar como lido"
                    className="flex h-6 shrink-0 items-center gap-1 rounded-full border border-[#3b2f2a]/25 bg-white/50 px-2 text-[11px] font-semibold text-[#3b2f2a] transition-colors hover:border-[#3b2f2a]/50 hover:bg-white/80">
                    <Check size={12} strokeWidth={2.5} /> Li
                  </button>
                )}
                <p className={cn(hand.className, 'ml-auto pl-2 text-right text-[19px] leading-none', INK_SOFT)}>
                  — {mine ? 'você' : firstName(n.authorName)}{n.recipientId ? ` pra ${n.recipientId === meId ? 'você' : firstName(n.recipientName)}` : ''}
                </p>

                {picker === n.id && (
                  <>
                    <button aria-label="Fechar reações" className="fixed inset-0 z-10 cursor-default" onClick={() => setPicker(null)} />
                    <div role="menu" className="absolute bottom-8 left-0 z-20 flex items-center gap-0.5 rounded-full border border-border bg-card px-1.5 py-1 shadow-xl animate-[dcash-pop_160ms_ease-out]">
                      {NOTE_REACTIONS.map((emoji, k) => {
                        const on = n.reactions?.[emoji]?.includes(meId);
                        return (
                          <button key={emoji} role="menuitem" onClick={() => react(n, emoji)} title={REACTION_LABEL[emoji]}
                            style={{ animationDelay: `${k * 30}ms` }}
                            className={cn('flex h-9 w-9 items-center justify-center rounded-full text-[22px] transition-transform duration-150 hover:-translate-y-1 hover:scale-125 animate-[dcash-pop_220ms_ease-out_both]',
                              on && 'bg-primary-soft')}>
                            {emoji}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {pending.length > shown.length && (
          <Link href="/dcaos/recados" className="block text-center text-[11px] font-semibold text-accent hover:underline">
            +{pending.length - shown.length} bilhete{pending.length - shown.length > 1 ? 's' : ''} no mural
          </Link>
        )}
      </div>

      <div className="mt-5 space-y-2 border-t border-border pt-4">
        <textarea rows={2} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder="Escreva um bilhetinho... Ex: Passa no mercado? Acabou o café. Te amo."
          className="field !h-auto resize-none py-2.5 !text-[13px]" />
        <div className="flex items-center gap-2">
          <select value={to} onChange={(e) => setTo(e.target.value)} aria-label="Para quem" className="field h-8 !w-auto flex-1 !text-xs">
            <option value="">Pra família toda</option>
            {members.filter((m) => m.id !== meId).map((m) => <option key={m.id} value={m.id}>Pra {firstName(m.name)}</option>)}
          </select>
          <button onClick={send} disabled={sending || !message.trim()} className="btn btn-primary h-8 px-3 text-xs">
            {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Enviar
          </button>
        </div>
        <Link href="/dcaos/recados" className="flex items-center justify-end gap-1 pt-1 text-[11px] font-semibold text-accent hover:underline">
          <StickyNote size={11} /> Ver mural de recados →
        </Link>
      </div>
    </section>
  );
}

// ── Família hoje (who has tasks due) ─────────────────────────────────────

export function FamilyToday({ members, meId, tasks, today, onComplete, busy }: {
  members: Member[]; meId: string; tasks: Task[]; today: string;
  onComplete: (t: Task) => void; busy: string | null;
}) {
  const due = tasks.filter((t) => !t.isCompleted && t.dueDate && t.dueDate <= today);
  const people = [...members.map((m) => ({ id: m.id, name: m.name })), { id: '', name: 'Sem dono' }]
    .map((p) => ({ ...p, tasks: due.filter((t) => (t.assigneeId ?? '') === p.id) }))
    .filter((p) => p.id !== '' || p.tasks.length > 0)
    .sort((a, b) => (a.id === meId ? -1 : b.id === meId ? 1 : b.tasks.length - a.tasks.length));

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-fg">Quem tem o que fazer hoje</p>
        <Link href="/dcaos/tarefas" className="text-[11px] font-semibold text-accent hover:underline">Todas</Link>
      </div>
      {due.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-fg-muted">Ninguém tem nada pra hoje. Desconfie.</p>
      ) : (
        <ul className="space-y-3">
          {people.map((p) => (
            <li key={p.id || 'none'} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: p.id ? personColor(members, p.id) : 'var(--text-muted)' }}>
                {p.id ? firstName(p.name).charAt(0).toUpperCase() : '?'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-fg">
                  {p.id === meId ? 'Você' : p.id ? firstName(p.name) : 'Sem dono'}
                  <span className="ml-1.5 text-xs font-normal text-fg-muted">
                    {p.tasks.length === 0 ? 'livre hoje 🎉' : `${p.tasks.length} tarefa${p.tasks.length === 1 ? '' : 's'}`}
                  </span>
                </p>
                {p.tasks.length > 0 && (
                  <ul className="mt-1 space-y-1">
                    {p.tasks.slice(0, 3).map((t) => (
                      <li key={t.id} className="flex items-center gap-2">
                        <button onClick={() => onComplete(t)} disabled={busy === t.id} aria-label="Concluir"
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border-hover text-transparent hover:border-primary hover:text-accent">
                          {busy === t.id ? <Loader2 size={10} className="animate-spin text-fg-muted" /> : <Check size={10} strokeWidth={3} />}
                        </button>
                        <span className={cn('truncate text-xs', t.dueDate && t.dueDate < today ? 'text-danger' : 'text-fg-2')}>
                          {t.title}{t.dueDate && t.dueDate < today ? ' · atrasada' : ''}
                        </span>
                      </li>
                    ))}
                    {p.tasks.length > 3 && <li className="text-[11px] text-fg-muted">+{p.tasks.length - 3} mais</li>}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Mini calendar with per-person dots + day timeline ────────────────────

type CalEvent = { id: string; title: string; description?: string | null; startDate: string; endDate?: string | null; allDay: boolean; participantIds?: string[] };
type CalItem = { id: string; kind: string; date: string; title: string; subtitle?: string | null };

const localIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function MiniCalendar({ members, meId }: { members: Member[]; meId: string }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const todayIso = localIso(now);
  const [selected, setSelected] = useState(todayIso);
  const { data: cal } = useSWR<{ events: CalEvent[] }>(`/calendar-events/monthly?month=${month}&year=${year}`);
  const { data: house = [] } = useSWR<CalItem[]>(`/dcaos/calendar?month=${month}&year=${year}`);

  const eventColor = (e: CalEvent) =>
    e.participantIds && e.participantIds.length === 1 ? personColor(members, e.participantIds[0]) : SHARED_COLOR;

  const byDay = useMemo(() => {
    const map: Record<string, { events: CalEvent[]; dates: CalItem[] }> = {};
    (cal?.events ?? []).forEach((e) => { (map[localIso(new Date(e.startDate))] ||= { events: [], dates: [] }).events.push(e); });
    house.filter((h) => h.kind === 'date').forEach((h) => { (map[h.date] ||= { events: [], dates: [] }).dates.push(h); });
    return map;
  }, [cal, house]);

  const first = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const cells = Array.from({ length: Math.ceil((first + days) / 7) * 7 }, (_, i) => {
    const d = i - first + 1;
    return d >= 1 && d <= days ? localIso(new Date(year, month - 1, d)) : null;
  });
  const sel = byDay[selected];
  const timeline = [...(sel?.events ?? [])].sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate));
  const label = new Date(`${selected}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="grid grid-cols-7 text-center">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <span key={i} className="pb-2 text-[11px] font-medium text-fg-muted">{d}</span>)}
        {cells.map((iso, i) => {
          if (!iso) return <span key={i} />;
          const info = byDay[iso];
          const dots = [
            ...(info?.events ?? []).map((e) => eventColor(e)),
            ...(info?.dates ?? []).map(() => 'var(--warning)'),
          ].slice(0, 3);
          const isToday = iso === todayIso;
          const isSel = iso === selected;
          return (
            <button key={iso} onClick={() => setSelected(iso)}
              className={cn('mx-auto my-0.5 flex h-11 w-11 flex-col items-center justify-center rounded-xl text-sm tabular-nums transition-colors',
                isToday ? 'bg-primary font-bold text-on-primary' : isSel ? 'bg-primary-soft font-semibold text-accent' : 'text-fg hover:bg-hover')}>
              {Number(iso.slice(8))}
              <span className="mt-0.5 flex h-1.5 gap-0.5">
                {dots.map((c, j) => <span key={j} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: isToday ? 'var(--on-primary)' : c }} />)}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-fg-muted">
        {members.map((m) => (
          <span key={m.id} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: personColor(members, m.id) }} />{m.id === meId ? 'Você' : firstName(m.name)}</span>
        ))}
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: SHARED_COLOR }} />Compartilhado</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" />Data</span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-base font-semibold text-fg">{selected === todayIso ? `Hoje, ${label}` : label}</p>
        <Link href="/calendar" className="text-xs font-semibold text-accent hover:underline">Marcar</Link>
      </div>
      <div className="mt-2 overflow-hidden rounded-xl border border-border">
        {timeline.length === 0 && !(sel?.dates.length) ? (
          <p className="px-4 py-5 text-center text-xs text-fg-muted">Nada marcado. Dia perfeito pra não fazer nada (ou lavar a louça).</p>
        ) : (
          <ul className="divide-y divide-border">
            {sel?.dates.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-11 shrink-0 text-xs font-semibold text-warning">🎂</span>
                <span className="h-8 w-1 shrink-0 rounded-full bg-warning" />
                <div className="min-w-0"><p className="truncate text-[13px] font-medium text-fg">{d.title}</p><p className="text-[11px] text-fg-muted">{d.subtitle}</p></div>
              </li>
            ))}
            {timeline.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-11 shrink-0 text-xs font-semibold tabular-nums text-fg">
                  {e.allDay ? 'Dia' : new Date(e.startDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: eventColor(e) }} />
                <div className="min-w-0"><p className="truncate text-[13px] font-medium text-fg">{e.title}</p>{e.description && <p className="truncate text-[11px] text-fg-muted">{e.description}</p>}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
