'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth'; 
import { Wallet, Lock, Mail, Loader2, Sparkles, User, ArrowLeft, Ticket, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  const { login, register, loginSocial, loading, error } = useAuth();

  // Função para limpar estados ao alternar entre login e cadastro
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setName('');
    setInviteCode('');
    // Se o hook useAuth tivesse uma função de clearError, chamaríamos aqui
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password, inviteCode);
      }
      // O redirecionamento router.push('/dashboard') acontece dentro do useAuth em caso de sucesso
    } catch (err) {
      // Erro capturado pelo catch para evitar crash, mas exibido via estado 'error' do useAuth
      console.error("Auth Action Error:", err);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading || !loginSocial) return;
    await loginSocial('google');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4 overflow-hidden relative">
      {/* Background Glows Estilizados */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full bg-zinc-900/50 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-10 border border-white/5 relative z-10">
        
        {/* Header Dinâmico */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-emerald-500 p-4 rounded-[1.5rem] mb-4 shadow-[0_0_20px_rgba(16,185,129,0.3)] rotate-3">
            <Wallet className="text-black" size={32} />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={12} className="text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">
              {isLogin ? "Finance Hub" : "Join the Club"}
            </span>
          </div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
            {isLogin ? "Dcash" : "Dcash Join"}
          </h1>
        </div>

        {/* Login Social (Apenas se estiver em modo Login) */}
        {isLogin && (
          <>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-14 bg-white hover:bg-zinc-200 text-black font-black text-[11px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 mb-6 shadow-xl disabled:opacity-50 active:scale-[0.98]"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
              Entrar com Google
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="h-px bg-white/5 flex-1" />
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Ou use seu e-mail</span>
              <div className="h-px bg-white/5 flex-1" />
            </div>
          </>
        )}

        {/* Formulário Principal */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Exibição de Erro do Backend */}
          {error && (
            <div className="bg-red-500/10 text-red-500 p-4 rounded-2xl text-[10px] font-black uppercase tracking-wider border border-red-500/20 mb-4 flex items-center gap-3 animate-in fade-in zoom-in-95">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {!isLogin && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[9px] font-black uppercase text-zinc-500 ml-2 tracking-widest">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <input
                  type="text"
                  required
                  className="w-full h-14 bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-4 text-sm text-white outline-none focus:border-emerald-500/50 transition-all placeholder:text-zinc-800"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-zinc-500 ml-2 tracking-widest">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
              <input
                type="email"
                required
                className="w-full h-14 bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-4 text-sm text-white outline-none focus:border-emerald-500/50 transition-all placeholder:text-zinc-800"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-zinc-500 ml-2 tracking-widest">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
              <input
                type="password"
                required
                className="w-full h-14 bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-4 text-sm text-white outline-none focus:border-emerald-500/50 transition-all placeholder:text-zinc-800"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="text-[9px] font-black uppercase text-zinc-500 ml-2 tracking-widest">Código de Família (Opcional)</label>
              <div className="relative">
                <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <input
                  type="text"
                  className="w-full h-14 bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-4 text-sm text-white outline-none focus:border-emerald-500/50 transition-all placeholder:text-zinc-800"
                  placeholder="Ex: FAM-123"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/10 mt-6 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {isLogin ? "Acessar Dashboard" : "Confirmar Cadastro"}
                <Sparkles size={14} />
              </>
            )}
          </button>
        </form>

        {/* Rodapé de Troca de Modo */}
        <div className="mt-8 text-center">
          <button 
            type="button"
            onClick={toggleMode}
            className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-emerald-500 transition-colors flex items-center justify-center gap-2 mx-auto group"
          >
            {isLogin ? (
              <>Ainda não tem conta? <span className="text-emerald-500 underline underline-offset-4 group-hover:text-emerald-400">Cadastre-se</span></>
            ) : (
              <><ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" /> Voltar para o Login</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}