export function ProgressBar({ label, current, limit, color, compact }: any) {
  // Proteção contra divisão por zero e cálculo de porcentagem
  const safeLimit = limit > 0 ? limit : 1;
  const percentage = Math.min((current / safeLimit) * 100, 100);

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <div className="flex justify-between font-black uppercase italic items-end">
        {/* Se for compact, diminui a fonte do label */}
        <span className={compact ? "text-[8px] tracking-tight" : "text-[10px]"}>
          {label}
        </span>
        
        {/* Mostra valor real vs teto apenas se não for compact para poupar espaço */}
        {!compact && (
          <span className="text-[8px] opacity-30 ml-auto mr-2">
            {current.toLocaleString('pt-BR')} / {limit.toLocaleString('pt-BR')}
          </span>
        )}

        <span className={`${compact ? "text-[8px]" : "text-[10px]"} opacity-40`}>
          {Math.round(percentage)}%
        </span>
      </div>

      {/* A barra fica mais fina no modo compact */}
      <div className={`${compact ? "h-1" : "h-2"} bg-zinc-100 rounded-full overflow-hidden`}>
        <div 
          className="h-full transition-all duration-1000 ease-out" 
          style={{ 
            width: `${percentage}%`, 
            backgroundColor: color || '#10b981' 
          }} 
        />
      </div>
    </div>
  );
}