import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  amount: number;
  type?: 'income' | 'expense' | 'neutral';
  icon?: ReactNode;
  isLarge?: boolean;
  className?: string;
}

export function StatCard({ title, amount, type, icon, isLarge, className }: StatCardProps) {
  const colorClass = type === 'income' ? 'text-emerald-500' : type === 'expense' ? 'text-red-500' : 'text-white';
  
  return (
    <div className={`p-6 rounded-3xl border border-white/5 bg-zinc-900/50 ${className}`}>
      <div className="flex items-center gap-2 mb-2 opacity-50 uppercase text-[9px] font-black tracking-widest text-white">
        {icon} {title}
      </div>
      <div className={`font-black italic tracking-tighter ${isLarge ? 'text-5xl' : 'text-2xl'} ${colorClass}`}>
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}
      </div>
    </div>
  );
}