'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import api from '@/services/api';

export function TodoWidget() {
  const [todos, setTodos] = useState<any[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Busca as tarefas do backend
  const fetchTodos = useCallback(async () => {
    try {
      const res = await api.get('/todos');
      // Garantimos que tratamos o retorno como array
      setTodos(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Erro ao buscar tarefas:", error);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    
    setLoading(true);
    try {
      // Sincronizado com seu Controller: espera { title: string }
      await api.post('/todos', { 
        title: newTodo 
      });
      setNewTodo('');
      await fetchTodos();
    } catch (error) {
      console.error("Erro ao adicionar tarefa:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTodo = async (id: string) => {
    if (!id) return;
    
    setActionLoading(id);
    try {
      // Sincronizado com seu Controller: Rota @Patch(':id/complete')
      await api.patch(`/todos/${id}/complete`);
      await fetchTodos();
    } catch (error) {
      console.error(`Erro ao completar tarefa ${id}:`, error);
      // Caso o erro 404 persista, verifique se o ID no banco é UUID ou Int
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-[#0D0D0F] p-6 rounded-[2.5rem] border border-white/5 flex flex-col h-full min-h-[400px] max-h-[450px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-black uppercase opacity-40 tracking-widest italic">Tarefas</h3>
        <span className="text-[9px] font-bold text-zinc-600 bg-white/5 px-2 py-0.5 rounded-full">
          {todos.length}
        </span>
      </div>
      
      {/* Formulário de Adição */}
      <form onSubmit={handleAddTodo} className="relative mb-6">
        <input 
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="No que você está focado?"
          className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 pr-12 text-[11px] text-white outline-none focus:border-emerald-500/50 transition-all placeholder:text-zinc-600 font-medium"
        />
        <button 
          type="submit" 
          disabled={loading || !newTodo.trim()}
          className="absolute right-2 top-2 p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all disabled:opacity-20"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} strokeWidth={3} />}
        </button>
      </form>

      {/* Lista de Tarefas */}
      <div className="space-y-1.5 overflow-y-auto custom-scrollbar flex-1 pr-2">
        {todos.length > 0 ? (
          todos.map((todo: any) => {
            const isFinished = todo.status === 'Concluída';
            const isProcessing = actionLoading === todo.id;

            return (
              <div 
                key={todo.id} 
                onClick={() => !isFinished && !isProcessing && toggleTodo(todo.id)}
                className={`
                  flex items-start gap-3 p-3 rounded-2xl cursor-pointer group transition-all border border-transparent
                  ${isFinished ? 'opacity-40 bg-transparent' : 'hover:bg-white/[0.03] hover:border-white/5'}
                  ${isProcessing ? 'cursor-wait' : ''}
                `}
              >
                <div className="mt-0.5 shrink-0">
                  {isProcessing ? (
                    <Loader2 size={14} className="animate-spin text-zinc-500" />
                  ) : isFinished ? (
                    <CheckCircle2 size={15} className="text-emerald-500" />
                  ) : (
                    <Circle size={15} className="text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                  )}
                </div>

                <span className={`
                  text-[11px] font-bold uppercase tracking-tighter leading-snug transition-all
                  ${isFinished ? 'text-zinc-500 line-through' : 'text-zinc-200'}
                `}>
                  {todo.title || todo.task || 'Sem título'}
                </span>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
            <div className="w-12 h-12 mb-4 border-2 border-dashed border-zinc-800 rounded-full flex items-center justify-center">
               <CheckCircle2 size={20} className="text-zinc-800" />
            </div>
            <p className="italic text-[9px] uppercase font-black tracking-widest text-center">
              Nada para fazer.<br/>Aproveite o dia.
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}