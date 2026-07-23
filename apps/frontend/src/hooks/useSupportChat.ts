'use client';

import { useCallback, useRef, useState } from 'react';
import api from '@/services/api';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: string;
  failed?: boolean;
}

export function useSupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingText = useRef('');

  const loadHistoryIfNeeded = useCallback(async () => {
    if (historyLoaded || historyLoading) return;
    setHistoryLoading(true);
    try {
      const { data } = await api.get('/support-ai/history');
      setMessages(Array.isArray(data) ? data : []);
      setHistoryLoaded(true);
    } catch {
      // silencioso: se falhar, o widget simplesmente começa vazio
    } finally {
      setHistoryLoading(false);
    }
  }, [historyLoaded, historyLoading]);

  const toggleOpen = useCallback(() => {
    setOpen((v) => {
      const next = !v;
      if (next) loadHistoryIfNeeded();
      return next;
    });
  }, [loadHistoryIfNeeded]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    pendingText.current = trimmed;
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, role: 'user', content: trimmed }]);
    setLoading(true);

    try {
      const { data } = await api.post('/support-ai/messages', { message: trimmed });
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        return [...withoutTemp, data.userMessage, data.assistantMessage];
      });
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, failed: true } : m)),
      );
      const msg = err instanceof Error ? err.message : null;
      setError(msg || 'Não foi possível enviar sua mensagem agora.');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  return {
    open,
    messages,
    historyLoading,
    loading,
    error,
    toggleOpen,
    sendMessage,
  };
}
