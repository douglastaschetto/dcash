import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'social' | 'outline';
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = ({ children, variant = 'primary', loading, icon, ...props }: ButtonProps) => {
  const baseStyles = "w-full h-14 font-black text-[11px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]";
  
  const variants = {
    primary: "bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/10",
    social: "bg-white hover:bg-zinc-200 text-black shadow-xl",
    outline: "bg-transparent border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]}`} disabled={loading} {...props}>
      {loading ? <Loader2 className="animate-spin" size={20} /> : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
};