"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import { Trash2, Plus, Percent, X, Edit3, Trophy, Loader2, AlertCircle } from "lucide-react";

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const monthsList = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const [formData, setFormData] = useState({
    id: undefined,
    month: "Janeiro",
    challenge: "",
    status: "Não iniciada"
  });

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/challenges`, { params: { year: Number(year) } });
      
      // LÓGICA DE ORDENAÇÃO: De Janeiro (0) a Dezembro (11)
      const sortedData = (res.data || []).sort((a: any, b: any) => {
        return monthsList.indexOf(a.month) - monthsList.indexOf(b.month);
      });

      setChallenges(sortedData);
    } catch (error) { 
      console.error("Erro ao carregar:", error); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchChallenges(); }, [year]);

  const progressPercentage = challenges.length > 0 
    ? Math.round((challenges.filter((c: any) => c.status === "Concluída").length / challenges.length) * 100) 
    : 0;

  const handleOpenCreate = () => {
    setFormData({ id: undefined, month: "Janeiro", challenge: "", status: "Não iniciada" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setFormData({ 
      id: item.id, 
      month: item.month, 
      challenge: item.challenge, 
      status: item.status 
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const monthExists = challenges.some((c: any) => 
      c.month === formData.month && c.id !== formData.id
    );

    if (monthExists) {
      alert(`Já existe um desafio definido para ${formData.month}.`);
      return;
    }

    try {
      const payload = {
        id: formData.id,
        month: formData.month,
        year: Number(year),
        challenge: formData.challenge,
        status: formData.status
      };
      
      await api.post("/challenges", payload);
      setIsModalOpen(false);
      fetchChallenges();
    } catch (error) { 
      alert("Erro ao salvar o desafio."); 
    }
  };

  const toggleStatus = async (item: any, newStatus: string) => {
    try {
      const payload = {
        id: item.id,
        month: item.month,
        year: Number(year),
        challenge: item.challenge,
        status: newStatus,
        observations: item.observations || "" 
      };

      await api.post("/challenges", payload);
      fetchChallenges();
    } catch (error) {
      alert("Falha ao atualizar status.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja realmente excluir este desafio?")) {
      try {
        await api.delete(`/challenges/${id}`);
        fetchChallenges();
      } catch (error) { 
        alert("Erro ao excluir registro."); 
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 p-4 lg:p-8 font-sans pb-20">
      <div className="max-w-6xl mx-auto animate-in fade-in duration-700">
        
        {/* HEADER COM STATUS ANUAL */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-red-600 p-3 rounded-2xl shadow-2xl shadow-red-900/40">
                <Trophy size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black italic uppercase text-white tracking-tighter leading-none">
                  Challenges <span className="text-red-600">{year}</span>
                </h1>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] mt-2">Financial Performance Tracking</p>
              </div>
            </div>
            <select 
              value={year} 
              onChange={(e) => setYear(Number(e.target.value))} 
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:border-red-600 transition-all hover:bg-zinc-800"
            >
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[32px] flex items-center gap-6 backdrop-blur-md shadow-inner">
            <div className="text-right">
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Conclusão Anual</p>
              <p className="text-5xl font-black italic text-white leading-none tracking-tighter">{progressPercentage}<span className="text-red-600 text-2xl">%</span></p>
            </div>
            <div className="h-14 w-14 rounded-full border-[6px] border-zinc-800 border-t-red-600 flex items-center justify-center rotate-[-45deg]">
               <Percent size={20} className="text-red-600 rotate-[45deg]" />
            </div>
          </div>
        </header>

        {/* TABELA DE DESAFIOS */}
        <div className="bg-[#0f0f0f] border border-zinc-800/50 rounded-[40px] overflow-hidden shadow-2xl relative">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-zinc-900/80 text-[10px] uppercase font-black text-zinc-500 italic border-b border-zinc-800/50">
                  <th className="px-10 py-7 tracking-widest">Mês / Período</th>
                  <th className="px-6 py-7 w-1/2 tracking-widest">Desafio Financeiro Definido</th>
                  <th className="px-6 py-7 text-center tracking-widest">Status Atual</th>
                  <th className="px-6 py-7 text-center tracking-widest">Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <Loader2 className="animate-spin mx-auto text-red-600" size={32} />
                    </td>
                  </tr>
                ) : challenges.length > 0 ? (
                  challenges.map((c: any) => (
                    <tr key={c.id} className="group hover:bg-white/[0.01] transition-all">
                      <td className="px-10 py-6 font-black italic text-red-600 uppercase tracking-tighter text-lg">
                        {c.month}
                      </td>
                      <td className="px-6 py-6 text-sm font-semibold text-zinc-300 leading-relaxed">
                        {c.challenge}
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex justify-center">
                          <select 
                            value={c.status} 
                            onChange={(e) => toggleStatus(c, e.target.value)} 
                            className={`text-[10px] font-black uppercase px-4 py-2.5 rounded-xl border transition-all cursor-pointer outline-none shadow-sm
                              ${c.status === "Concluída" 
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20" 
                                : c.status === "Em andamento"
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                                : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}
                          >
                            <option value="Não iniciada">Pendente</option>
                            <option value="Em andamento">Em curso</option>
                            <option value="Concluída">Finalizado</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => handleOpenEdit(c)} 
                            className="p-3 bg-zinc-900/50 hover:bg-white/10 rounded-2xl text-zinc-500 hover:text-white transition-all border border-transparent hover:border-zinc-700"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(c.id)} 
                            className="p-3 bg-zinc-900/50 hover:bg-red-600/10 rounded-2xl text-zinc-800 hover:text-red-500 transition-all border border-transparent hover:border-red-900/30"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-10 py-24 text-center">
                      <AlertCircle className="mx-auto text-zinc-800 mb-4" size={40} />
                      <p className="text-zinc-600 font-bold italic uppercase tracking-widest text-xs">
                        Nenhuma meta estabelecida para {year}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <button 
            onClick={handleOpenCreate} 
            className="w-full py-10 bg-zinc-900/20 hover:bg-red-600/5 text-zinc-600 hover:text-red-600 transition-all flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] border-t border-zinc-800/50 group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" /> 
            Adicionar Novo Desafio Mensal
          </button>
        </div>

        {/* MODAL PARA CADASTRO E EDIÇÃO */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-[#0a0a0a] border border-zinc-800 w-full max-w-lg rounded-[40px] p-10 relative animate-in zoom-in-95 duration-300 shadow-2xl">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="absolute top-8 right-8 text-zinc-600 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
              
              <h2 className="text-3xl font-black italic uppercase text-white mb-10 tracking-tighter leading-none">
                {formData.id ? 'Ajustar' : 'Novo'} <span className="text-red-600">Alvo</span>
              </h2>
              
              <form onSubmit={handleSave} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest ml-1">Período de Referência</label>
                  <select 
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-5 text-white outline-none focus:border-red-600 transition-all appearance-none cursor-pointer font-bold uppercase italic text-sm" 
                    value={formData.month} 
                    onChange={(e) => setFormData({...formData, month: e.target.value})}
                  >
                    {monthsList.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest ml-1">Descrição do Desafio</label>
                  <textarea 
                    required 
                    rows={4} 
                    placeholder="Ex: Reduzir gastos com delivery em 50% ou poupar R$ 500 extras."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-5 text-white outline-none focus:border-red-600 resize-none transition-all placeholder:text-zinc-800 font-medium" 
                    value={formData.challenge} 
                    onChange={(e) => setFormData({...formData, challenge: e.target.value})} 
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-black uppercase italic py-6 rounded-2xl transition-all shadow-xl shadow-red-900/30 active:scale-[0.97] tracking-widest"
                >
                  Confirmar Registro no Plano
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}