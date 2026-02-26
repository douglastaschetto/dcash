"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import { CheckCircle2, Trash2, Plus, Percent, X, Edit3, Trophy } from "lucide-react";

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    id: undefined,
    month: "Janeiro",
    challenge: "",
    status: "Não iniciada"
  });

  const monthsList = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/challenges`, { params: { year: Number(year) } });
      setChallenges(res.data || []);
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

  // VERIFICAÇÃO: Já existe um desafio para este mês?
  // Se não houver id (novo registro), verificamos se o mês já está na lista
  const monthExists = challenges.some((c: any) => 
    c.month === formData.month && c.id !== formData.id
  );

  if (monthExists) {
    alert(`Já existe um desafio definido para ${formData.month}. Conclua ou edite o existente antes de criar um novo.`);
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
    // resetForm();
    fetchChallenges();
  } catch (error) { 
    alert("Erro ao salvar o desafio."); 
  }
};

  const toggleStatus = async (item: any, newStatus: string) => {
  try {
    // Montamos o objeto exatamente como o DTO do NestJS espera
    const payload = {
      id: item.id,
      month: item.month,
      year: Number(year), // Garantindo que é número
      challenge: item.challenge,
      status: newStatus,
      observations: item.observations || "" 
    };

    await api.post("/challenges", payload);
    
    fetchChallenges(); // Atualiza a lista após o sucesso
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    alert("Falha ao atualizar status. Verifique os dados.");
  }
};

  const handleDelete = async (id: string) => {
    if (confirm("Deseja realmente excluir?")) {
      try {
        await api.delete(`/challenges/${id}`);
        fetchChallenges();
      } catch (error) { 
        alert("Erro ao excluir registro."); 
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER COM STATUS ANUAL */}
        <header className="flex justify-between items-end mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-red-600 p-2 rounded-xl shadow-lg shadow-red-900/20">
                <Trophy size={24} className="text-white" />
              </div>
              <h1 className="text-4xl font-black italic uppercase text-white tracking-tighter">
                Challenges <span className="text-red-600">{year}</span>
              </h1>
            </div>
            <select 
              value={year} 
              onChange={(e) => setYear(Number(e.target.value))} 
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-red-600 transition-all"
            >
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[32px] flex items-center gap-6 backdrop-blur-md">
            <div className="text-right">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Performance Anual</p>
              <p className="text-4xl font-black italic text-white leading-none">{progressPercentage}%</p>
            </div>
            <div className="h-12 w-12 rounded-full border-4 border-zinc-800 border-t-red-600 flex items-center justify-center">
               <Percent size={18} className="text-red-600" />
            </div>
          </div>
        </header>

        {/* TABELA DE DESAFIOS */}
        <div className="bg-zinc-900/20 border border-zinc-800 rounded-[40px] overflow-hidden backdrop-blur-sm shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/50 text-[10px] uppercase font-black text-zinc-500 italic border-b border-zinc-800/50">
                <th className="px-10 py-6">Mês</th>
                <th className="px-6 py-6 w-1/2">Desafio Financeiro</th>
                <th className="px-6 py-6 text-center">Status</th>
                <th className="px-6 py-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {challenges.length > 0 ? (
                challenges.map((c: any) => (
                  <tr key={c.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-10 py-5 font-black italic text-red-500 uppercase tracking-tighter">
                      {c.month}
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-zinc-300">
                      {c.challenge}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center">
                        <select 
                          value={c.status} 
                          onChange={(e) => toggleStatus(c, e.target.value)} 
                          className={`text-[10px] font-black uppercase px-4 py-2 rounded-xl border transition-all cursor-pointer outline-none bg-zinc-950
                            ${c.status === "Concluída" 
                              ? "border-emerald-500/50 text-emerald-500" 
                              : "border-zinc-800 text-zinc-500 hover:border-zinc-600"}`}
                        >
                          <option value="Não iniciada">Não iniciada</option>
                          <option value="Em andamento">Em andamento</option>
                          <option value="Concluída">Concluída</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center gap-4">
                        <button 
                          onClick={() => handleOpenEdit(c)} 
                          className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-600 hover:text-white transition-all"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(c.id)} 
                          className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-800 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-10 py-20 text-center text-zinc-600 font-bold italic uppercase tracking-widest text-xs">
                    Nenhum desafio registrado para {year}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          <button 
            onClick={handleOpenCreate} 
            className="w-full py-8 bg-zinc-900/30 hover:bg-red-600/10 text-zinc-500 hover:text-red-500 transition-all flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] border-t border-zinc-800/50"
          >
            <Plus size={18} /> Novo Registro de Desafio
          </button>
        </div>

        {/* MODAL PARA CADASTRO E EDIÇÃO */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-[40px] p-10 relative shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
              
              <h2 className="text-2xl font-black italic uppercase text-white mb-8 tracking-tighter">
                {formData.id ? 'Editar' : 'Novo'} <span className="text-red-600">Desafio</span>
              </h2>
              
              <form onSubmit={handleSave} className="space-y-8">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 mb-3 block tracking-widest">Selecione o Mês</label>
                  <select 
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-red-600 transition-all appearance-none" 
                    value={formData.month} 
                    onChange={(e) => setFormData({...formData, month: e.target.value})}
                  >
                    {monthsList.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 mb-3 block tracking-widest">O que você vai cumprir?</label>
                  <textarea 
                    required 
                    rows={4} 
                    placeholder="Ex: Não comer fora durante a semana ou investir R$ 200 extras."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-red-600 resize-none transition-all placeholder:text-zinc-700" 
                    value={formData.challenge} 
                    onChange={(e) => setFormData({...formData, challenge: e.target.value})} 
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-black uppercase italic py-5 rounded-2xl transition-all shadow-lg shadow-red-900/20 active:scale-[0.98]"
                >
                  Confirmar Registro
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}