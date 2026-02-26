import { LucideCalendarClock } from 'lucide-react';

export function FixedBills({ bills }: { bills: any[] }) {
  return (
    <div className="bg-zinc-900/40 p-8 rounded-[3rem] border border-white/5">
      <div className="flex items-center gap-2 mb-6">
        <LucideCalendarClock size={16} className="text-emerald-500" />
        <h3 className="text-[10px] font-black uppercase tracking-widest italic">Contas Fixas</h3>
      </div>
      <div className="space-y-4">
        {bills.map((bill) => (
          <div key={bill.id} className="flex justify-between items-center opacity-80 hover:opacity-100">
            <span className="text-[10px] font-bold uppercase text-zinc-400">{bill.name}</span>
            <span className="text-[10px] font-black text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bill.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}