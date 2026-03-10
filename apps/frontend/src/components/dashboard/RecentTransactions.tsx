import { LucideArrowUpRight, LucideArrowDownLeft } from 'lucide-react';

interface RecentTransactionsProps {
  transactions: any[];
  compact?: boolean; // Adicionado para resolver o erro de tipagem
}

export function RecentTransactions({ transactions, compact }: RecentTransactionsProps) {
  return (
    <div className={`
      bg-[#0D0D0F] rounded-[2.5rem] border border-white/5 flex flex-col h-full transition-all
      ${compact ? 'p-6' : 'p-8'}
    `}>
      <h3 className={`font-black uppercase opacity-40 tracking-widest italic ${compact ? 'text-[8px] mb-4' : 'text-[10px] mb-6'}`}>
        Transações Recentes
      </h3>
      
      <div className={`space-y-3 overflow-y-auto custom-scrollbar flex-1 ${compact ? 'max-h-[280px]' : 'max-h-[400px]'}`}>
        {transactions.length > 0 ? (
          transactions.map((tx) => {
            const isIncome = tx.type?.toUpperCase() === 'INCOME';
            
            return (
              <div key={tx.id} className="flex items-center justify-between group py-1.5 border-b border-white/[0.03] last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${isIncome ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {isIncome ? <LucideArrowUpRight size={14} /> : <LucideArrowDownLeft size={14} />}
                  </div>
                  
                  <div>
                    <p className="text-[11px] font-bold text-white uppercase tracking-tighter leading-tight">
                      {tx.description || 'Sem descrição'}
                    </p>
                    <p className="text-[8px] text-zinc-500 uppercase font-black italic">
                      {typeof tx.category === 'object' ? tx.category?.name : (tx.category || 'Geral')}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-[11px] font-black italic ${isIncome ? 'text-emerald-500' : 'text-red-500'}`}>
                    {isIncome ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(tx.amount)}
                  </span>
                  {tx.user?.name && (
                    <p className="text-[7px] text-zinc-600 uppercase font-bold leading-none mt-0.5">
                      {tx.user.name.split(' ')[0]}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
             <p className="text-[9px] font-black uppercase italic tracking-widest">Vazio</p>
          </div>
        )}
      </div>
    </div>
  );
}