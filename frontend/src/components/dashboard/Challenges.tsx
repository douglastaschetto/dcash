import { LucideTarget } from 'lucide-react';

export function Challenges({ items }: { items: any[] }) {
  return (
    <div className="bg-zinc-900/40 p-8 rounded-[3rem] border border-white/5">
      <div className="flex items-center gap-2 mb-6">
        <LucideTarget size={16} className="text-emerald-500" />
        <h3 className="text-[10px] font-black uppercase tracking-widest italic">Desafios</h3>
      </div>
      <div className="space-y-4">
        {items.length > 0 ? items.map((item: any) => (
          <div key={item.id} className="space-y-2">
            <div className="flex justify-between text-[9px] font-black uppercase">
              <span className="text-zinc-400">{item.name}</span>
              <span className="text-emerald-500">{item.progress}%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${item.progress}%` }} />
            </div>
          </div>
        )) : (
          <p className="text-[9px] text-zinc-600 uppercase font-black">Nenhum desafio ativo</p>
        )}
      </div>
    </div>
  );
}