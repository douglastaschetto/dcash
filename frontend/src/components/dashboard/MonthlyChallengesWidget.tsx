"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import { Trophy, Target, CheckCircle2, Circle, Loader2 } from "lucide-react";

export default function MonthlyChallengesWidget() {
  const [allChallenges, setAllChallenges] = useState([]); // Agora guardamos todos do ano
  const [loading, setLoading] = useState(true);

  const currentMonth = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date());
  const formattedMonth = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);
  const currentYear = new Date().getFullYear();

  const fetchChallenges = async () => {
    try {
      const res = await api.get(`/challenges`, { params: { year: currentYear } });
      setAllChallenges(res.data || []);
    } catch (error) {
      console.error("Erro ao carregar desafios:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, [currentYear]);

  const handleToggleStatus = async (item: any, newStatus: string) => {
    try {
      await api.post("/challenges", {
        id: item.id,
        month: item.month,
        year: Number(item.year),
        challenge: item.challenge,
        status: newStatus,
      });
      fetchChallenges(); // Recarrega para atualizar progresso anual
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  if (loading) return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-6 h-48 flex items-center justify-center">
      <Loader2 className="animate-spin text-red-600" />
    </div>
  );

  // FILTRO: Apenas os desafios que aparecem visualmente (mês atual)
  const monthlyVisible = allChallenges.filter((c: any) => c.month === formattedMonth);

  // CÁLCULO: Progresso baseado no ANO inteiro
  const completedYear = allChallenges.filter((c: any) => c.status === "Concluída").length;
  const totalYear = allChallenges.length;
  const annualProgressPercent = totalYear > 0 ? (completedYear / totalYear) * 100 : 0;

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-6 backdrop-blur-md">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-white font-black italic uppercase tracking-tighter text-lg">
            Foco de <span className="text-red-600">{formattedMonth}</span>
          </h3>
          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Desafio Mensal</p>
        </div>
        <Trophy size={20} className="text-red-600" />
      </div>

      <div className="space-y-3">
        {monthlyVisible.length > 0 ? (
          monthlyVisible.map((item: any) => (
            <div key={item.id} className="bg-zinc-950/50 p-3 rounded-2xl border border-zinc-800 transition-all">
              <div className="flex items-start gap-3 mb-2 text-left">
                {item.status === "Concluída" ? (
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <Target size={16} className="text-red-600 shrink-0 mt-0.5" />
                )}
                <p className={`text-[11px] font-bold leading-tight ${item.status === "Concluída" ? "text-zinc-500 line-through" : "text-zinc-300"}`}>
                  {item.challenge}
                </p>
              </div>

              <select 
                value={item.status} 
                onChange={(e) => handleToggleStatus(item, e.target.value)}
                className={`w-full text-[9px] font-black uppercase p-2 rounded-lg border outline-none cursor-pointer bg-zinc-900
                  ${item.status === "Concluída" ? "border-emerald-500/50 text-emerald-500" : "border-zinc-800 text-zinc-500"}`}
              >
                <option value="Não iniciada">Não iniciada</option>
                <option value="Em andamento">Em andamento</option>
                <option value="Concluída">Concluída</option>
              </select>
            </div>
          ))
        ) : (
          <div className="py-6 border-2 border-dashed border-zinc-800 rounded-2xl text-center">
            <p className="text-[10px] font-black uppercase text-zinc-700 italic">Sem desafios para {formattedMonth}</p>
          </div>
        )}
      </div>

      {/* RODAPÉ: AGORA REFLETINDO O PROGRESSO ANUAL */}
      <div className="mt-5">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
          <span>Progresso Anual</span>
          <span className="text-white">{completedYear}/{totalYear}</span>
        </div>
        <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/50">
          <div 
            className="h-full bg-red-600 transition-all duration-500 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
            style={{ width: `${annualProgressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}