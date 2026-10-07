'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ChevronRight, Heart, PiggyBank, ShoppingCart, Star } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import type { PantryItem } from '@/app/dcaos/lib/dcaos';

type Tone = 'success' | 'warning' | 'info' | 'neutral';
type Tile = { label: string; href: string; icon: React.ElementType; tone: Tone; value: string; sub: string };

const TONE: Record<Tone, { chip: string; dot: string; edge: string }> = {
  success: { chip: 'bg-primary-soft text-accent', dot: 'bg-primary', edge: 'before:bg-primary' },
  warning: { chip: 'bg-warning-soft text-warning', dot: 'bg-warning', edge: 'before:bg-warning' },
  info:    { chip: 'bg-info-soft text-info', dot: 'bg-info', edge: 'before:bg-info' },
  neutral: { chip: 'bg-surface-2 text-fg-muted', dot: 'bg-fg-disabled', edge: 'before:bg-border' },
};

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: n >= 1000 ? 0 : 2 });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

type Piggy = { balance?: number | string; yearlyGoal?: number | string; monthlyGoal?: number | string };
type Dream = { title?: string; name?: string; targetValue?: number | string; savedValue?: number | string };
type Wish = { bought: boolean; priority?: string; prices?: { cashPrice: number | string; shipping: number | string }[] };

/**
 * Compact status cards for the painel right rail (shopping list, piggy banks,
 * dreams, wishlist). Each one links to its page and shows a single "smart"
 * line: what needs attention first.
 */
export function StatusTiles({ house, piggyBanks, dreams }: { house: boolean; piggyBanks: Piggy[]; dreams: Dream[] }) {
  const { data: market = [] } = useSWR<PantryItem[]>(house ? '/dcaos/market' : null);
  const { data: wishes = [] } = useSWR<Wish[]>('/wishlists');

  /* Lista de compras: amarelo com itens pendentes, verde quando está tudo comprado */
  const toBuy = market.filter((i) => i.onList && !i.checked).length;
  const inCart = market.filter((i) => i.onList && i.checked).length;
  const running = market.filter((i) => !i.onList && i.minQuantity !== null && i.quantity <= i.minQuantity).length;
  const shopping: Tile = !house
    ? { label: 'Lista de compras', href: '/dcaos', icon: ShoppingCart, tone: 'neutral', value: 'DCaos', sub: 'Ative para ter a lista da casa' }
    : toBuy > 0
      ? { label: 'Lista de compras', href: '/dcaos/mercado', icon: ShoppingCart, tone: 'warning', value: plural(toBuy, 'item', 'itens'), sub: inCart ? `${inCart} já no carrinho` : running ? `+${running} acabando em casa` : 'pra comprar' }
      : { label: 'Lista de compras', href: '/dcaos/mercado', icon: ShoppingCart, tone: 'success', value: 'Em dia', sub: running ? `${plural(running, 'item', 'itens')} acabando` : inCart ? 'carrinho pronto pra finalizar' : 'nada faltando' };

  /* Cofrinhos: total guardado e quanto da meta já foi */
  const saved = piggyBanks.reduce((s, b) => s + Number(b.balance || 0), 0);
  const goal = piggyBanks.reduce((s, b) => s + Number(b.yearlyGoal || b.monthlyGoal || 0), 0);
  const piggyPct = goal > 0 ? Math.round((saved / goal) * 100) : null;
  const piggy: Tile = piggyBanks.length === 0
    ? { label: 'Cofrinhos', href: '/piggy-banks', icon: PiggyBank, tone: 'neutral', value: '—', sub: 'Crie o primeiro cofrinho' }
    : { label: 'Cofrinhos', href: '/piggy-banks', icon: PiggyBank, tone: piggyPct !== null && piggyPct >= 100 ? 'success' : 'info',
        value: brl(saved), sub: piggyPct !== null ? `${Math.min(piggyPct, 999)}% da meta` : plural(piggyBanks.length, 'cofrinho', 'cofrinhos') };

  /* Sonhos: o mais perto de realizar */
  const progress = dreams.map((d) => {
    const target = Number(d.targetValue || 0);
    const have = Number(d.savedValue || 0);
    return { title: d.title || d.name || 'Sonho', pct: target > 0 ? Math.min(100, Math.round((have / target) * 100)) : 0, missing: Math.max(0, target - have) };
  });
  const open = progress.filter((d) => d.pct < 100).sort((a, b) => b.pct - a.pct);
  const done = progress.length - open.length;
  const dream: Tile = progress.length === 0
    ? { label: 'Sonhos', href: '/dreams', icon: Star, tone: 'neutral', value: '—', sub: 'Defina um sonho' }
    : open.length === 0
      ? { label: 'Sonhos', href: '/dreams', icon: Star, tone: 'success', value: plural(done, 'realizado', 'realizados'), sub: 'Hora de sonhar de novo' }
      : { label: 'Sonhos', href: '/dreams', icon: Star, tone: open[0].pct >= 75 ? 'success' : 'info', value: `${open[0].pct}%`,
          sub: `${open[0].title}${open[0].missing > 0 ? ` · faltam ${brl(open[0].missing)}` : ''}` };

  /* Desejos: pendentes, essenciais e quanto custa o que já foi cotado */
  const pending = wishes.filter((w) => !w.bought);
  const essentials = pending.filter((w) => w.priority?.startsWith('1')).length;
  const quoted = pending.reduce((s, w) => {
    const best = w.prices?.length ? Math.min(...w.prices.map((p) => Number(p.cashPrice || 0) + Number(p.shipping || 0))) : 0;
    return s + best;
  }, 0);
  const wish: Tile = pending.length === 0
    ? { label: 'Desejos', href: '/wishlists', icon: Heart, tone: wishes.length ? 'success' : 'neutral', value: wishes.length ? 'Zerada' : '—', sub: wishes.length ? 'Tudo conquistado' : 'Anote o que quer comprar' }
    : { label: 'Desejos', href: '/wishlists', icon: Heart, tone: essentials ? 'warning' : 'info', value: plural(pending.length, 'pendente', 'pendentes'),
        sub: essentials ? `${plural(essentials, 'essencial', 'essenciais')}${quoted ? ` · ${brl(quoted)}` : ''}` : quoted ? `${brl(quoted)} cotados` : 'sem cotação ainda' };

  return (
    <div className="space-y-2.5">
      {[shopping, piggy, dream, wish].map((t) => {
        const tone = TONE[t.tone];
        return (
          <Link key={t.label} href={t.href}
            className={cn('group relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card px-4 py-3 transition-all hover:-translate-x-0.5 hover:border-border-hover hover:shadow-md',
              'before:absolute before:inset-y-0 before:left-0 before:w-[3px]', tone.edge)}>
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tone.chip)}><t.icon size={17} strokeWidth={1.9} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-fg">{t.label}</span>
              <span className="flex items-center gap-1 truncate text-[11px] text-fg-muted">
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', tone.dot)} />
                <span className="truncate">{t.sub}</span>
              </span>
            </span>
            <span className="shrink-0 text-right text-[15px] font-semibold tabular-nums text-fg">{t.value}</span>
            <ChevronRight size={15} className="shrink-0 text-fg-disabled transition-transform group-hover:translate-x-0.5 group-hover:text-fg-muted" />
          </Link>
        );
      })}
    </div>
  );
}
