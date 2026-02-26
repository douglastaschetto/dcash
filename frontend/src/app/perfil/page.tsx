"use client";

import { useState, useEffect } from 'react';
import { 
  User as LucideUser, 
  Mail as LucideMail, 
  Copy as LucideCopy, 
  Check as LucideCheck, 
  Save as LucideSave, 
  Plus as LucidePlus, 
  Loader2 as LucideLoader2, 
  Sparkles as LucideSparkles, 
  Users as LucideUsers, 
  LogIn as LucideLogIn 
} from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth'; // Usando seu hook customizado
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function PerfilPage() {
  const { user } = useAuth() as any; // Pegando dados do usuário logado
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    avatar: "",
    familyGroup: null as any
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        // Rota que criamos no NestJS para pegar dados do usuário logado
        const response = await api.get('/auth/me'); 
        setUserData(response.data);
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/users/profile', { name: userData.name });
      // Toast de sucesso aqui seria ideal
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateFamily = async () => {
    try {
      setSaving(true);
      const response = await api.post('/family/create');
      setUserData(prev => ({ ...prev, familyGroup: response.data }));
    } catch (error) {
      alert("Erro ao criar grupo familiar.");
    } finally {
      setSaving(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!inviteCodeInput) return;
    try {
      setSaving(true);
      await api.post('/family/join', { inviteCode: inviteCodeInput });
      const updatedUser = await api.get('/auth/me');
      setUserData(updatedUser.data);
      setInviteCodeInput("");
    } catch (error) {
      alert("Código inválido ou grupo não encontrado.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyInvite = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050505]">
        <LucideLoader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA 1: DADOS PESSOAIS */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleUpdateProfile} className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
                <LucideUser size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Dados Pessoais</h2>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Sua identidade no DCASH</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-center gap-6 pb-8 border-b border-white/5">
                <div className="w-24 h-24 rounded-[2rem] bg-zinc-950 border-2 border-emerald-500/20 overflow-hidden flex items-center justify-center shadow-2xl">
                  {userData.avatar ? (
                    <img src={userData.avatar} className="w-full h-full object-cover" alt="Avatar" />
                  ) : (
                    <span className="text-3xl font-black text-emerald-500 italic">
                      {userData.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase italic">Avatar</h3>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tight">Sincronizado via Login Social</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input 
                  label="Nome Completo"
                  icon={<LucideUser size={16} />}
                  value={userData.name}
                  onChange={(e) => setUserData({...userData, name: e.target.value})}
                />
                
                <Input 
                  label="E-mail (Permanente)"
                  icon={<LucideMail size={16} />}
                  value={userData.email}
                  disabled
                  className="opacity-50 cursor-not-allowed"
                />
              </div>

              <div className="w-48">
                <Button type="submit" loading={saving} icon={<LucideSave size={16} />}>
                  Salvar
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* COLUNA 2: GRUPO FAMILIAR */}
        <div className="space-y-6">
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] p-8 relative overflow-hidden h-full flex flex-col">
            <LucideSparkles className="absolute -right-4 -top-4 text-emerald-500/10 rotate-12" size={80} />
            
            <div className="flex items-center gap-4 mb-8 relative z-10">
              <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-500">
                <LucideUsers size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Família</h2>
                <p className="text-[10px] text-emerald-500/60 font-black uppercase tracking-widest">Finanças em Conjunto</p>
              </div>
            </div>

            {!userData.familyGroup ? (
              <div className="space-y-6 relative z-10 flex-1 flex flex-col justify-center">
                <p className="text-[11px] text-zinc-400 font-bold leading-relaxed text-center px-4">
                  Conecte-se com sua família para gerenciar orçamentos e cartões compartilhados.
                </p>
                
                <Button onClick={handleCreateFamily} icon={<LucidePlus size={16} />}>
                  Criar Grupo
                </Button>

                <div className="relative py-2 flex items-center">
                  <div className="flex-grow border-t border-white/5"></div>
                  <span className="mx-4 text-[8px] font-black text-zinc-600 uppercase">Ou</span>
                  <div className="flex-grow border-t border-white/5"></div>
                </div>

                <div className="space-y-3">
                  <input 
                    placeholder="CÓDIGO"
                    value={inviteCodeInput}
                    onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                    className="w-full h-14 bg-zinc-950 border border-white/5 rounded-2xl px-4 text-center text-sm font-black tracking-widest text-emerald-500 outline-none focus:border-emerald-500/50"
                  />
                  <Button variant="outline" onClick={handleJoinFamily} disabled={!inviteCodeInput}>
                    <LucideLogIn size={16} /> Entrar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 relative z-10">
                <div className="bg-zinc-950 p-6 rounded-3xl border border-white/5">
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Convite Ativo</span>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xl font-black text-emerald-500 tracking-widest italic uppercase">
                      {userData.familyGroup.inviteCode}
                    </span>
                    <button 
                      onClick={() => handleCopyInvite(userData.familyGroup.inviteCode)}
                      className={`p-2.5 rounded-xl transition-all ${copied ? 'bg-emerald-500 text-black' : 'bg-white/5 text-zinc-400 hover:text-white'}`}
                    >
                      {copied ? <LucideCheck size={18} /> : <LucideCopy size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-2">Membros do Grupo</span>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {userData.familyGroup.members?.map((member: any) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center overflow-hidden border border-emerald-500/20">
                            {member.avatar ? (
                              <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-black text-emerald-500">{member.name?.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-white uppercase italic">{member.name}</p>
                            <p className="text-[8px] text-zinc-500 uppercase font-bold">
                              {member.id === user?.id ? "Você" : "Membro"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}