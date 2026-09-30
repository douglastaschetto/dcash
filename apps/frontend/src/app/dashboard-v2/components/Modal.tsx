import { X } from 'lucide-react';

export function Modal({ title, onClose, children }: {
  title: React.ReactNode; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-[2.5rem] p-5 shadow-2xl overflow-y-auto max-h-[90vh]">
        <button onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition">
          <X size={20} />
        </button>
        <h2 className="text-xl font-black uppercase italic mb-3 tracking-tighter">{title}</h2>
        {children}
      </div>
    </div>
  );
}
