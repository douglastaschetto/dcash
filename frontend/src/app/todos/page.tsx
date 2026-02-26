"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import { Plus, Check, Trash2, ListTodo, Circle } from "lucide-react";

export default function TodoPage() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");

  const fetchTodos = async () => {
  try {
    const res = await api.get("/todos");
    setTodos(res.data);
  } catch (error: any) {
    console.error("ERRO DETALHADO:", error.response?.data); // Isso vai mostrar a mensagem real do NestJS
  }
};

  useEffect(() => { fetchTodos(); }, []);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    await api.post("/todos", { title: newTodo });
    setNewTodo("");
    fetchTodos();
  };

  const handleComplete = async (id: string) => {
    await api.patch(`/todos/${id}/complete`);
    fetchTodos();
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-8">
      <div className="max-w-2xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">
            📝 To-Do <span className="text-emerald-500">List</span>
          </h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em]">Foco nas atividades pendentes</p>
        </header>

        {/* Campo de Entrada */}
        <form onSubmit={handleAddTodo} className="relative mb-8 group">
          <input 
            type="text"
            className="w-full bg-[#161616] border-2 border-zinc-800 rounded-[1.5rem] p-5 pl-6 text-white outline-none focus:border-emerald-500 transition-all font-bold placeholder:text-zinc-700"
            placeholder="O que precisa ser feito agora?"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
          />
          <button type="submit" className="absolute right-3 top-3 bg-emerald-500 hover:bg-emerald-400 text-black p-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20">
            <Plus size={20} />
          </button>
        </form>

        {/* Lista de Tarefas */}
        <div className="space-y-3">
          {todos.length === 0 && (
            <div className="text-center py-20 border-2 border-dashed border-zinc-900 rounded-[2rem]">
              <ListTodo size={40} className="mx-auto text-zinc-800 mb-4" />
              <p className="text-zinc-600 font-black uppercase text-xs tracking-widest">Nenhuma tarefa pendente</p>
            </div>
          )}

          {todos.map((todo: any) => (
            <div 
              key={todo.id}
              className="group flex items-center justify-between bg-[#161616] border border-zinc-800 p-5 rounded-[1.5rem] hover:border-emerald-500/50 transition-all"
            >
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleComplete(todo.id)}
                  className="w-8 h-8 rounded-full border-2 border-zinc-800 flex items-center justify-center text-transparent group-hover:border-emerald-500 hover:bg-emerald-500/10 transition-all"
                >
                  <Check size={16} className="group-hover:text-emerald-500" />
                </button>
                <span className="font-bold text-zinc-300 group-hover:text-white transition-colors">
                  {todo.title}
                </span>
              </div>
              
              <button 
                onClick={async () => { await api.delete(`/todos/${todo.id}`); fetchTodos(); }}
                className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-500 transition-all"
              >
                <Trash2 size={18} />
              </button> 
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}