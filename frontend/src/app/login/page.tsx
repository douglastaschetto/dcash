'use client';

import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth'; 
import { Wallet, Lock, Mail, Loader2, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loginSocial, loading, error } = useAuth();

  // Função de login tradicional (E-mail/Senha)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    await login(email, password);
  };

  // Função de login social
  const handleGoogleLogin = async () => {
    if (loading) return;
    
    if (loginSocial) {
      await loginSocial('google');
    } else {
      console.warn("A função loginSocial ainda não foi totalmente implementada no useAuth");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4 overflow-hidden relative">
      {/* Glow Effects de Fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full bg-zinc-900/50 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-10 border border-white/5 relative z-10">
        
        {/* Header da Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-emerald-500 p-4 rounded-[1.5rem] mb-4 shadow-[0_0_20px_rgba(16,185,129,0.3)] rotate-3">
            <Wallet className="text-black" size={32} />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={12} className="text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Finance Hub</span>
          </div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Dcash</h1>
        </div>

        {/* LOGIN SOCIAL - GOOGLE */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full h-14 bg-white hover:bg-zinc-200 text-black font-black text-[11px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 mb-6 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
          Entrar com Google
        </button>

        {/* DIVISOR */}
        <div className="flex items-center gap-4 mb-6">
          <div className="h-px bg-white/5 flex-1" />
          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Ou use seu e-mail</span>
          <div className="h-px bg-white/5 flex-1" />
        </div>

        {/* FORMULÁRIO DE LOGIN */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 text-red-500 p-4 rounded-2xl text-[10px] font-black uppercase tracking-wider border border-red-500/20 animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-zinc-500 ml-2 tracking-widest">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
              <input
                type="email"
                required
                className="w-full h-14 bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-4 text-sm text-white outline-none focus:border-emerald-500/50 transition-all placeholder:text-zinc-700"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-zinc-500 ml-2 tracking-widest">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
              <input
                type="password"
                required
                className="w-full h-14 bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-4 text-sm text-white outline-none focus:border-emerald-500/50 transition-all placeholder:text-zinc-700"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                Acessar Dashboard
                <Sparkles size={14} />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-[10px] font-black uppercase tracking-widest text-zinc-600">
          Ainda não tem conta? <span className="text-emerald-500 cursor-pointer hover:underline">Solicitar convite</span>
        </p>
      </div>
    </div>
  );
}