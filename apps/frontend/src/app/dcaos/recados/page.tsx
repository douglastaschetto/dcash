'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { AppLayout } from '@/components/app-layout';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { cn } from '@/lib/utils';
import { Archive, CheckCheck, Check, Eye, Inbox, Loader2, Lock, Pin, PinOff, Search, Send, SendHorizontal, Trash2, Users } from '@/components/ui/icons';
import { DcaosGate } from '../components/DcaosGate';
import { NOTE_REACTIONS, applyReaction } from '../components/HomeWidgets';
import { apiError, firstName, timeAgo, useMe, type Home, type Note } from '../lib/dcaos';

/* Post-it colors mapped onto the semantic palette so both themes work */
const COLORS: Record<Note['color'], { label: string; card: string; dot: string }> = {
  yellow: { label: 'Atenção',  card: 'bg-warning-soft border-warning/30', dot: 'bg-warning' },
  green:  { label: 'Boa notícia', card: 'bg-primary-soft border-primary-border', dot: 'bg-primary' },
  blue:   { label: 'Info',     card: 'bg-info-soft border-info/30', dot: 'bg-info' },
  pink:   { label: 'Urgente',  card: 'bg-danger-soft border-danger/30', dot: 'bg-danger' },
  purple: { label: 'Neutro',   card: 'bg-card border-border', dot: 'bg-fg-muted' },
};
const REACTIONS = NOTE_REACTIONS;

type Tab = 'novos' | 'meus' | 'enviados';
const TABS: { key: Tab; label: string; icon: React.ElementType; empty: [string, string] }[] = [
  { key: 'novos', label: 'Mural', icon: Inbox, empty: ['Tudo lido por aqui.', 'Os recados que você já leu ficam guardados em "Meus bilhetes".'] },
  { key: 'meus', label: 'Meus bilhetes', icon: Archive, empty: ['Nenhum bilhete guardado.', 'Quando você marcar um recado como lido, ele vem pra cá.'] },
  { key: 'enviados', label: 'Enviados', icon: SendHorizontal, empty: ['Você ainda não mandou recado.', 'Escreva ali em cima, a família agradece (ou não).'] },
];

function NotesContent() {
  const params = useSearchParams();
  const { data: notes = [], mutate, isLoading } = useSWR<Note[]>('/dcaos/notes');
  const { data: home } = useSWR<Home>('/dcaos/home');
  const [message, setMessage] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [color, setColor] = useState<Note['color']>('yellow');
  const [pinned, setPinned] = useState(false);
  const [sending, setSending] = useState(false);
  const { id: myId } = useMe();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<Tab>('novos');
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');

  useEffect(() => { if (params.get('novo') === '1') inputRef.current?.focus(); }, [params]);

  /* Unread notes stay on the wall (pinned ones too, since pinning means "keep it visible");
     once read they move to "Meus bilhetes". Own notes live in "Enviados". */
  const received = notes.filter((n) => !n.recipientId || n.recipientId === myId);
  const wall = received.filter((n) => !n.read || n.pinned);
  const archive = received.filter((n) => n.read);
  const sent = notes.filter((n) => n.authorId === myId);
  const unreadCount = received.filter((n) => !n.read).length;
  const lists: Record<Tab, Note[]> = { novos: wall, meus: archive, enviados: sent };
  const q = query.trim().toLowerCase();
  const visible = lists[tab].filter((n) => !q || n.message.toLowerCase().includes(q) || (n.authorName ?? '').toLowerCase().includes(q));

  const setRead = (ids: string[]) => mutate((prev) => prev?.map((n) => (ids.includes(n.id) ? { ...n, read: true, readCount: n.readCount + (n.authorId === myId ? 0 : 1) } : n)), { revalidate: false });

  /** Fade the card out, then file it under "Meus bilhetes". */
  const markRead = async (id: string) => {
    setLeaving((s) => new Set(s).add(id));
    setTimeout(() => {
      setRead([id]);
      setLeaving((s) => { const next = new Set(s); next.delete(id); return next; });
    }, 280);
    try { await api.post(`/dcaos/notes/${id}/read`); } catch { mutate(); }
  };

  const markAllRead = async () => {
    const ids = received.filter((n) => !n.read).map((n) => n.id);
    if (!ids.length) return;
    setLeaving(new Set(ids.filter((id) => !notes.find((n) => n.id === id)?.pinned)));
    setTimeout(() => { setRead(ids); setLeaving(new Set()); }, 280);
    try { await api.post('/dcaos/notes/read-all'); } catch { mutate(); }
  };

  const members = home?.members ?? [];

  const send = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.post('/dcaos/notes', { message: message.trim(), recipientId: recipientId || null, color, pinned });
      setMessage(''); setPinned(false);
      mutate();
    } catch (err) {
      alert(apiError(err, 'Não foi possível enviar o recado.'));
    } finally {
      setSending(false);
    }
  };

  const react = async (id: string, emoji: string) => {
    const n = notes.find((x) => x.id === id);
    if (!n) return;
    const { note, calls } = applyReaction(n, myId, emoji);
    mutate((prev) => prev?.map((x) => (x.id === id ? note : x)), { revalidate: false });
    try {
      for (const e of calls) await api.post(`/dcaos/notes/${id}/react`, { emoji: e });
    } catch { mutate(); }
  };

  return (
    <div className="w-full p-4 md:p-6 space-y-4">
      {/* Composer */}
      <section data-tour="dcaos-notes-composer" className="rounded-2xl border border-border bg-card p-4">
        <textarea
          ref={inputRef}
          rows={2}
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); }}
          placeholder="Deixe um recado... Ex: Quem comeu o último pedaço de bolo, apareça."
          className="w-full resize-none bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted"
        />
        <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)} aria-label="Para quem" className="field h-8 !w-auto !text-xs">
              <option value="">Para: família toda</option>
              {members.filter((m) => m.id !== myId).map((m) => <option key={m.id} value={m.id}>Para: {firstName(m.name)}</option>)}
            </select>
            <div className="flex items-center gap-1 rounded-lg border border-border px-1.5 py-1">
              {(Object.keys(COLORS) as Note['color'][]).map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} title={COLORS[c].label} aria-label={COLORS[c].label}
                  className={cn('h-5 w-5 rounded-full border-2 transition', COLORS[c].dot, color === c ? 'border-fg' : 'border-transparent opacity-70 hover:opacity-100')} />
              ))}
            </div>
            <button type="button" onClick={() => setPinned((p) => !p)}
              className={cn('flex h-8 items-center gap-1 rounded-lg border px-2 text-xs font-medium transition-colors',
                pinned ? 'border-primary bg-primary-soft text-accent' : 'border-border text-fg-2 hover:bg-hover')}>
              <Pin size={12} /> Fixar
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] tabular-nums text-fg-muted">{message.length}/500</span>
            <button onClick={send} disabled={sending || !message.trim()} className="btn btn-primary">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar recado
            </button>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex flex-col gap-2 border-b border-border sm:flex-row sm:items-end sm:justify-between">
        <div data-tour="dcaos-notes-tabs" className="-mb-px flex overflow-x-auto scrollbar-none" role="tablist">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            const count = key === 'novos' ? unreadCount : lists[key].length;
            return (
              <button key={key} role="tab" aria-selected={active} onClick={() => setTab(key)}
                className={cn('group flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors',
                  active ? 'border-primary text-fg' : 'border-transparent text-fg-muted hover:border-border-hover hover:text-fg')}>
                <Icon size={15} strokeWidth={1.75} className={active ? 'text-accent' : 'text-fg-muted group-hover:text-fg-2'} />
                {label}
                <span className={cn('min-w-5 rounded-full px-1.5 py-px text-center text-[10px] font-semibold tabular-nums',
                  key === 'novos' && count > 0 ? 'bg-primary text-on-primary' : active ? 'bg-primary-soft text-accent' : 'bg-surface-2 text-fg-muted')}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 pb-2">
          {tab !== 'novos' && (
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar bilhete..."
                className="h-8 w-48 rounded-lg border border-border bg-card pl-8 pr-2 text-xs text-fg outline-none placeholder:text-fg-muted focus:border-primary" />
            </div>
          )}
          {tab === 'novos' && unreadCount > 1 && (
            <button onClick={markAllRead} className="btn btn-secondary h-8 text-xs"><CheckCheck size={13} /> Marcar todos como lidos</button>
          )}
        </div>
      </div>

      {/* Notes */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-accent" /></div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-14 text-center">
          <p className="text-sm font-medium text-fg">{q ? 'Nada encontrado.' : TABS.find((t) => t.key === tab)!.empty[0]}</p>
          <p className="text-xs text-fg-muted">{q ? 'Tente outra palavra.' : TABS.find((t) => t.key === tab)!.empty[1]}</p>
          {tab === 'novos' && archive.length > 0 && (
            <button onClick={() => setTab('meus')} className="mt-3 text-xs font-semibold text-accent hover:underline">Ver meus bilhetes ({archive.length}) →</button>
          )}
        </div>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4 min-[1900px]:columns-5 [&>*]:mb-4">
          {visible.map((n) => {
            const style = COLORS[n.color] ?? COLORS.yellow;
            const isNew = !n.read && (tab !== 'enviados' || !n.recipientId);
            const mine = n.authorId === myId;
            return (
              <article key={n.id} className={cn('group break-inside-avoid rounded-2xl border p-4 transition-all duration-300', style.card, isNew && 'ring-2 ring-primary',
                leaving.has(n.id) && 'pointer-events-none -translate-y-2 scale-95 opacity-0')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card text-[11px] font-semibold text-fg ring-1 ring-border">
                      {firstName(n.authorName).charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-fg">{mine ? 'Você' : firstName(n.authorName)}</p>
                      <p className="flex items-center gap-1 text-[10px] text-fg-muted">
                        {n.recipientId ? <><Lock size={9} /> para {n.recipientId === myId ? 'você' : firstName(n.recipientName)}</> : <><Users size={9} /> família</>}
                        <span>· {timeAgo(n.createdAt)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    {n.pinned && <Pin size={13} className="text-accent" />}
                    {isNew && <span className="rounded bg-primary px-1 text-[9px] font-bold uppercase text-on-primary">novo</span>}
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-line break-words text-[14px] leading-relaxed text-fg">{n.message}</p>

                <div className="mt-3 flex flex-wrap items-center gap-1">
                  {Array.from(new Set([...REACTIONS, ...Object.keys(n.reactions ?? {})])).map((emoji) => {
                    const users = n.reactions?.[emoji] ?? [];
                    const active = users.includes(myId);
                    if (users.length === 0) {
                      return (
                        <button key={emoji} onClick={() => react(n.id, emoji)}
                          className="hidden h-6 rounded-md px-1 text-xs opacity-60 hover:bg-card hover:opacity-100 group-hover:inline-flex group-hover:items-center">
                          {emoji}
                        </button>
                      );
                    }
                    return (
                      <button key={emoji} onClick={() => react(n.id, emoji)}
                        className={cn('inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-xs',
                          active ? 'border-primary-border bg-card' : 'border-border bg-card/60')}>
                        {emoji} <span className="text-[10px] tabular-nums text-fg-2">{users.length}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
                  {isNew ? (
                    <button onClick={() => markRead(n.id)}
                      className="flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-[11px] font-semibold text-on-primary transition-colors hover:bg-primary-hover">
                      <Check size={12} strokeWidth={2.5} /> Marcar como lido
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-fg-muted"><Eye size={10} /> visto por {n.readCount}</span>
                  )}
                  <div className="flex opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                    <button onClick={async () => { await api.patch(`/dcaos/notes/${n.id}/pin`); mutate(); }}
                      aria-label={n.pinned ? 'Desafixar' : 'Fixar'} className="flex h-6 w-6 items-center justify-center rounded text-fg-muted hover:bg-card hover:text-fg">
                      {n.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                    </button>
                    {mine && (
                      <button onClick={async () => { if (!confirm('Apagar este recado?')) return; await api.delete(`/dcaos/notes/${n.id}`); mutate(); }}
                        aria-label="Apagar" className="flex h-6 w-6 items-center justify-center rounded text-fg-muted hover:bg-card hover:text-danger">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DcaosNotesPage() {
  useAuth();
  return (
    <AppLayout title="Recados" subtitle="Bilhetes da família · porque post-it na geladeira some" noPadding>
      <div className="h-full overflow-y-auto">
        <DcaosGate>
          <Suspense fallback={null}><NotesContent /></Suspense>
        </DcaosGate>
      </div>
    </AppLayout>
  );
}
