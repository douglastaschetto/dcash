import React, { InputHTMLAttributes, ReactNode } from 'react';

// Interface estendendo os atributos nativos do HTML Input
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
}

export const Input = ({ label, icon, ...props }: InputProps) => {
  return (
    <div className="space-y-2 w-full">
      <label className="text-[9px] font-black uppercase text-zinc-500 ml-2 tracking-widest">
        {label}
      </label>
      <div className="relative">
        {/* Renderiza o ícone apenas se ele for enviado via props */}
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 flex items-center justify-center">
            {icon}
          </div>
        )}
        
        <input
          {...props}
          // Ajusta o padding esquerdo caso não haja ícone
          className={`w-full h-14 bg-zinc-950 border border-white/5 rounded-2xl pr-4 text-sm text-white outline-none focus:border-emerald-500/50 transition-all font-medium ${
            icon ? 'pl-12' : 'pl-4'
          }`}
        />
      </div>
    </div>
  );
};