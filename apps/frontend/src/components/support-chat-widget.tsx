'use client';

import { useEffect, useRef, useState } from 'react';
import { BotMessageSquare, X, Send, Sparkles } from 'lucide-react';
import { useSupportChat } from '@/hooks/useSupportChat';
import { usePlan } from '@/hooks/usePlan';

export function SupportChatWidget() {
  const { open, messages, historyLoading, loading, error, toggleOpen, sendMessage } = useSupportChat();
  const { isPro } = usePlan();
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (open && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        toggleOpen();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, toggleOpen]);

  const handleSend = () => {
    if (!text.trim() || loading) return;
    sendMessage(text);
    setText('');
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggleOpen}
        aria-label={open ? 'Fechar assistente de suporte' : 'Abrir assistente de suporte'}
        className="relative p-2 text-slate-500 dark:text-emerald-300/70 hover:text-emerald-950 dark:hover:text-white transition"
      >
        {open ? <X className="h-5 w-5" /> : <BotMessageSquare className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 flex h-[560px] max-h-[75vh] w-96 max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl dark:border-emerald-900 dark:bg-emerald-950">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between bg-emerald-950 px-4 py-3 text-white shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              <span className="text-sm font-bold">Assistente DCash</span>
            </div>
            <button onClick={toggleOpen} aria-label="Fechar">
              <X className="h-4 w-4 text-emerald-300 hover:text-white" />
            </button>
          </div>

          {/* Corpo */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4 dark:bg-emerald-950/40">
            {historyLoading && (
              <p className="text-center text-xs text-slate-400 dark:text-emerald-300/60">Carregando conversa…</p>
            )}

            {!historyLoading && messages.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Sparkles className="h-7 w-7 text-emerald-400" />
                <p className="text-sm font-semibold text-slate-700 dark:text-emerald-100">
                  Oi! Sou o assistente do DCash 👋
                </p>
                <p className="text-xs text-slate-500 dark:text-emerald-300/70">
                  {isPro
                    ? 'Pergunte sobre como usar o app ou sobre seus dados reais — saldo, gastos do mês, parcelas, planejamento, cofrinhos e sonhos.'
                    : 'Pode perguntar como usar qualquer parte do app — contas, contas fixas, cofrinhos, planejamento e mais.'}
                </p>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.role === 'user'
                      ? 'bg-emerald-800 text-white'
                      : 'bg-white text-slate-700 shadow-sm dark:bg-emerald-900 dark:text-emerald-50'
                  } ${m.failed ? 'border border-red-300' : ''}`}
                >
                  {m.content}
                  {m.failed && (
                    <span className="mt-1 block text-[11px] text-red-500">Falha ao enviar.</span>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-emerald-900">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                </div>
              </div>
            )}
          </div>

          {/* Rodapé */}
          <div className="border-t border-slate-100 bg-white p-3 dark:border-emerald-900 dark:bg-emerald-950 shrink-0">
            {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
                placeholder="Digite sua dúvida…"
                disabled={loading}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 disabled:opacity-60 dark:border-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-50"
              />
              <button
                onClick={handleSend}
                disabled={loading || !text.trim()}
                aria-label="Enviar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white transition hover:bg-emerald-700 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
