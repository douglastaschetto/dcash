import { LucideCalendarCheck } from 'lucide-react';

interface FixedBill {
  id: string;
  description: string;
  amount: number;
  paid?: boolean;
}

export function FixedBills({ bills }: { bills: FixedBill[] }) {
  return (
    <div className="bg-[#0D0D0F] p-6 rounded-[2rem] border border-white/5 flex flex-col h-full group hover:border-emerald-500/20 transition-all">
      <div className="flex items-center gap-2 mb-6 opacity-40">
        <LucideCalendarCheck size={14} className="text-emerald-500" />
        <h3 className="text-[9px] font-black uppercase tracking-widest italic text-white">
          Contas Fixas
        </h3>
      </div>
      
      <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 max-h-[180px]">
        {bills.length > 0 ? (
          bills.map((bill) => (
            <div key={bill.id} className="flex items-center justify-between group/item">
              {/* Exibição da Descrição */}
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter group-hover/item:text-white transition-colors">
                {bill.description}
              </span>
              
              {/* Exibição do Valor */}
              <span className="text-[10px] font-black text-white italic">
                {new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                }).format(bill.amount)}
              </span>
            </div>
          ))
        ) : (
          <div className="h-full flex items-center justify-center opacity-20">
            <p className="text-[8px] font-black uppercase italic">Tudo em dia</p>
          </div>
        )}
      </div>
    </div>
  );
}