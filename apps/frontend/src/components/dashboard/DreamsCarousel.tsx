'use client';

import { useState, useEffect } from 'react';
import { Cloud } from 'lucide-react';

export function DreamsCarousel({ dreams }: { dreams: any[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fallback de imagem caso a API falhe ou a URL esteja quebrada
  const defaultImage = 'https://images.unsplash.com/photo-1525876183281-0d0d9308010d?q=80&w=1000&auto=format&fit=crop';
  
  useEffect(() => {
    if (!dreams || dreams.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % dreams.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [dreams]);

  if (!dreams || dreams.length === 0) return null;

  const currentDream = dreams[currentIndex];
  
  // Ajuste das chaves para bater com o Prisma/Service (targetAmount e totalSaved)
  const target = currentDream.targetAmount || 0;
  const saved = currentDream.totalSaved || 0;
  const percent = target > 0 ? Math.min(Math.round((saved / target) * 100), 100) : 0;
  const remaining = Math.max(target - saved, 0);

  return (
    <div className="relative w-full h-44 bg-[#0D0D0F] rounded-[2.5rem] border border-white/5 overflow-hidden group shadow-2xl mb-8">
      
      {/* Background Image com Proteção contra Erro 404 */}
      <img 
        src={currentDream.imageUrl || defaultImage} 
        alt={currentDream.title}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (target.src !== defaultImage) {
            target.src = defaultImage;
          }
        }}
        className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm scale-110 transition-opacity duration-700"
      />
      
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent p-8 flex flex-col justify-center">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-1.5 bg-orange-500 rounded-lg text-black">
            <Cloud size={16} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-orange-500 italic">
            Mural dos Sonhos
          </span>
        </div>

        <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter mb-4 leading-none">
          {currentDream.title}
        </h2>

        <div className="flex items-center gap-8">
          <div className="flex-1 max-w-md space-y-2">
            <div className="flex justify-between text-[9px] font-black uppercase italic text-zinc-500">
              <span className="tracking-widest">Evolução</span>
              <span className="text-orange-500">{percent}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-500 transition-all duration-1000 shadow-[0_0_15px_rgba(234,88,12,0.4)]" 
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="hidden md:block border-l border-white/10 pl-8">
             <p className="text-[8px] font-black uppercase text-zinc-600 mb-0.5 italic tracking-widest">Objetivo</p>
             <p className="text-lg font-black text-white italic leading-none">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(target)}
             </p>
             {remaining > 0 && (
               <p className="text-[7px] font-bold text-orange-500/50 uppercase mt-1">
                 Faltam {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(remaining)}
               </p>
             )}
          </div>
        </div>
      </div>
      
      {/* Indicadores Minimalistas */}
      {dreams.length > 1 && (
        <div className="absolute bottom-4 right-10 flex gap-1.5">
          {dreams.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === currentIndex ? 'w-6 bg-orange-500' : 'w-1.5 bg-white/10 hover:bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}