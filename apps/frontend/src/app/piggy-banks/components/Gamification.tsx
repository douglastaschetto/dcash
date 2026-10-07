'use client';

import {
  PiggyBank, Sprout, Coins, Target, Flame, Rocket, Gem, Crown, Layers, CalendarHeart, Trophy, Lock, Sparkles,
} from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import type { Achievement, AchievementIcon } from '../lib/insights';

const ICONS: Record<AchievementIcon, React.ElementType> = {
  piggy: PiggyBank, sprout: Sprout, coins: Coins, target: Target, flame: Flame, rocket: Rocket,
  gem: Gem, crown: Crown, layers: Layers, calendar: CalendarHeart, trophy: Trophy,
};

const fmtShort = (n: number) =>
  n >= 1000 ? `R$ ${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : `R$ ${Math.round(n)}`;

export function LevelHero({ level, title, xp, intoLevel, levelCost, toNext, streak }: {
  level: number; title: string; xp: number; intoLevel: number; levelCost: number; toNext: number; streak: number;
}) {
  const pct = Math.min(100, (intoLevel / levelCost) * 100);
  return (
    <div className="hero-card relative overflow-hidden rounded-2xl p-5">
      <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-6 -bottom-10 h-40 w-40 rounded-full border border-white/10" />
      <div className="relative flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
          <PiggyBank size={36} strokeWidth={1.5} className="text-white" />
          <span className="absolute -bottom-2 -right-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-on-primary ring-2 ring-hero-to">
            {level}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/50">Nível {level}</p>
          <p className="truncate text-lg font-semibold leading-tight">{title}</p>
          <p className="mt-0.5 text-[11px] text-white/60 tabular-nums">{xp.toLocaleString('pt-BR')} XP</p>
        </div>
        {streak > 0 && (
          <div className="hidden shrink-0 flex-col items-center rounded-xl bg-white/10 px-3 py-2 sm:flex">
            <Flame size={18} className="text-warning" />
            <span className="text-sm font-semibold tabular-nums">{streak}</span>
            <span className="text-[10px] text-white/60">{streak === 1 ? 'mês' : 'meses'}</span>
          </div>
        )}
      </div>
      <div className="relative mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-[11px] text-white/60 tabular-nums">Faltam {toNext.toLocaleString('pt-BR')} XP para o nível {level + 1}</p>
      </div>
    </div>
  );
}

export function AchievementsPanel({ achievements }: { achievements: Achievement[] }) {
  const unlocked = achievements.filter((a) => a.unlocked).length;
  const next = achievements
    .filter((a) => !a.unlocked)
    .sort((a, b) => b.current / b.target - a.current / a.target)[0];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={16} strokeWidth={1.75} className="text-accent" />
          <p className="text-sm font-semibold text-fg">Conquistas</p>
        </div>
        <span className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-fg-2">
          {unlocked}/{achievements.length}
        </span>
      </div>

      {next && (
        <div className="mb-4 rounded-xl border border-border bg-surface-2/60 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-fg-muted"><Sparkles size={11} className="text-accent" /> Próxima conquista</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="truncate text-[13px] font-medium text-fg">{next.title}</p>
            <p className="shrink-0 text-[11px] tabular-nums text-fg-muted">
              {next.format === 'money' ? `${fmtShort(next.current)} / ${fmtShort(next.target)}` : `${Math.min(next.current, next.target)}/${next.target}`}
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-track">
            <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${Math.min(100, (next.current / next.target) * 100)}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4">
        {achievements.map((a) => {
          const Icon = ICONS[a.icon];
          return (
            <div key={a.id} className="flex flex-col items-center text-center" title={`${a.title} — ${a.description}`}>
              <div
                className={cn(
                  'relative flex h-12 w-12 items-center justify-center rounded-full border transition-colors',
                  a.unlocked ? 'border-primary-border bg-primary-soft text-accent' : 'border-border bg-surface-2 text-fg-disabled',
                )}
              >
                <Icon size={20} strokeWidth={1.75} />
                {!a.unlocked && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-border bg-card text-fg-muted">
                    <Lock size={9} />
                  </span>
                )}
              </div>
              <p className={cn('mt-1.5 text-[11px] leading-tight', a.unlocked ? 'font-medium text-fg' : 'text-fg-muted')}>{a.title}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AchievementToast({ achievement, onClose }: { achievement: Achievement; onClose: () => void }) {
  const Icon = ICONS[achievement.icon];
  return (
    <div className="fixed bottom-6 right-6 z-[210] w-[300px] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="hero-card flex items-center gap-3 rounded-2xl p-4 shadow-xl">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/60">Conquista desbloqueada</p>
          <p className="truncate text-sm font-semibold">{achievement.title}</p>
          <p className="truncate text-[11px] text-white/70">{achievement.description}</p>
        </div>
        <button onClick={onClose} aria-label="Fechar" className="self-start text-white/50 hover:text-white">×</button>
      </div>
    </div>
  );
}
