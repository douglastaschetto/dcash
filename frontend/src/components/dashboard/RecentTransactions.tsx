import { LucideArrowUpRight, LucideArrowDownLeft } from 'lucide-react';

export function RecentTransactions({ transactions }: { transactions: any[] }) {
  return (
    <div className="bg-[#0A0C16] p-8 rounded-[3rem] border border-white/5 flex flex-col h-full">
      <h3 className="text-[10px] font-black uppercase opacity-40 mb-6 tracking-widest italic">Transações Recentes</h3>
      <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1">
        {transactions.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between group p-2 hover:bg-white/[0.02] rounded-2xl transition-all">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {tx.type === 'income' ? <LucideArrowUpRight size={16} /> : <LucideArrowDownLeft size={16} />}
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase">{tx.description}</p>
                <p className="text-[9px] text-zinc-500 uppercase font-black">{tx.category}</p>
              </div>
            </div>
            <span className={`text-xs font-black italic ${tx.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
              {tx.type === 'income' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}