import { LucideX } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0A0C16] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 relative shadow-2xl">
        <button onClick={onClose} className="absolute right-6 top-6 text-zinc-500 hover:text-white transition-colors">
          <LucideX size={20} />
        </button>
        <h2 className="text-xl font-black uppercase italic mb-8 text-emerald-500 tracking-tighter">{title}</h2>
        {children}
      </div>
    </div>
  );
}