'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Loader2, Users, User, ChevronDown } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dcash:token') : null;
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

type Todo = {
  id: string;
  title: string;
  isCompleted: boolean;
  userId: string;
  familyGroupId: string | null;
  createdAt: string;
};

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [completedOpen, setCompletedOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pending   = todos.filter((t) => !t.isCompleted);
  const completed = todos.filter((t) => t.isCompleted);

  async function load() {
    try {
      const res = await fetch(`${API}/todos`, { headers: getAuthHeaders() });
      if (res.ok) setTodos(await res.json());
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addTodo() {
    const title = input.trim();
    if (!title) return;
    setAdding(true);
    try {
      const res = await fetch(`${API}/todos`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const todo: Todo = await res.json();
        setTodos((prev) => [todo, ...prev]);
        setInput('');
        inputRef.current?.focus();
      }
    } catch {}
    setAdding(false);
  }

  async function toggle(todo: Todo) {
    setToggling(todo.id);
    const endpoint = todo.isCompleted ? 'uncomplete' : 'complete';
    try {
      const res = await fetch(`${API}/todos/${todo.id}/${endpoint}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setTodos((prev) =>
          prev.map((t) => t.id === todo.id ? { ...t, isCompleted: !t.isCompleted } : t)
        );
      }
    } catch {}
    setToggling(null);
  }

  async function deleteTodo(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`${API}/todos/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch {}
    setDeleting(null);
  }

  return (
    <AppLayout title="Tarefas" subtitle="Organize suas atividades" noPadding>
      <div className="h-full flex flex-col overflow-hidden">

        {/* Frozen: new task card */}
        <div className="shrink-0 px-6 pt-4">
          <div data-tour="todos-add-card" className="rounded-2xl bg-emerald-950 p-4 shadow-lg">
            <p className="text-emerald-300 text-[10px] uppercase tracking-widest font-semibold mb-2">Nova tarefa</p>
            <div className="flex items-center gap-2.5">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                placeholder="NOVA TAREFA..."
                className="flex-1 bg-emerald-900/60 border border-emerald-700/50 rounded-xl px-4 py-2.5
                           text-white placeholder:text-emerald-500 font-medium tracking-wide text-sm
                           focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={addTodo}
                disabled={adding || !input.trim()}
                className="h-10 w-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50
                           flex items-center justify-center transition shrink-0"
              >
                {adding ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <Plus className="h-4 w-4 text-white" />}
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable: lists */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          )}

          {!loading && (
            <div className="space-y-4">
              {/* Pending */}
              <div data-tour="todos-pending-card" className="rounded-2xl border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Pendentes</p>
                    <h3 className="text-base font-bold text-emerald-950 dark:text-white mt-0.5">
                      {pending.length} {pending.length === 1 ? 'tarefa' : 'tarefas'}
                    </h3>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Circle className="h-4 w-4 text-amber-600" />
                  </div>
                </div>

                {pending.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <CheckCircle2 className="h-10 w-10 text-emerald-300" />
                    <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Nenhuma tarefa pendente!</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {pending.map((todo) => (
                      <TodoItem
                        key={todo.id}
                        todo={todo}
                        toggling={toggling === todo.id}
                        deleting={deleting === todo.id}
                        onToggle={() => toggle(todo)}
                        onDelete={() => deleteTodo(todo.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Completed — always collapsed by default, expandable */}
              {completed.length > 0 && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm opacity-90">
                  <button
                    data-tour="todos-completed-toggle"
                    onClick={() => setCompletedOpen((v) => !v)}
                    className="w-full flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Concluídas</p>
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {completed.length} {completed.length === 1 ? 'tarefa' : 'tarefas'}
                        </h3>
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${completedOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {completedOpen && (
                    <div className="px-4 pb-4 space-y-1.5">
                      {completed.map((todo) => (
                        <TodoItem
                          key={todo.id}
                          todo={todo}
                          toggling={toggling === todo.id}
                          deleting={deleting === todo.id}
                          onToggle={() => toggle(todo)}
                          onDelete={() => deleteTodo(todo.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function TodoItem({
  todo, toggling, deleting, onToggle, onDelete,
}: {
  todo: Todo;
  toggling: boolean;
  deleting: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition group
      ${todo.isCompleted
        ? 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50'
        : 'border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-slate-800'
      }`}
    >
      <button
        onClick={onToggle}
        disabled={toggling}
        className="shrink-0 text-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition"
      >
        {toggling
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : todo.isCompleted
            ? <CheckCircle2 className="h-4 w-4" />
            : <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-emerald-400" />
        }
      </button>

      <span className={`flex-1 text-xs font-medium leading-snug
        ${todo.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-emerald-950 dark:text-white'}`}
      >
        {todo.title}
      </span>

      {/* Family / personal badge */}
      <span className={`shrink-0 flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full
        ${todo.familyGroupId
          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
        }`}
      >
        {todo.familyGroupId
          ? <><Users className="h-3 w-3" /> Família</>
          : <><User className="h-3 w-3" /> Pessoal</>
        }
      </span>

      <button
        onClick={onDelete}
        disabled={deleting}
        className="shrink-0 p-1.5 rounded-lg text-slate-300 dark:text-slate-600
                   hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400
                   disabled:opacity-50 transition"
      >
        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
