'use client';

import { useEffect, useRef, useState } from 'react';
import { BotMessageSquare, X, Send, Sparkles } from '@/components/ui/icons';
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
        className="icon-btn"
      >
        {open ? <X className="h-4 w-4" strokeWidth={1.75} /> : <BotMessageSquare className="h-4 w-4" strokeWidth={1.75} />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 flex h-[560px] max-h-[75vh] w-96 max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 text-fg shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold">Assistente DCash</span>
            </div>
            <button onClick={toggleOpen} aria-label="Fechar">
              <X className="h-4 w-4 text-fg-muted hover:text-fg" />
            </button>
          </div>

          {/* Corpo */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-surface px-4 py-4">
            {historyLoading && (
              <p className="text-center text-xs text-fg-muted dark:text-fg-2">Carregando conversa…</p>
            )}

            {!historyLoading && messages.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Sparkles className="h-7 w-7 text-accent" />
                <p className="text-sm font-semibold text-fg-2 dark:text-fg">
                  Oi! Sou o assistente do DCash 👋
                </p>
                <p className="text-xs text-fg-muted dark:text-fg-2">
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
                      ? 'bg-primary text-on-primary'
                      : 'bg-card text-fg border border-border'
                  } ${m.failed ? 'border border-danger/30' : ''}`}
                >
                  {m.content}
                  {m.failed && (
                    <span className="mt-1 block text-[11px] text-danger">Falha ao enviar.</span>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl border border-border bg-card px-4 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-fg-muted [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-fg-muted [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-fg-muted" />
                </div>
              </div>
            )}
          </div>

          {/* Rodapé */}
          <div className="border-t border-border bg-card p-3 shrink-0">
            {error && <p className="mb-2 text-xs text-danger">{error}</p>}
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
                className="flex-1 field h-9 !px-3 disabled:opacity-60"
              />
              <button
                onClick={handleSend}
                disabled={loading || !text.trim()}
                aria-label="Enviar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary transition hover:bg-primary-hover disabled:opacity-40"
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
