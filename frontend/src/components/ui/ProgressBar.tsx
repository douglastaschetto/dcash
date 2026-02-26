export function ProgressBar({ label, current, limit, color }: any) {
  const percentage = Math.min((current / limit) * 100, 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-black uppercase italic">
        <span>{label}</span>
        <span className="opacity-40">{Math.round(percentage)}%</span>
      </div>
      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div 
          className="h-full transition-all duration-1000" 
          style={{ width: `${percentage}%`, backgroundColor: color || '#10b981' }} 
        />
      </div>
    </div>
  );
}