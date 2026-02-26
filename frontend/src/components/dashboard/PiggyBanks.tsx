export function PiggyBanks({ items = [] }: { items: any[] }) {
  return (
    <div className="bg-[#0A0C16] border border-white/5 rounded-[3rem] p-8 flex flex-col h-full">
      {/* ... Cabeçalho ... */}

      <div className="space-y-6 flex-1">
        {items && items.length > 0 ? (
          items.map((bank) => {
            // AJUSTE DE NOMES: Use os nomes exatos das colunas do seu Prisma
            const saved = bank.savedAmount ?? bank.currentValue ?? 0;
            const goal = bank.goalAmount ?? bank.targetValue ?? 1;
            const progress = Math.min(Math.round((saved / goal) * 100), 100);

            return (
              <div key={bank.id} className="group">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold text-zinc-300 uppercase italic">
                    {bank.name}
                  </span>
                  <span className="text-[10px] font-black text-white">{progress}%</span>
                </div>
                
                <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-1000 rounded-full"
                    style={{ 
                      width: `${progress}%`, 
                      backgroundColor: bank.color || '#10b981' 
                    }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-10 text-center opacity-20">
             <p className="text-[10px] font-black uppercase">Nenhum cofre encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}