import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  amount: number;
  type?: 'income' | 'expense' | 'neutral';
  icon?: ReactNode;
  isLarge?: boolean;
  className?: string;
  compact?: boolean; // Adicionado para suportar o novo layout
}

export function StatCard({ title, amount, type, icon, isLarge, className, compact }: StatCardProps) {
  const colorClass = type === 'income' ? 'text-emerald-500' : type === 'expense' ? 'text-red-500' : 'text-white';
  
  return (
    <div className={`
      rounded-3xl border border-white/5 bg-zinc-900/50 transition-all
      ${compact ? 'p-3' : 'p-6'} 
      ${className}
    `}>
      <div className={`
        flex items-center gap-2 opacity-50 uppercase font-black tracking-widest text-white
        ${compact ? 'text-[7px] mb-0.5' : 'text-[9px] mb-2'}
      `}>
        {icon} {title}
      </div>
      
      <div className={`
        font-black italic tracking-tighter 
        ${isLarge ? 'text-5xl' : compact ? 'text-lg' : 'text-2xl'} 
        ${colorClass}
      `}>
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}
      </div>
    </div>
  );
}