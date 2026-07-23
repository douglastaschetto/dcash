'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/services/api';
import {
  GraduationCap, Plus, Pencil, Trash2, ArrowUp, ArrowDown,
  Eye, EyeOff, Loader2, X, Check, MousePointerClick, Navigation, Target,
} from 'lucide-react';

type TourSummary = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  isActive: boolean;
  stepCount: number;
};

type TourStep = {
  id: string;
  order: number;
  target: string;
  route: string;
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  actionType: 'none' | 'click' | 'navigate';
  actionValue: string | null;
};

type TourDetail = TourSummary & { steps: TourStep[] };

type CatalogEntry = { key: string; route: string; label: string };

type StepFormState = {
  target: string;
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  actionType: 'none' | 'click' | 'navigate';
  actionValue: string;
};

const EMPTY_STEP_FORM: StepFormState = {
  target: '',
  title: '',
  description: '',
  placement: 'bottom',
  actionType: 'none',
  actionValue: '',
};

const ACTION_ICON: Record<TourStep['actionType'], React.ReactNode> = {
  none: <Target className="h-3.5 w-3.5" />,
  click: <MousePointerClick className="h-3.5 w-3.5" />,
  navigate: <Navigation className="h-3.5 w-3.5" />,
};

const ACTION_LABEL: Record<TourStep['actionType'], string> = {
  none: '🎯 Nenhuma ação',
  click: '👆 Clicar automaticamente',
  navigate: '🧭 Navegar automaticamente',
};

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export function GuidedToursAdmin() {
  const [tours, setTours] = useState<TourSummary[]>([]);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TourDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [savingCreate, setSavingCreate] = useState(false);

  const [stepFormOpen, setStepFormOpen] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [stepForm, setStepForm] = useState<StepFormState>(EMPTY_STEP_FORM);
  const [savingStep, setSavingStep] = useState(false);

  const [busyAction, setBusyAction] = useState<string | null>(null);

  const loadTours = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/admin/guided-tours');
      setTours(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível carregar os guias.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/guided-tours/catalog');
      setCatalog(Array.isArray(data) ? data : []);
    } catch {
      setCatalog([]);
    }
  }, []);

  useEffect(() => {
    loadTours();
    loadCatalog();
  }, [loadTours, loadCatalog]);

  const loadDetail = useCallback(async (tourId: string) => {
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/admin/guided-tours/${tourId}`);
      setDetail(data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível carregar este guia.'));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const toggleExpand = (tourId: string) => {
    if (expandedId === tourId) {
      setExpandedId(null);
      setDetail(null);
      setStepFormOpen(false);
      return;
    }
    setExpandedId(tourId);
    setStepFormOpen(false);
    setDetail(null);
    loadDetail(tourId);
  };

  const createTour = async () => {
    if (!newTitle.trim()) return;
    setSavingCreate(true);
    try {
      await api.post('/admin/guided-tours', { title: newTitle.trim(), description: newDescription.trim() || undefined });
      setNewTitle('');
      setNewDescription('');
      setCreating(false);
      await loadTours();
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível criar o guia.'));
    } finally {
      setSavingCreate(false);
    }
  };

  const toggleActive = async (tour: TourSummary) => {
    setBusyAction(`active:${tour.id}`);
    try {
      await api.patch(`/admin/guided-tours/${tour.id}`, { isActive: !tour.isActive });
      await loadTours();
      if (expandedId === tour.id) await loadDetail(tour.id);
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível atualizar o guia.'));
    } finally {
      setBusyAction(null);
    }
  };

  const deleteTour = async (tour: TourSummary) => {
    if (!window.confirm(`Excluir o guia "${tour.title}"? Essa ação não pode ser desfeita.`)) return;
    setBusyAction(`delete:${tour.id}`);
    try {
      await api.delete(`/admin/guided-tours/${tour.id}`);
      if (expandedId === tour.id) { setExpandedId(null); setDetail(null); }
      await loadTours();
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível excluir o guia.'));
    } finally {
      setBusyAction(null);
    }
  };

  const openNewStepForm = () => {
    setEditingStepId(null);
    setStepForm(EMPTY_STEP_FORM);
    setStepFormOpen(true);
  };

  const openEditStepForm = (step: TourStep) => {
    setEditingStepId(step.id);
    setStepForm({
      target: step.target,
      title: step.title,
      description: step.description,
      placement: step.placement,
      actionType: step.actionType,
      actionValue: step.actionValue ?? '',
    });
    setStepFormOpen(true);
  };

  const saveStep = async () => {
    if (!detail || !stepForm.target || !stepForm.title.trim() || !stepForm.description.trim()) return;
    if (stepForm.actionType === 'navigate' && !stepForm.actionValue.trim()) return;
    setSavingStep(true);
    try {
      const payload = {
        target: stepForm.target,
        title: stepForm.title.trim(),
        description: stepForm.description.trim(),
        placement: stepForm.placement,
        actionType: stepForm.actionType,
        actionValue: stepForm.actionType === 'navigate' ? stepForm.actionValue.trim() : undefined,
      };
      if (editingStepId) {
        await api.patch(`/admin/guided-tours/${detail.id}/steps/${editingStepId}`, payload);
      } else {
        await api.post(`/admin/guided-tours/${detail.id}/steps`, payload);
      }
      setStepFormOpen(false);
      await loadDetail(detail.id);
      await loadTours();
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível salvar o passo.'));
    } finally {
      setSavingStep(false);
    }
  };

  const deleteStep = async (step: TourStep) => {
    if (!detail) return;
    if (!window.confirm(`Excluir o passo "${step.title}"?`)) return;
    setBusyAction(`step-delete:${step.id}`);
    try {
      await api.delete(`/admin/guided-tours/${detail.id}/steps/${step.id}`);
      await loadDetail(detail.id);
      await loadTours();
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível excluir o passo.'));
    } finally {
      setBusyAction(null);
    }
  };

  const moveStep = async (index: number, direction: -1 | 1) => {
    if (!detail) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= detail.steps.length) return;
    const ids = detail.steps.map((s) => s.id);
    [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
    setBusyAction(`reorder:${detail.id}`);
    try {
      await api.patch(`/admin/guided-tours/${detail.id}/steps/reorder`, { orderedStepIds: ids });
      await loadDetail(detail.id);
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível reordenar os passos.'));
    } finally {
      setBusyAction(null);
    }
  };

  const catalogEntry = (key: string) => catalog.find((c) => c.key === key);

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="rounded-[32px] bg-white border border-slate-200 shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-950 text-white">
          <div className="flex items-center gap-2 font-semibold">
            <GraduationCap className="h-4 w-4" /> Guias interativos
          </div>
          <button
            onClick={() => setCreating((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold transition"
          >
            <Plus className="h-3.5 w-3.5" /> Novo guia
          </button>
        </div>

        {creating && (
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 space-y-3">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Título do guia (ex.: Conhecendo os Cartões)"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
            />
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Descrição curta (opcional)"
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={createTour}
                disabled={!newTitle.trim() || savingCreate}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 transition disabled:opacity-50"
              >
                {savingCreate ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Criar guia
              </button>
              <button onClick={() => setCreating(false)} className="text-xs font-semibold text-slate-400 hover:text-slate-600">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
          </div>
        ) : tours.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-400">Nenhum guia criado ainda. Clique em &quot;Novo guia&quot; para começar.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {tours.map((tour) => (
              <div key={tour.id}>
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800">{tour.title}</p>
                      <span className="rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5">{tour.key}</span>
                      <span className={`rounded-full text-[10px] font-bold px-2 py-0.5 ${tour.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {tour.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">{tour.stepCount} passo{tour.stepCount !== 1 ? 's' : ''}</span>
                    </div>
                    {tour.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{tour.description}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleActive(tour)}
                      disabled={busyAction === `active:${tour.id}`}
                      title={tour.isActive ? 'Desativar' : 'Ativar'}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition disabled:opacity-50"
                    >
                      {busyAction === `active:${tour.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : tour.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => toggleExpand(tour.id)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition"
                      title="Editar passos"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteTour(tour)}
                      disabled={busyAction === `delete:${tour.id}`}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-50"
                      title="Excluir guia"
                    >
                      {busyAction === `delete:${tour.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {expandedId === tour.id && (
                  <div className="bg-slate-50 border-t border-slate-100 px-6 py-5">
                    {detailLoading || !detail ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
                    ) : (
                      <div className="space-y-3">
                        {detail.steps.length === 0 && (
                          <p className="text-xs text-slate-400 italic">Nenhum passo ainda. Adicione o primeiro abaixo.</p>
                        )}
                        {detail.steps.map((step, index) => (
                          <div key={step.id} className="flex items-start gap-3 rounded-xl bg-white border border-slate-200 px-4 py-3">
                            <div className="flex flex-col items-center gap-1 pt-0.5">
                              <button
                                onClick={() => moveStep(index, -1)}
                                disabled={index === 0 || busyAction === `reorder:${detail.id}`}
                                className="text-slate-300 hover:text-emerald-600 disabled:opacity-20"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <span className="text-[10px] font-black text-slate-400">{step.order}</span>
                              <button
                                onClick={() => moveStep(index, 1)}
                                disabled={index === detail.steps.length - 1 || busyAction === `reorder:${detail.id}`}
                                className="text-slate-300 hover:text-emerald-600 disabled:opacity-20"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-600 mb-0.5">
                                {ACTION_ICON[step.actionType]} {ACTION_LABEL[step.actionType]}
                              </div>
                              <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="rounded bg-slate-100 text-slate-500 text-[10px] font-semibold px-1.5 py-0.5">
                                  🎯 {catalogEntry(step.target)?.label ?? step.target}
                                </span>
                                <span className="text-[10px] text-slate-400">{step.route}</span>
                                {step.actionType === 'navigate' && step.actionValue && (
                                  <span className="text-[10px] text-purple-500">→ {step.actionValue}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => openEditStepForm(step)} className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => deleteStep(step)}
                                disabled={busyAction === `step-delete:${step.id}`}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-50"
                              >
                                {busyAction === `step-delete:${step.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>
                        ))}

                        {stepFormOpen ? (
                          <div className="rounded-xl bg-white border-2 border-emerald-200 px-4 py-4 space-y-3">
                            <p className="text-xs font-black uppercase tracking-wide text-emerald-600">
                              {editingStepId ? 'Editar passo' : '✨ Novo passo'}
                            </p>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-500">🎯 Elemento da tela</label>
                              <select
                                value={stepForm.target}
                                onChange={(e) => setStepForm((f) => ({ ...f, target: e.target.value }))}
                                className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                              >
                                <option value="">Selecione um elemento…</option>
                                {catalog.map((c) => (
                                  <option key={c.key} value={c.key}>{c.label} ({c.route})</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-500">Título</label>
                              <input
                                value={stepForm.title}
                                onChange={(e) => setStepForm((f) => ({ ...f, title: e.target.value }))}
                                placeholder="Ex.: 💰 Saldo do mês"
                                className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-500">Descrição</label>
                              <textarea
                                value={stepForm.description}
                                onChange={(e) => setStepForm((f) => ({ ...f, description: e.target.value }))}
                                rows={2}
                                placeholder="O que o usuário deve entender neste passo?"
                                className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] font-semibold text-slate-500">Posição do balão</label>
                                <select
                                  value={stepForm.placement}
                                  onChange={(e) => setStepForm((f) => ({ ...f, placement: e.target.value as StepFormState['placement'] }))}
                                  className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                                >
                                  <option value="bottom">Abaixo</option>
                                  <option value="top">Acima</option>
                                  <option value="left">À esquerda</option>
                                  <option value="right">À direita</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-slate-500">Ação automática</label>
                                <select
                                  value={stepForm.actionType}
                                  onChange={(e) => setStepForm((f) => ({ ...f, actionType: e.target.value as StepFormState['actionType'] }))}
                                  className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                                >
                                  <option value="none">🎯 Nenhuma</option>
                                  <option value="click">👆 Clicar sozinho</option>
                                  <option value="navigate">🧭 Navegar sozinho</option>
                                </select>
                              </div>
                            </div>
                            {stepForm.actionType === 'navigate' && (
                              <div>
                                <label className="text-[11px] font-semibold text-slate-500">Navegar para qual rota?</label>
                                <input
                                  value={stepForm.actionValue}
                                  onChange={(e) => setStepForm((f) => ({ ...f, actionValue: e.target.value }))}
                                  placeholder="/transactions"
                                  className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                                />
                              </div>
                            )}
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={saveStep}
                                disabled={savingStep || !stepForm.target || !stepForm.title.trim() || !stepForm.description.trim() || (stepForm.actionType === 'navigate' && !stepForm.actionValue.trim())}
                                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 transition disabled:opacity-50"
                              >
                                {savingStep ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                Salvar passo
                              </button>
                              <button onClick={() => setStepFormOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-slate-600">
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={openNewStepForm}
                            className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition"
                          >
                            <Plus className="h-3.5 w-3.5" /> Adicionar passo
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
