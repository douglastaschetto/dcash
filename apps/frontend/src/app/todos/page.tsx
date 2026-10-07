'use client';

import { useState, useRef } from 'react';
import useSWR from 'swr';
import { Plus, Trash2, CheckCircle2, Circle, Loader2, Users, User, ChevronDown } from '@/components/ui/icons';
import { AppLayout } from '@/components/app-layout';
import api from '@/services/api';

type Todo = {
  id: string;
  title: string;
  isCompleted: boolean;
  userId: string;
  familyGroupId: string | null;
  createdAt: string;
};

export default function TodosPage() {
  const { data: todos = [], isLoading: loading, mutate } = useSWR<Todo[]>('/todos');
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [completedOpen, setCompletedOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pending   = todos.filter((t) => !t.isCompleted);
  const completed = todos.filter((t) => t.isCompleted);

  async function addTodo() {
    const title = input.trim();
    if (!title) return;
    setAdding(true);
    try {
      const { data: todo } = await api.post('/todos', { title });
      mutate((prev) => [todo, ...(prev ?? [])], { revalidate: false });
      setInput('');
      inputRef.current?.focus();
    } catch {}
    setAdding(false);
  }

  async function toggle(todo: Todo) {
    setToggling(todo.id);
    const endpoint = todo.isCompleted ? 'uncomplete' : 'complete';
    try {
      await api.patch(`/todos/${todo.id}/${endpoint}`);
      mutate(
        (prev) => prev?.map((t) => t.id === todo.id ? { ...t, isCompleted: !t.isCompleted } : t),
        { revalidate: false },
      );
    } catch {}
    setToggling(null);
  }

  async function deleteTodo(id: string) {
    setDeleting(id);
    try {
      await api.delete(`/todos/${id}`);
      mutate((prev) => prev?.filter((t) => t.id !== id), { revalidate: false });
    } catch {}
    setDeleting(null);
  }

  return (
    <AppLayout title="Tarefas" subtitle="Organize suas atividades" noPadding>
      <div className="h-full flex flex-col overflow-hidden">

        {/* Frozen: new task card */}
        <div className="shrink-0 px-6 pt-4">
          <div data-tour="todos-add-card" className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[13px] font-medium text-fg-2 mb-2">Nova tarefa</p>
            <div className="flex items-center gap-2.5">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                placeholder="O que precisa ser feito?"
                className="field flex-1"
              />
              <button
                onClick={addTodo}
                disabled={adding || !input.trim()}
                className="btn btn-primary btn-square shrink-0"
              >
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable: lists */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          )}

          {!loading && (
            <div className="space-y-4">
              {/* Pending */}
              <div data-tour="todos-pending-card" className="rounded-2xl border border-primary-border dark:border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[11px] font-semibold text-accent tracking-wide">Pendentes</p>
                    <h3 className="text-base font-semibold text-fg mt-0.5">
                      {pending.length} {pending.length === 1 ? 'tarefa' : 'tarefas'}
                    </h3>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-warning-soft flex items-center justify-center">
                    <Circle className="h-4 w-4 text-warning" />
                  </div>
                </div>

                {pending.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <CheckCircle2 className="h-10 w-10 text-emerald-300" />
                    <p className="text-sm text-fg-muted font-medium">Nenhuma tarefa pendente!</p>
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
                <div className="rounded-2xl border border-border bg-card shadow-sm opacity-90">
                  <button
                    data-tour="todos-completed-toggle"
                    onClick={() => setCompletedOpen((v) => !v)}
                    className="w-full flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-accent" />
                      </div>
                      <div className="text-left">
                        <p className="text-[11px] font-semibold text-fg-muted dark:text-fg-2 tracking-wide">Concluídas</p>
                        <h3 className="text-sm font-semibold text-fg-2">
                          {completed.length} {completed.length === 1 ? 'tarefa' : 'tarefas'}
                        </h3>
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-fg-muted transition-transform ${completedOpen ? 'rotate-180' : ''}`} />
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
        ? 'border-border bg-surface-2'
        : 'border-border hover:border-primary-border hover:bg-primary-soft dark:hover:bg-hover'
      }`}
    >
      <button
        onClick={onToggle}
        disabled={toggling}
        className="shrink-0 text-accent hover:text-accent disabled:opacity-50 transition"
      >
        {toggling
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : todo.isCompleted
            ? <CheckCircle2 className="h-4 w-4" />
            : <Circle className="h-4 w-4 text-fg-disabled dark:text-fg-muted group-hover:text-accent" />
        }
      </button>

      <span className={`flex-1 text-xs font-medium leading-snug
 ${todo.isCompleted ? 'line-through text-fg-muted' : 'text-fg'}`}
      >
        {todo.title}
      </span>

      {/* Family / personal badge */}
      <span className={`shrink-0 flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full
 ${todo.familyGroupId
          ? 'bg-info-soft text-info'
          : 'bg-surface-2 dark:bg-track text-fg-muted dark:text-fg-2'
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
        className="shrink-0 p-1.5 rounded-lg text-fg-disabled dark:text-fg-muted
 hover:bg-danger-soft hover:text-danger 
 disabled:opacity-50 transition"
      >
        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
