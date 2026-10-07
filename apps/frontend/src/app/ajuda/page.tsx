'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUp, ChevronRight, Menu, Search, X, GraduationCap, Sparkles } from '@/components/ui/icons';
import api from '@/services/api';
import { cn } from '@/lib/utils';
import { GUIDE_HTML, GUIDE_INTRO, GUIDE_NAV } from './guide-content';

/* Colors per guide group (semantic tokens → both themes) */
const GROUP_TONE: Record<string, { chip: string; dot: string; ring: string }> = {
  start:       { chip: 'bg-primary-soft text-accent',  dot: 'bg-primary',  ring: 'hover:border-primary-border' },
  principal:   { chip: 'bg-primary-soft text-accent',  dot: 'bg-primary',  ring: 'hover:border-primary-border' },
  financas:    { chip: 'bg-info-soft text-info',       dot: 'bg-info',     ring: 'hover:border-info/40' },
  metas:       { chip: 'bg-warning-soft text-warning', dot: 'bg-warning',  ring: 'hover:border-warning/40' },
  dcaos:       { chip: 'bg-primary-soft text-accent',  dot: 'bg-primary',  ring: 'hover:border-primary-border' },
  organizacao: { chip: 'bg-info-soft text-info',       dot: 'bg-info',     ring: 'hover:border-info/40' },
  conta:       { chip: 'bg-danger-soft text-danger',   dot: 'bg-danger',   ring: 'hover:border-danger/40' },
  ajuda:       { chip: 'bg-surface-2 text-fg-2',       dot: 'bg-fg-muted', ring: 'hover:border-border-hover' },
};

const POPULAR = [
  { id: 'painel', label: 'Painel gerencial' },
  { id: 'dcaos-mercado', label: 'Lista de compras' },
  { id: 'dcaos-recados', label: 'Recados' },
  { id: 'cofrinhos', label: 'Cofrinhos' },
  { id: 'importar-extrato', label: 'Importar extrato' },
  { id: 'planos', label: 'Planos' },
];

/* Where each built-in tour starts (the tour itself navigates between screens) */
const TOUR_START: Record<string, string> = {
  'painel-intro': '/painel', 'dashboard-intro': '/dashboard-v2', 'dcaos-intro': '/dcaos',
  'dcaos-mercado': '/dcaos/mercado', 'dcaos-recados': '/dcaos/recados',
};
const TOUR_EMOJI: Record<string, string> = {
  'painel-intro': '🧭', 'dashboard-intro': '📊', 'dcaos-intro': '🏡', 'dcaos-mercado': '🛒', 'dcaos-recados': '🗒️',
};

type Tour = { key: string; title: string; description?: string | null };

export default function AjudaPage() {
  const [query, setQuery] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [active, setActive] = useState('intro');
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [tours, setTours] = useState<Tour[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const allItems = useMemo(() => GUIDE_NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.key }))), []);

  useEffect(() => { document.title = 'DCash — Central de Ajuda'; }, []);

  useEffect(() => {
    api.get('/guided-tours').then(({ data }) => setTours(Array.isArray(data) ? data : [])).catch(() => setTours([]));
  }, []);

  /* "/" focuses the search, Esc clears it */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.tagName === 'INPUT';
      if (e.key === '/' && !typing) { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'Escape') { setQuery(''); setDrawer(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* Search: hide sections that don't match */
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const q = query.trim().toLowerCase();
    const next = new Set<string>();
    root.querySelectorAll<HTMLElement>('section.page-section').forEach((sec) => {
      const match = !q || (sec.textContent || '').toLowerCase().includes(q);
      sec.classList.toggle('search-hidden', !match);
      if (!match) next.add(sec.id);
    });
    setHidden(next);
  }, [query]);

  /* Scrollspy, reading progress, back-to-top and reveal-on-scroll */
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const sections = Array.from(root.querySelectorAll<HTMLElement>('section.page-section'));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-20% 0px -70% 0px' });
    const reveal = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    sections.forEach((s) => { spy.observe(s); reveal.observe(s); });
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? (h.scrollTop / max) * 100 : 0);
      setShowTop(h.scrollTop > 900);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { spy.disconnect(); reveal.disconnect(); window.removeEventListener('scroll', onScroll); };
  }, []);

  const go = (id: string) => {
    setDrawer(false);
    if (query && hidden.has(id)) setQuery('');
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const results = allItems.filter((i) => i.id !== 'intro').length - hidden.size;
  const searching = query.trim().length > 0;

  const toc = (
    <nav aria-label="Conteúdo do guia" className="space-y-4">
      {GUIDE_NAV.map((g) => (
        <div key={g.key}>
          <p className="mb-1 flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
            <span className={cn('h-1.5 w-1.5 rounded-full', GROUP_TONE[g.key]?.dot)} /> {g.label}
          </p>
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const on = active === it.id;
              const off = searching && hidden.has(it.id) && it.id !== 'intro';
              return (
                <li key={it.id}>
                  <button onClick={() => go(it.id)}
                    className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors',
                      on ? 'bg-primary-soft font-semibold text-accent' : 'text-fg-2 hover:bg-hover hover:text-fg',
                      off && 'opacity-35')}>
                    <span className="w-5 shrink-0 text-center">{it.emoji}</span>
                    <span className="truncate">{it.title}</span>
                    {on && <span className="ml-auto h-4 w-1 rounded-full bg-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="ajuda min-h-screen bg-background text-fg">
      <style>{GUIDE_CSS}</style>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4 md:px-6">
          <button onClick={() => setDrawer(true)} aria-label="Abrir conteúdo" className="flex h-9 w-9 items-center justify-center rounded-lg border border-border lg:hidden">
            <Menu size={17} />
          </button>
          <Link href="/painel" className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-fg-2 hover:bg-hover hover:text-fg">
            <ArrowLeft size={15} /> <span className="hidden sm:inline">Voltar ao app</span>
          </Link>
          <span className="hidden h-5 w-px bg-border sm:block" />
          <p className="flex items-center gap-2 text-[15px] font-semibold"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Central de Ajuda</p>
          <div className="relative ml-auto w-full max-w-md">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input ref={searchRef} type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar no guia…"
              className="h-9 w-full rounded-full border border-border bg-card pl-9 pr-16 text-[13px] outline-none transition placeholder:text-fg-muted focus:border-primary" />
            {searching ? (
              <button onClick={() => setQuery('')} aria-label="Limpar busca" className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-fg-muted hover:bg-hover"><X size={13} /></button>
            ) : (
              <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 text-[10px] text-fg-muted sm:block">/</kbd>
            )}
          </div>
        </div>
        <div className="h-0.5 bg-transparent"><div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${progress}%` }} /></div>
      </header>

      <div className="grid w-full grid-cols-1 lg:grid-cols-[272px_minmax(0,1fr)]">
        {/* ── TOC (desktop) ─────────────────────────────────── */}
        <aside className="sticky top-[58px] hidden h-[calc(100vh-58px)] overflow-y-auto border-r border-border px-3 py-6 scrollbar-none lg:block">
          {toc}
        </aside>

        {/* ── TOC drawer (mobile) ───────────────────────────── */}
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => setDrawer(false)} />
            <div className="absolute inset-y-0 left-0 w-[86vw] max-w-[320px] overflow-y-auto bg-sidebar p-4 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold">Conteúdo</p>
                <button onClick={() => setDrawer(false)} aria-label="Fechar" className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-hover"><X size={16} /></button>
              </div>
              {toc}
            </div>
          </div>
        )}

        <main className="min-w-0 px-4 py-6 md:px-8 lg:px-10">
          {/* ── Hero ───────────────────────────────────────── */}
          <section id="intro" className="hero-card relative mb-6 scroll-mt-20 overflow-hidden rounded-3xl p-6 md:p-10">
            <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="relative">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60"><Sparkles size={12} /> Guia do usuário</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Como podemos ajudar?</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75 md:text-[15px]" dangerouslySetInnerHTML={{ __html: GUIDE_INTRO }} />
              <div className="relative mt-5 max-w-xl">
                <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg-muted" />
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex.: cofrinho, fatura, lista de compras, bilhete…"
                  className="h-12 w-full rounded-2xl border border-white/20 bg-card pl-11 pr-4 text-sm text-fg shadow-xl outline-none placeholder:text-fg-muted focus:border-primary" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-white/60">Populares:</span>
                {POPULAR.map((p) => (
                  <button key={p.id} onClick={() => go(p.id)} className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-white/20">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {searching ? (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-[13px]">
              <span className="text-fg-2">
                {results > 0 ? <><b className="text-fg">{results}</b> tópico{results === 1 ? '' : 's'} com &quot;{query.trim()}&quot;</> : <>Nada encontrado para &quot;{query.trim()}&quot;.</>}
              </span>
              <button onClick={() => setQuery('')} className="text-xs font-semibold text-accent hover:underline">Limpar busca</button>
            </div>
          ) : (
            <>
              {/* ── Topic tiles ─────────────────────────────── */}
              <section className="mb-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">Navegue por assunto</p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-8">
                  {GUIDE_NAV.filter((g) => g.key !== 'start').map((g) => {
                    const tone = GROUP_TONE[g.key] ?? GROUP_TONE.ajuda;
                    return (
                      <button key={g.key} onClick={() => go(g.items[0].id)}
                        className={cn('group flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md', tone.ring)}>
                        <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-transform group-hover:scale-110', tone.chip)}>{g.items[0].emoji}</span>
                        <span className="text-[13px] font-semibold text-fg">{g.label}</span>
                        <span className="line-clamp-2 text-[11px] text-fg-muted">{g.items.map((i) => i.title).join(' · ')}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* ── Guided tours ───────────────────────────── */}
              {tours.length > 0 && (
                <section className="mb-8">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fg-muted"><GraduationCap size={13} /> Aprenda na prática</p>
                  <div className="flex snap-x gap-3 overflow-x-auto pb-1 scrollbar-none">
                    {tours.map((t) => (
                      <a key={t.key} href={`${TOUR_START[t.key] ?? '/painel'}?tour=${encodeURIComponent(t.key)}`}
                        className="group flex w-64 shrink-0 snap-start flex-col rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary-border hover:shadow-md">
                        <span className="text-2xl">{TOUR_EMOJI[t.key] ?? '🎓'}</span>
                        <span className="mt-2 text-[13px] font-semibold text-fg">{t.title}</span>
                        {t.description && <span className="mt-0.5 line-clamp-2 text-[11px] text-fg-muted">{t.description}</span>}
                        <span className="mt-auto flex items-center gap-1 pt-3 text-xs font-semibold text-accent">Começar tutorial <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" /></span>
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* ── Guide content ─────────────────────────────────── */}
          <div ref={contentRef} className="guide-content" dangerouslySetInnerHTML={{ __html: GUIDE_HTML }}
            onClick={(e) => {
              const a = (e.target as HTMLElement).closest('a');
              const href = a?.getAttribute('href');
              if (href?.startsWith('#')) { e.preventDefault(); go(href.slice(1)); }
            }} />

          {searching && results === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <p className="text-3xl">🔎</p>
              <p className="mt-2 text-sm font-semibold text-fg">Não achamos esse assunto</p>
              <p className="mt-1 text-xs text-fg-muted">Tente outra palavra ou pergunte ao assistente do DCash (ícone de robô no topo do app).</p>
            </div>
          )}

          <footer className="mt-12 border-t border-border pt-6 text-center text-xs text-fg-muted">
            Não encontrou o que precisava? Fale com o assistente do DCash pelo ícone 🤖 no topo do app.
          </footer>
        </main>
      </div>

      {showTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Voltar ao topo"
          className="fixed bottom-6 right-6 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-on-primary shadow-xl transition-transform hover:-translate-y-0.5">
          <ArrowUp size={18} />
        </button>
      )}
    </div>
  );
}

/* Styles for the generated guide HTML (semantic tokens, both themes) */
const GUIDE_CSS = `
.ajuda{scroll-behavior:smooth}
.guide-content .page-section{scroll-margin-top:80px;margin:0 0 28px}
/* Enhancement only: content is always visible; sections just glide in when first seen */
@keyframes guide-in{from{opacity:.25;transform:translateY(10px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:no-preference){.guide-content .page-section.in{animation:guide-in .4s ease-out}}
.guide-content .page-section.search-hidden{display:none}
.guide-content .head{display:flex;align-items:center;gap:14px;margin-bottom:10px}
.guide-content .head .emoji{font-size:1.6rem;width:52px;height:52px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:16px;background:var(--color-surface-2, var(--surface-secondary))}
.guide-content [data-group="principal"] .head .emoji,.guide-content [data-group="dcaos"] .head .emoji,.guide-content [data-group="start"] .head .emoji{background:var(--primary-soft)}
.guide-content [data-group="financas"] .head .emoji,.guide-content [data-group="organizacao"] .head .emoji{background:var(--info-soft)}
.guide-content [data-group="metas"] .head .emoji{background:var(--warning-soft)}
.guide-content [data-group="conta"] .head .emoji{background:var(--danger-soft)}
.guide-content h2{font-size:1.35rem;font-weight:600;letter-spacing:-.01em;margin:0;color:var(--text-primary)}
.guide-content .subtitle{color:var(--text-muted);font-size:.9rem;margin:2px 0 0}
.guide-content .card{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:20px 24px;font-size:.93rem;line-height:1.65;color:var(--text-secondary);transition:border-color .2s}
.guide-content .card:hover{border-color:var(--border-hover)}
.guide-content .card p,.guide-content .card li{max-width:90ch}
.guide-content b{color:var(--text-primary);font-weight:600}
.guide-content a{color:var(--primary-text);font-weight:500;text-decoration:none;border-bottom:1px dashed currentColor}
.guide-content a:hover{border-bottom-style:solid}
.guide-content ul,.guide-content ol{padding-left:0;margin:12px 0;list-style:none}
.guide-content ul li{position:relative;padding-left:20px;margin:7px 0}
.guide-content ul li::before{content:"";position:absolute;left:4px;top:.65em;width:6px;height:6px;border-radius:50%;background:var(--primary)}
.guide-content ol li{margin:8px 0;display:flex;align-items:flex-start;gap:4px}
.guide-content .stepnum{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:7px;background:var(--primary);color:var(--on-primary);font-size:.72rem;font-weight:700;margin-right:6px;flex-shrink:0}
.guide-content .callout{display:flex;gap:12px;align-items:flex-start;border-radius:14px;padding:14px 16px;margin:14px 0;border:1px solid transparent;border-left-width:4px}
.guide-content .callout .ic{font-size:1.15rem;line-height:1.4;flex-shrink:0}
.guide-content .callout b{display:block;margin-bottom:2px}
.guide-content .callout.example{background:var(--info-soft);border-left-color:var(--info)}
.guide-content .callout.tip{background:var(--primary-soft);border-left-color:var(--primary)}
.guide-content .callout.warn{background:var(--warning-soft);border-left-color:var(--warning)}
.guide-content .callout.bad{background:var(--danger-soft);border-left-color:var(--danger)}
.guide-content .plan-pill{display:inline-flex;align-items:center;font-size:.68rem;font-weight:700;padding:2px 9px;border-radius:999px;margin-left:8px;vertical-align:middle;letter-spacing:.01em}
.guide-content .plan-pill.basico{background:var(--primary-soft);color:var(--primary-text)}
.guide-content .plan-pill.inter{background:var(--info-soft);color:var(--info)}
.guide-content .plan-pill.pro{background:var(--warning-soft);color:var(--warning)}
.guide-content .plan-pill.dcaos{background:var(--primary);color:var(--on-primary)}
.guide-content table{width:100%;border-collapse:separate;border-spacing:0;font-size:.88rem;border:1px solid var(--border);border-radius:14px;overflow:hidden}
.guide-content th,.guide-content td{padding:10px 12px;border-bottom:1px solid var(--border);text-align:left}
.guide-content tr:last-child td{border-bottom:none}
.guide-content tbody tr:hover{background:var(--hover)}
.guide-content th{background:var(--color-surface-2, var(--surface-secondary));color:var(--text-muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.05em}
.guide-content td.center,.guide-content th.center{text-align:center}
.guide-content .badge-yes{color:var(--primary-text);font-weight:700}
.guide-content .badge-no{color:var(--text-disabled)}
.guide-content .grid2{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px}
@media (max-width:820px){.guide-content .grid2{grid-template-columns:1fr}}
.guide-content details{background:var(--card);border:1px solid var(--border);border-radius:14px;margin:8px 0;transition:border-color .2s,box-shadow .2s}
.guide-content details:hover{border-color:var(--border-hover)}
.guide-content details[open]{border-color:var(--primary-border);box-shadow:0 6px 24px -12px rgb(0 0 0 / .25)}
.guide-content details summary{cursor:pointer;list-style:none;padding:14px 44px 14px 18px;font-weight:600;color:var(--text-primary);position:relative;font-size:.92rem}
.guide-content details summary::-webkit-details-marker{display:none}
.guide-content details summary::after{content:"";position:absolute;right:18px;top:50%;width:8px;height:8px;border-right:2px solid var(--text-muted);border-bottom:2px solid var(--text-muted);transform:translateY(-70%) rotate(45deg);transition:transform .2s}
.guide-content details[open] summary::after{transform:translateY(-30%) rotate(-135deg)}
.guide-content details > *:not(summary){padding:0 18px 14px;margin:0;color:var(--text-secondary);font-size:.9rem;line-height:1.65}
.guide-content code{background:var(--color-surface-2, var(--surface-secondary));color:var(--primary-text);padding:1px 6px;border-radius:6px;font-size:.85em}
`;
