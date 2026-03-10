"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/services/api"; 
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, 
  parseISO 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, TrendingUp, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Transaction {
  id: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  isPaid: boolean;
  amount: number;
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      const response = await api.get("/transactions");
      setTransactions(response.data);
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth)),
  });

  // Determina quantas semanas o mês tem para ajustar o grid verticalmente
  const rowsCount = Math.ceil(days.length / 7);

  const getDayMetrics = (day: Date) => {
    const dayTransactions = transactions.filter(t => isSameDay(parseISO(t.date), day));
    const incomes = dayTransactions.filter(t => t.type === 'INCOME');
    const expenses = dayTransactions.filter(t => t.type === 'EXPENSE');

    return {
      hasIncomes: incomes.length > 0,
      allIncomesPaid: incomes.length > 0 && incomes.every(t => t.isPaid === true),
      incomeCount: incomes.length,
      hasExpenses: expenses.length > 0,
      allExpensesPaid: expenses.length > 0 && expenses.every(t => t.isPaid === true),
      expenseCount: expenses.length
    };
  };

  return (
    // h-screen + flex-col + overflow-hidden mata a rolagem da página
    <div className="h-screen bg-[#050505] text-zinc-400 p-2 lg:p-4 font-sans overflow-hidden flex flex-col">
      <div className="max-w-[1600px] mx-auto w-full flex flex-col h-full gap-2">
        
        {/* HEADER MINIMALISTA */}
        <header className="flex justify-between items-center shrink-0 py-1">
          <h1 className="text-white text-xl font-black uppercase italic tracking-tighter">
            FLUXO <span className="text-blue-500">MENUAL</span>
          </h1>

          <div className="flex items-center gap-2 bg-[#0f0f0f] border border-zinc-800 p-1 rounded-lg">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-zinc-800 rounded-md transition-all"><ChevronLeft size={14} /></button>
            <div className="flex items-center gap-2 min-w-[100px] justify-center">
              <span className="text-white text-[10px] font-black uppercase italic">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</span>
            </div>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-zinc-800 rounded-md transition-all"><ChevronRight size={14} /></button>
          </div>
        </header>

        {/* CONTAINER DO GRID - Ocupa todo o resto da tela */}
        <div className="bg-[#0f0f0f] border border-zinc-800/50 rounded-2xl overflow-hidden shadow-2xl flex flex-col flex-1 min-h-0">
          
          {/* DIAS DA SEMANA - Altura fixa pequena */}
          <div className="grid grid-cols-7 bg-zinc-900/30 border-b border-zinc-800 shrink-0">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
              <div key={day} className="py-2 text-center text-[8px] font-black uppercase text-zinc-600 italic tracking-widest">{day}</div>
            ))}
          </div>

          {/* CÉLULAS - Usamos grid-rows para dividir a altura total igualmente */}
          <div 
            className="grid grid-cols-7 flex-1 min-h-0"
            style={{ gridTemplateRows: `repeat(${rowsCount}, minmax(0, 1/16fr))` }}
          >
            {days.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              const metrics = getDayMetrics(day);

              return (
                <div 
                  key={idx}
                  onClick={() => router.push(`/transactions?date=${format(day, "yyyy-MM-dd")}`)}
                  className={`
                    p-1.5 border-r border-b border-zinc-800/40 
                    transition-all duration-200 relative flex flex-col justify-between
                    ${!isCurrentMonth ? "bg-black/40 opacity-5 pointer-events-none" : "hover:bg-white/[0.02] cursor-pointer"}
                  `}
                >
                  <span className={`
                    text-[9px] font-black leading-none
                    ${isToday ? "text-blue-500 underline underline-offset-4" : "text-zinc-700"}
                  `}>
                    {format(day, "d")}
                  </span>

                  {/* BADGES COMPACTOS */}
                  <div className="flex flex-col gap-1 mt-1">
                    {metrics.hasIncomes && (
                      <div className={`flex items-center gap-1 px-1 py-0.5 rounded border text-[7px] font-black uppercase ${metrics.allIncomesPaid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-blue-500/5 border-blue-500/20 text-blue-500"}`}>
                        {metrics.allIncomesPaid ? <CheckCircle2 size={7} /> : <TrendingUp size={7} />}
                        <span className="truncate">{metrics.allIncomesPaid ? "PAGO" : "REC"}</span>
                      </div>
                    )}

                    {metrics.hasExpenses && (
                      <div className={`flex items-center gap-1 px-1 py-0.5 rounded border text-[7px] font-black uppercase ${metrics.allExpensesPaid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-red-500/5 border-red-500/20 text-red-500"}`}>
                        {metrics.allExpensesPaid ? <CheckCircle2 size={7} /> : <div className="w-1 h-1 bg-red-600 rounded-full animate-pulse" />}
                        <span className="truncate">{metrics.allExpensesPaid ? "PAGO" : "PEND"}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}