'use client';

import { useState, useEffect } from 'react';
import { Cloud, ChevronRight, Target } from 'lucide-react';

export function DreamsCarousel({ dreams }: { dreams: any[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (dreams.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % dreams.length);
    }, 5000); // Muda a cada 5 segundos
    return () => clearInterval(interval);
  }, [dreams]);

  if (!dreams || dreams.length === 0) return null;

  const currentDream = dreams[currentIndex];
  const percent = Math.min(Math.round((currentDream.savedValue / currentDream.targetValue) * 100), 100);

  return (
    <div className="relative w-full h-48 bg-zinc-900 rounded-[2.5rem] border border-white/5 overflow-hidden group shadow-2xl mb-8">
      {/* Background Image com Blur */}
      <img 
        src={currentDream.imageUrl || 'https://images.unsplash.com/photo-1500624285662-86ee6938170b'} 
        className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm scale-110"
      />
      
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent p-8 flex flex-col justify-center">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-500 rounded-xl text-black">
            <Cloud size={20} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Mural dos Sonhos</span>
        </div>

        <h2 className="text-3xl font-black italic uppercase text-white tracking-tighter mb-4">
          {currentDream.title}
        </h2>

        <div className="flex items-center gap-6">
          <div className="flex-1 max-w-md space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase italic text-zinc-400">
              <span>Progresso</span>
              <span>{percent}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-500 transition-all duration-1000 shadow-[0_0_15px_rgba(234,88,12,0.5)]" 
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="hidden md:block">
             <p className="text-[10px] font-black uppercase text-zinc-500 mb-1 italic">Faltam</p>
             <p className="text-xl font-black text-white italic">
               R$ {(currentDream.targetValue - currentDream.savedValue).toLocaleString('pt-BR')}
             </p>
          </div>
        </div>
      </div>
      
      {/* Indicadores de bolinha */}
      <div className="absolute bottom-4 right-8 flex gap-2">
        {dreams.map((_, i) => (
          <div key={i} className={`h-1 rounded-full transition-all ${i === currentIndex ? 'w-6 bg-orange-500' : 'w-2 bg-white/20'}`} />
        ))}
      </div>
    </div>
  );
}