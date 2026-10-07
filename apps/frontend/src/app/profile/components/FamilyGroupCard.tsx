'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, LogIn, Check, Copy, Pencil, X, Loader2 } from '@/components/ui/icons';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dcash:token') : null;
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

type FamilyGroup = {
  id: string;
  name: string;
  inviteCode: string;
  isOwner?: boolean;
  ownerId?: string;
};

type Member = { id: string; name: string; email: string; avatar?: string };

/**
 * Fully self-contained: `/family/members` returns group info + member list
 * in one call, so this card no longer needs the parent's `/auth/me`
 * response to seed its initial state (the original inline version threaded
 * `familyGroup` through two different fetches — this fetches its own).
 */
export function FamilyGroupCard() {
  const [familyGroup, setFamilyGroup] = useState<FamilyGroup | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteInput, setInviteInput] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [joiningGroup, setJoiningGroup] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState('');
  const [joinMode, setJoinMode] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [savingGroupName, setSavingGroupName] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/family/members`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (data.members) setMembers(data.members);
      if (data.group) setFamilyGroup(data.group);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const createGroup = async () => {
    setCreatingGroup(true);
    setMsg('');
    try {
      const res = await fetch(`${API}/family/create`, { method: 'POST', headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok) {
        setFamilyGroup({ ...data, isOwner: true });
        setMsg('Grupo criado com sucesso!');
      } else {
        setMsg(data?.message || 'Erro ao criar grupo.');
      }
    } catch {
      setMsg('Erro de conexão.');
    } finally {
      setCreatingGroup(false);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  const joinGroup = async () => {
    if (!inviteInput.trim()) return;
    setJoiningGroup(true);
    setMsg('');
    try {
      const res = await fetch(`${API}/family/join`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ inviteCode: inviteInput.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (res.ok) {
        setFamilyGroup(data);
        setInviteInput('');
        setJoinMode(false);
        setMsg('Entrou no grupo com sucesso!');
        loadMembers();
      } else {
        setMsg(data?.message || 'Código inválido.');
      }
    } catch {
      setMsg('Erro de conexão.');
    } finally {
      setJoiningGroup(false);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  const saveGroupName = async () => {
    const name = groupNameInput.trim();
    if (!name || !familyGroup) return;
    setSavingGroupName(true);
    setMsg('');
    try {
      const res = await fetch(`${API}/family/rename`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        setFamilyGroup((prev) => prev ? { ...prev, name: data.name } : prev);
        setEditingGroupName(false);
        setMsg('Nome do grupo atualizado!');
      } else {
        setMsg(data?.message || 'Erro ao renomear grupo.');
      }
    } catch {
      setMsg('Erro de conexão.');
    } finally {
      setSavingGroupName(false);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  const copyCode = () => {
    if (!familyGroup?.inviteCode) return;
    navigator.clipboard.writeText(familyGroup.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div data-tour="profile-family-group" className="rounded-2xl border border-primary-border bg-gradient-to-br from-hero-from to-hero-to p-5 shadow-sm text-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Grupo Familiar</h3>
          <p className="text-xs text-emerald-200">Compartilhe finanças</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-300" />
        </div>
      ) : (
        <>
          {msg && (
            <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium
 ${msg.includes('sucesso') ? 'bg-primary text-on-primary' : 'bg-danger-soft text-danger'}`}>
              {msg}
            </div>
          )}

          {!familyGroup && (
            <div className="space-y-4">
              <p className="text-sm text-emerald-100">
                Você ainda não faz parte de um grupo familiar. Crie um ou entre com um código de convite.
              </p>

              {!joinMode ? (
                <div className="space-y-3">
                  <button
                    onClick={createGroup}
                    disabled={creatingGroup}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-card px-4 py-3 text-sm font-semibold text-fg hover:bg-primary-soft disabled:opacity-50 transition"
                  >
                    {creatingGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Criar grupo familiar
                  </button>

                  <button
                    onClick={() => setJoinMode(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary px-4 py-3 text-sm font-semibold text-emerald-100 hover:bg-primary-hover transition"
                  >
                    <LogIn className="h-4 w-4" />
                    Entrar com código
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    value={inviteInput}
                    onChange={e => setInviteInput(e.target.value.toUpperCase())}
                    placeholder="DCASH-XXXXXX"
                    className="w-full rounded-xl bg-emerald-800/60 border border-primary px-4 py-3 text-white placeholder:text-emerald-400 focus:outline-none focus:border-primary-border transition font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={joinGroup}
                      disabled={joiningGroup || !inviteInput.trim()}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-card px-4 py-3 text-sm font-semibold text-fg hover:bg-primary-soft disabled:opacity-50 transition"
                    >
                      {joiningGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                      Entrar
                    </button>
                    <button
                      onClick={() => { setJoinMode(false); setInviteInput(''); }}
                      className="rounded-xl border border-primary px-4 py-3 text-sm text-emerald-200 hover:bg-primary-hover transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {familyGroup && (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold text-emerald-300 mb-1.5">
                  Nome do grupo
                </p>
                {editingGroupName ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={groupNameInput}
                      onChange={e => setGroupNameInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveGroupName()}
                      className="flex-1 rounded-lg bg-emerald-800/60 border border-primary px-3 py-2 text-sm text-white placeholder:text-emerald-400 focus:outline-none focus:border-primary-border transition"
                    />
                    <button
                      onClick={saveGroupName}
                      disabled={savingGroupName || !groupNameInput.trim()}
                      className="p-2 rounded-lg bg-card text-fg hover:bg-primary-soft disabled:opacity-50 transition"
                    >
                      {savingGroupName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => setEditingGroupName(false)}
                      className="p-2 rounded-lg border border-primary text-emerald-200 hover:bg-primary-hover transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-emerald-800/60 rounded-lg px-3 py-2">
                    <span className="flex-1 font-semibold text-white text-sm truncate">{familyGroup.name}</span>
                    {familyGroup.isOwner && (
                      <button
                        onClick={() => { setGroupNameInput(familyGroup.name); setEditingGroupName(true); }}
                        className="p-1 text-emerald-200 hover:text-white transition"
                        title="Renomear grupo"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
                {familyGroup.isOwner && !editingGroupName && (
                  <p className="text-[11px] text-emerald-400 mt-1">Você criou este grupo e pode renomeá-lo.</p>
                )}
              </div>

              <div>
                <p className="text-[11px] font-semibold text-emerald-300 mb-1.5">
                  Código de convite
                </p>
                <div className="flex items-center gap-2 bg-emerald-800/60 rounded-lg px-3 py-2">
                  <span className="flex-1 font-mono font-semibold text-white text-sm">
                    {familyGroup.inviteCode}
                  </span>
                  <button
                    onClick={copyCode}
                    className="flex items-center gap-1.5 text-emerald-200 hover:text-white transition text-xs"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <p className="text-[11px] text-emerald-400 mt-1">
                  Compartilhe este código para outros entrarem no seu grupo.
                </p>
              </div>

              <div className="border-t border-primary pt-3">
                <p className="text-[11px] font-semibold text-emerald-300 mb-2">
                  Membros do Grupo ({members.length})
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center gap-2.5 bg-emerald-900/40 rounded-lg p-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary font-semibold text-xs shrink-0">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{member.name}</p>
                        <p className="text-[11px] text-emerald-300 truncate">{member.email}</p>
                      </div>
                      {familyGroup.ownerId === member.id && (
                        <span className="shrink-0 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300">
                          Criador
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
