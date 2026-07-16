'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, TrendingUp, Plus, Loader2, ChevronRight, CheckCircle2, Circle, Trophy } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dcash:token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type DashboardData = {
  user: { id: string; name: string; email: string; avatar?: string };
  generalBalance: number;
  monthlyReceipt: number;
  monthlyExpense: number;
  accounts: { id: string; name: string; type: string; icon: string; balance: number }[];
  creditCards: { id: string; name: string; type: string; icon: string; limit: number; available: number; invoice: number }[];
  categories: { id: string; name: string; type: string; color: string; icon: string }[];
};

type Todo = {
  id: string;
  title: string;
  isCompleted: boolean;
  userId: string;
  familyGroupId: string | null;
};

export default function DashboardPage() {
  const [showBalance, setShowBalance] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [togglingTodo, setTogglingTodo] = useState<string | null>(null);
  const [monthChallenge, setMonthChallenge] = useState<{ challenge: string; status: string } | null>(null);

  const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  useEffect(() => {
    const load = async () => {
      try {
        const now = new Date();
        const currentMonth = MONTHS_PT[now.getMonth()];
        const currentYear = now.getFullYear();
        const [dashRes, todosRes, challengesRes] = await Promise.all([
          fetch(`${API}/dashboard`, { headers: getAuthHeaders() }),
          fetch(`${API}/todos/pending`, { headers: getAuthHeaders() }),
          fetch(`${API}/challenges?year=${currentYear}`, { headers: getAuthHeaders() }),
        ]);
        if (dashRes.ok) setData(await dashRes.json());
        if (todosRes.ok) setTodos(await todosRes.json());
        if (challengesRes.ok) {
          const challenges: { month: string; challenge: string; status: string }[] = await challengesRes.json();
          const mc = challenges.find((c) => c.month === currentMonth);
          if (mc) setMonthChallenge({ challenge: mc.challenge, status: mc.status });
        }
      } catch {
        // sem conexão, data permanece null
      } finally {
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function completeTodo(todo: Todo) {
    setTogglingTodo(todo.id);
    try {
      const res = await fetch(`${API}/todos/${todo.id}/complete`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      if (res.ok) setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    } catch {}
    setTogglingTodo(null);
  }

  const userName        = data?.user?.name ?? '—';
  const generalBalance  = data?.generalBalance ?? 0;
  const monthlyReceipt  = data?.monthlyReceipt ?? 0;
  const monthlyExpense  = data?.monthlyExpense ?? 0;
  const accounts        = data?.accounts ?? [];
  const creditCards     = data?.creditCards ?? [];
  const categories      = data?.categories ?? [];

  const fmt = (n: number) =>
    n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <AppLayout title={`Boa tarde, ${userName}! 👋`} subtitle="Bem-vindo(a)" noPadding>
      <div className="h-full flex flex-col overflow-hidden">

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      )}

      {!loading && (
        <>
          {/* Frozen zone: Saldo Geral + Acesso Rápido (does not scroll) */}
          <div className="shrink-0 px-6 lg:px-8 pt-6 pb-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-950 to-emerald-800 p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-emerald-100 text-xs uppercase tracking-wide">Saldo geral</p>
                  <h2 className="text-2xl font-bold mt-1">
                    {showBalance ? `R$ ${fmt(generalBalance)}` : '••••••'}
                  </h2>
                </div>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-2 bg-emerald-700/50 rounded-full hover:bg-emerald-600/50 transition"
                >
                  {showBalance ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-emerald-100 text-[10px] uppercase tracking-wide">Receita mensal</p>
                  <p className="text-lg font-bold mt-0.5">+ R$ {fmt(monthlyReceipt)}</p>
                </div>
                <div>
                  <p className="text-emerald-100 text-[10px] uppercase tracking-wide">Despesa mensal</p>
                  <p className="text-lg font-bold mt-0.5">+ R$ {fmt(monthlyExpense)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-lg">
              <h3 className="text-sm font-bold text-emerald-950 dark:text-white mb-2.5">Acesso rápido</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 dark:bg-slate-800">
                  <div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Saldo geral</p>
                    <p className="text-sm font-semibold text-emerald-950 dark:text-white">R$ {fmt(generalBalance)}</p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <button className="w-full rounded-lg bg-emerald-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800">
                  Ver mais detalhes
                </button>
              </div>
            </div>
          </div>
          </div>

          {/* Scrollable zone: remaining dashboard sections */}
          <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-6 space-y-4">

          {/* Primeiros Passos */}
          <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Primeiros passos</p>
                <h3 className="text-lg font-bold text-emerald-950 mt-1">1 de 5 tarefas completas</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <div className="relative h-9 w-9 rounded-full">
                  <svg className="absolute inset-0" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#e0f2fe" strokeWidth="8" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#10b981" strokeWidth="8"
                      strokeDasharray="28.27 282.7" strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-emerald-950">20%</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs font-semibold text-emerald-950">Conectar conta bancária</p>
                <button className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition">
                  Continuar <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3 opacity-50">
                <p className="text-xs font-semibold text-slate-600">Adicionar cartão</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3 opacity-50">
                <p className="text-xs font-semibold text-slate-600">Configurar categorias</p>
              </div>
            </div>
          </div>

          {/* Contas e Cartões */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-emerald-950 dark:text-white">Minhas contas</h3>
                <a href="/accounts" className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
                  <Plus className="h-4 w-4" />
                </a>
              </div>
              <div className="space-y-2">
                {accounts.length === 0 && (
                  <p className="text-xs text-slate-400 py-3 text-center">Nenhuma conta cadastrada.</p>
                )}
                {accounts.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-200 hover:bg-emerald-50 dark:hover:bg-slate-800 transition cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{acc.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-emerald-950">{acc.name}</p>
                        <p className="text-xs text-slate-500">{acc.type}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-emerald-950">R$ {fmt(acc.balance ?? 0)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-emerald-950 dark:text-white">Cartões de crédito</h3>
                <a href="/cards" className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
                  <Plus className="h-4 w-4" />
                </a>
              </div>
              <div className="space-y-2">
                {creditCards.length === 0 && (
                  <p className="text-xs text-slate-400 py-3 text-center">Nenhum cartão cadastrado.</p>
                )}
                {creditCards.map((card) => (
                  <div key={card.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-200 hover:bg-emerald-50 dark:hover:bg-slate-800 transition cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{card.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-emerald-950">{card.name}</p>
                        <p className="text-xs text-slate-500">{card.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Disponível</p>
                      <p className="text-sm font-bold text-emerald-950">R$ {fmt(card.available ?? 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tarefas */}
          <div className="rounded-2xl border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Tarefas pendentes</p>
                <h3 className="text-base font-bold text-emerald-950 dark:text-white mt-0.5">
                  {todos.length} {todos.length === 1 ? 'tarefa' : 'tarefas'}
                </h3>
              </div>
              <a
                href="/todos"
                className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-400 transition"
              >
                Ver todas <ChevronRight className="h-4 w-4" />
              </a>
            </div>

            {todos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-300" />
                <p className="text-xs text-slate-400 dark:text-slate-500">Nenhuma tarefa pendente!</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {todos.slice(0, 5).map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800
                               hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-slate-800 transition group"
                  >
                    <button
                      onClick={() => completeTodo(todo)}
                      disabled={togglingTodo === todo.id}
                      className="shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-emerald-400 hover:text-emerald-500 disabled:opacity-50 transition"
                    >
                      {togglingTodo === todo.id
                        ? <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                        : <Circle className="h-4 w-4" />
                      }
                    </button>
                    <span className="flex-1 text-sm font-medium text-emerald-950 dark:text-white leading-snug">
                      {todo.title}
                    </span>
                    {todo.familyGroupId && (
                      <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        Família
                      </span>
                    )}
                  </div>
                ))}
                {todos.length > 5 && (
                  <a
                    href="/todos"
                    className="block text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 pt-1.5 transition"
                  >
                    + {todos.length - 5} tarefas a mais
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Desafio do mês */}
          <div className="rounded-2xl border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Desafio do mês</p>
                <h3 className="text-base font-bold text-emerald-950 dark:text-white mt-0.5">
                  {MONTHS_PT[new Date().getMonth()]}
                </h3>
              </div>
              <a
                href="/challenges"
                className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-400 transition"
              >
                Ver todos <ChevronRight className="h-4 w-4" />
              </a>
            </div>

            {monthChallenge ? (
              <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className={`shrink-0 mt-0.5 h-2.5 w-2.5 rounded-full ${
                  monthChallenge.status === 'Concluída'    ? 'bg-emerald-500' :
                  monthChallenge.status === 'Em andamento' ? 'bg-amber-500'   : 'bg-slate-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-950 dark:text-white leading-relaxed whitespace-pre-line">
                    {monthChallenge.challenge}
                  </p>
                  <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    monthChallenge.status === 'Concluída'    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                    monthChallenge.status === 'Em andamento' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'         :
                    'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {monthChallenge.status === 'Concluída' ? 'Concluída' :
                     monthChallenge.status === 'Em andamento' ? 'Em andamento' : 'Pendente'}
                  </span>
                </div>
                <Trophy className="shrink-0 h-4 w-4 text-emerald-400" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <Trophy className="h-8 w-8 text-slate-200 dark:text-slate-700" />
                <p className="text-xs text-slate-400 dark:text-slate-500">Nenhum desafio para este mês.</p>
                <a
                  href="/challenges"
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition"
                >
                  Criar desafio →
                </a>
              </div>
            )}
          </div>

          {/* Categorias */}
          <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-emerald-950 dark:text-white">Categorias de gastos</h3>
              <a href="/categories" className="text-sm font-semibold text-emerald-600 hover:text-emerald-800 transition">
                Gerenciar →
              </a>
            </div>
            {categories.length === 0 && (
              <p className="text-xs text-slate-400 py-3 text-center">Nenhuma categoria cadastrada.</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  style={{ backgroundColor: cat.color ? `${cat.color}18` : undefined }}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-slate-600 transition cursor-pointer"
                >
                  <span className="text-2xl">{cat.icon || '📁'}</span>
                  <span className="text-xs font-semibold text-center text-emerald-950">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
          </div>
        </>
      )}
      </div>
    </AppLayout>
  );
}
