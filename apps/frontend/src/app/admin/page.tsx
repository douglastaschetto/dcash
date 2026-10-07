'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/app-layout';
import {
  Shield, Users, Zap, Check, X, Loader2,
  ToggleLeft, ToggleRight, Hash, Crown, GraduationCap,
  CreditCard, RefreshCw, Plus, Archive, ArchiveRestore,
} from '@/components/ui/icons';
import { GuidedToursAdmin } from '@/components/admin/guided-tours-admin';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dcash:token') : null;
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

type PlanFeature = {
  plan: string;
  featureKey: string;
  enabled: boolean;
  numValue: number | null;
  label: string;
  description: string | null;
};

type User = {
  id: string;
  name: string;
  email: string;
  plan: string;
  isAdmin: boolean;
  phone: string | null;
  createdAt: string;
  familyGroupId: string | null;
  familyGroupName: string | null;
  familyOwnerPlan: string | null;
};

type StripePrice = {
  id: string;
  active: boolean;
  unitAmount: number | null;
  currency: string;
  interval: string | null;
};

type StripeProduct = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  metadata: Record<string, string>;
  defaultPriceId: string | null;
  prices: StripePrice[];
};

const PLANS = ['free', 'basico', 'intermediario', 'pro'];

function formatCents(cents: number | null, currency: string): string {
  if (cents == null) return '—';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: currency.toUpperCase() });
}

const INTERVAL_LABEL: Record<string, string> = { month: '/mês', year: '/ano' };

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-surface-2 text-fg-2',
  basico: 'bg-info-soft text-info',
  intermediario: 'bg-primary-soft text-accent',
  pro: 'bg-warning-soft text-warning',
};

export default function AdminPage() {
  const [tab, setTab] = useState<'plans' | 'users' | 'guides' | 'stripe'>('plans');
  const [features, setFeatures] = useState<PlanFeature[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [userSaving, setUserSaving] = useState<string | null>(null);

  const [stripeProducts, setStripeProducts] = useState<StripeProduct[]>([]);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', amount: '', interval: 'month' as 'month' | 'year' | '' });

  const loadFeatures = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/plan-features`, { headers: getAuthHeaders() });
      if (res.status === 403) { setForbidden(true); return; }
      const data = await res.json();
      setFeatures(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/users`, { headers: getAuthHeaders() });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useEffect(() => {
    loadFeatures();
    loadUsers();
  }, [loadFeatures, loadUsers]);

  const loadStripeProducts = useCallback(async () => {
    setStripeLoading(true);
    try {
      const res = await fetch(`${API}/admin/stripe/products`, { headers: getAuthHeaders() });
      const data = await res.json();
      setStripeProducts(Array.isArray(data) ? data : []);
    } catch {
    } finally {
      setStripeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'stripe' && !stripeLoaded) {
      setStripeLoaded(true);
      loadStripeProducts();
    }
  }, [tab, stripeLoaded, loadStripeProducts]);

  const syncStripePlans = async () => {
    setSyncing(true);
    try {
      await fetch(`${API}/admin/stripe/products/sync`, { method: 'POST', headers: getAuthHeaders() });
      await loadStripeProducts();
    } finally {
      setSyncing(false);
    }
  };

  const toggleProductActive = async (product: StripeProduct) => {
    setArchiving(product.id);
    try {
      if (product.active) {
        await fetch(`${API}/admin/stripe/products/${product.id}`, { method: 'DELETE', headers: getAuthHeaders() });
      } else {
        await fetch(`${API}/admin/stripe/products/${product.id}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ active: true }),
        });
      }
      await loadStripeProducts();
    } finally {
      setArchiving(null);
    }
  };

  const createStripeProduct = async () => {
    if (!newProduct.name.trim()) return;
    setCreatingProduct(true);
    try {
      await fetch(`${API}/admin/stripe/products`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newProduct.name.trim(),
          description: newProduct.description.trim() || undefined,
          amount: newProduct.amount ? parseFloat(newProduct.amount) : undefined,
          interval: newProduct.interval || undefined,
        }),
      });
      setNewProduct({ name: '', description: '', amount: '', interval: 'month' });
      setShowNewProduct(false);
      await loadStripeProducts();
    } finally {
      setCreatingProduct(false);
    }
  };

  const toggleFeature = async (plan: string, featureKey: string, current: boolean) => {
    const key = `${plan}:${featureKey}`;
    setSaving(key);
    try {
      await fetch(`${API}/admin/plan-features/${plan}/${featureKey}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ enabled: !current }),
      });
      setFeatures(prev =>
        prev.map(f =>
          f.plan === plan && f.featureKey === featureKey ? { ...f, enabled: !current } : f,
        ),
      );
    } finally {
      setSaving(null);
    }
  };

  const updateNumValue = async (plan: string, featureKey: string, numValue: number | null) => {
    const key = `${plan}:${featureKey}:num`;
    setSaving(key);
    try {
      const feature = features.find(f => f.plan === plan && f.featureKey === featureKey);
      await fetch(`${API}/admin/plan-features/${plan}/${featureKey}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ enabled: feature?.enabled ?? false, numValue }),
      });
      setFeatures(prev =>
        prev.map(f =>
          f.plan === plan && f.featureKey === featureKey ? { ...f, numValue } : f,
        ),
      );
    } finally {
      setSaving(null);
    }
  };

  const updateUserPlan = async (userId: string, plan: string) => {
    setUserSaving(userId);
    try {
      await fetch(`${API}/admin/users/${userId}/plan`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ plan }),
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan } : u));
    } finally {
      setUserSaving(null);
    }
  };

  const toggleAdmin = async (userId: string, current: boolean) => {
    setUserSaving(userId + ':admin');
    try {
      await fetch(`${API}/admin/users/${userId}/admin`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isAdmin: !current }),
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isAdmin: !current } : u));
    } finally {
      setUserSaving(null);
    }
  };

  if (forbidden) {
    return (
      <AppLayout title="Acesso negado">
        <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
          <Shield className="h-16 w-16 text-danger" />
          <p className="text-xl font-semibold text-fg-2 dark:text-fg">Acesso restrito</p>
          <p className="text-sm text-fg-muted">Esta área é exclusiva para administradores do sistema.</p>
        </div>
      </AppLayout>
    );
  }

  // Organise features by featureKey rows, plans as columns
  const featureKeys = [...new Set(features.map(f => f.featureKey))];

  return (
    <AppLayout title="Painel Administrativo" subtitle="Configurações de planos e usuários">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('plans')}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition
 ${tab === 'plans' ? 'bg-primary text-on-primary' : 'bg-card border border-border text-fg-2 hover:border-primary-border'}`}
        >
          <Zap className="h-4 w-4" /> Funcionalidades por Plano
        </button>
        <button
          onClick={() => setTab('users')}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition
 ${tab === 'users' ? 'bg-primary text-on-primary' : 'bg-card border border-border text-fg-2 hover:border-primary-border'}`}
        >
          <Users className="h-4 w-4" /> Usuários
        </button>
        <button
          onClick={() => setTab('guides')}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition
 ${tab === 'guides' ? 'bg-primary text-on-primary' : 'bg-card border border-border text-fg-2 hover:border-primary-border'}`}
        >
          <GraduationCap className="h-4 w-4" /> Guias
        </button>
        <button
          onClick={() => setTab('stripe')}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition
 ${tab === 'stripe' ? 'bg-primary text-on-primary' : 'bg-card border border-border text-fg-2 hover:border-primary-border'}`}
        >
          <CreditCard className="h-4 w-4" /> Produtos Stripe
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : tab === 'plans' ? (
        /* ── Plan Features Matrix ─────────────────────────────────── */
        <div className="rounded-2xl bg-card border border-border shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-on-primary">
                  <th className="px-6 py-4 text-left font-semibold w-56">Funcionalidade</th>
                  {PLANS.map(p => (
                    <th key={p} className="px-4 py-4 text-center font-semibold capitalize min-w-[130px]">
                      {p === 'intermediario' ? 'Intermediário' : p.charAt(0).toUpperCase() + p.slice(1)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureKeys.map((fk, i) => {
                  const anyFeature = features.find(f => f.featureKey === fk);
                  return (
                    <tr key={fk} className={i % 2 === 0 ? 'bg-card' : 'bg-surface-2'}>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-fg">{anyFeature?.label ?? fk}</p>
                        {anyFeature?.description && (
                          <p className="text-xs text-fg-muted mt-0.5">{anyFeature.description}</p>
                        )}
                      </td>
                      {PLANS.map(plan => {
                        const f = features.find(x => x.plan === plan && x.featureKey === fk);
                        const key = `${plan}:${fk}`;
                        const isSaving = saving === key || saving === `${key}:num`;
                        if (!f) return <td key={plan} className="px-4 py-4 text-center text-fg-disabled">—</td>;
                        return (
                          <td key={plan} className="px-4 py-4 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <button
                                onClick={() => toggleFeature(plan, fk, f.enabled)}
                                disabled={!!isSaving}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition
 ${f.enabled
                                    ? 'bg-primary-soft text-accent hover:bg-primary-soft'
                                    : 'bg-danger-soft text-danger hover:bg-danger-soft'}
 disabled:opacity-50`}
                              >
                                {isSaving && saving === key
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : f.enabled
                                    ? <><Check className="h-3 w-3" /> Ativo</>
                                    : <><X className="h-3 w-3" /> Inativo</>}
                              </button>
                              {/* Numeric limit input */}
                              {(fk === 'trial_days' || fk === 'max_categories' || fk === 'max_cards') && f.enabled && (
                                <div className="flex items-center gap-1">
                                  <Hash className="h-3 w-3 text-fg-muted" />
                                  <input
                                    type="number"
                                    min={1}
                                    defaultValue={f.numValue ?? ''}
                                    onBlur={e => {
                                      const v = parseInt(e.target.value);
                                      if (!isNaN(v) && v !== f.numValue) {
                                        updateNumValue(plan, fk, v);
                                      }
                                    }}
                                    className="w-14 rounded border border-border bg-white dark:bg-surface-2 text-fg px-2 py-1 text-xs text-center focus:outline-none focus:border-primary"
                                  />
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-surface-2 border-t border-border">
            <p className="text-xs text-fg-muted">Clique em Ativo/Inativo para alternar. Para limites numéricos, edite o valor e clique fora para salvar.</p>
          </div>
        </div>
      ) : tab === 'guides' ? (
        <GuidedToursAdmin />
      ) : tab === 'stripe' ? (
        /* ── Stripe Products ──────────────────────────────────────── */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card border border-border shadow-lg px-6 py-4">
            <p className="text-sm text-fg-muted dark:text-fg-2">
              Sincronize os planos DCash como Produtos/Preços no Stripe, ou crie um produto avulso.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewProduct(v => !v)}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold border border-border text-fg-2 hover:border-primary-border transition"
              >
                <Plus className="h-4 w-4" /> Novo produto
              </button>
              <button
                onClick={syncStripePlans}
                disabled={syncing}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold bg-primary text-on-primary hover:bg-primary-hover transition disabled:opacity-50"
              >
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sincronizar planos DCash
              </button>
            </div>
          </div>

          {showNewProduct && (
            <div className="rounded-2xl bg-card border border-border shadow-lg px-6 py-5">
              <p className="text-sm font-semibold text-fg-2 dark:text-fg mb-3">Novo produto</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Nome"
                  value={newProduct.name}
                  onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                  className="rounded-lg border border-border bg-card dark:bg-surface-2 text-fg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
                <input
                  type="text"
                  placeholder="Descrição (opcional)"
                  value={newProduct.description}
                  onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))}
                  className="rounded-lg border border-border bg-card dark:bg-surface-2 text-fg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Preço (R$, opcional)"
                  value={newProduct.amount}
                  onChange={e => setNewProduct(p => ({ ...p, amount: e.target.value }))}
                  className="rounded-lg border border-border bg-card dark:bg-surface-2 text-fg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
                <select
                  value={newProduct.interval}
                  onChange={e => setNewProduct(p => ({ ...p, interval: e.target.value as 'month' | 'year' | '' }))}
                  className="rounded-lg border border-border bg-card dark:bg-surface-2 text-fg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="month">Recorrente mensal</option>
                  <option value="year">Recorrente anual</option>
                  <option value="">Avulso (sem recorrência)</option>
                </select>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={createStripeProduct}
                  disabled={creatingProduct || !newProduct.name.trim()}
                  className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold bg-primary text-on-primary hover:bg-primary-hover transition disabled:opacity-50"
                >
                  {creatingProduct && <Loader2 className="h-4 w-4 animate-spin" />}
                  Criar produto
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-card border border-border shadow-lg overflow-hidden">
            {stripeLoading ? (
              <div className="flex items-center justify-center py-32">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
              </div>
            ) : stripeProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
                <CreditCard className="h-10 w-10 text-fg-disabled dark:text-fg-muted" />
                <p className="text-sm text-fg-muted">Nenhum produto no Stripe ainda. Clique em "Sincronizar planos DCash" para criar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-primary text-on-primary">
                      <th className="px-6 py-4 text-left font-semibold">Produto</th>
                      <th className="px-4 py-4 text-left font-semibold">Preços</th>
                      <th className="px-4 py-4 text-center font-semibold">Status</th>
                      <th className="px-4 py-4 text-center font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stripeProducts.map((p, i) => (
                      <tr key={p.id} className={i % 2 === 0 ? 'bg-card' : 'bg-surface-2'}>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-fg flex items-center gap-1.5">
                            {p.name}
                            {p.metadata?.plan_key && (
                              <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-soft text-accent capitalize">
                                {p.metadata.plan_key}
                              </span>
                            )}
                          </p>
                          {p.description && <p className="text-xs text-fg-muted mt-0.5">{p.description}</p>}
                          <p className="text-[11px] text-fg-disabled dark:text-fg-muted mt-0.5">{p.id}</p>
                        </td>
                        <td className="px-4 py-4">
                          {p.prices.length === 0 ? (
                            <span className="text-xs text-fg-disabled dark:text-fg-muted">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {p.prices.map(price => (
                                <span
                                  key={price.id}
                                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${price.active ? 'bg-surface-2 text-fg-2' : 'bg-surface-2 text-fg-disabled dark:text-fg-muted line-through'}`}
                                >
                                  {formatCents(price.unitAmount, price.currency)}
                                  {price.interval && INTERVAL_LABEL[price.interval]}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.active ? 'bg-primary-soft text-accent' : 'bg-danger-soft text-danger'}`}>
                            {p.active ? 'Ativo' : 'Arquivado'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => toggleProductActive(p)}
                            disabled={archiving === p.id}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border border-border text-fg-muted dark:text-fg-2 hover:border-primary-border hover:text-accent transition disabled:opacity-50"
                            title={p.active ? 'Arquivar produto' : 'Reativar produto'}
                          >
                            {archiving === p.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : p.active ? <><Archive className="h-3 w-3" /> Arquivar</> : <><ArchiveRestore className="h-3 w-3" /> Reativar</>}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Users Table ──────────────────────────────────────────── */
        <div className="rounded-2xl bg-card border border-border shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-on-primary">
                  <th className="px-6 py-4 text-left font-semibold">Usuário</th>
                  <th className="px-4 py-4 text-left font-semibold">Plano próprio</th>
                  <th className="px-4 py-4 text-left font-semibold">Família</th>
                  <th className="px-4 py-4 text-center font-semibold">Admin</th>
                  <th className="px-4 py-4 text-left font-semibold">Alterar plano</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} className={i % 2 === 0 ? 'bg-card' : 'bg-surface-2'}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-accent font-semibold text-sm shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-fg flex items-center gap-1.5">
                            {u.name}
                            {u.isAdmin && <Crown className="h-3.5 w-3.5 text-warning" />}
                          </p>
                          <p className="text-xs text-fg-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${PLAN_COLORS[u.plan?.toLowerCase()] ?? PLAN_COLORS.free}`}>
                        {u.plan?.toLowerCase() ?? 'free'}
                      </span>
                      {u.familyOwnerPlan && u.familyOwnerPlan !== u.plan && (
                        <p className="text-xs text-accent mt-0.5">
                          Efetivo: <span className="font-semibold capitalize">{u.familyOwnerPlan}</span>
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {u.familyGroupName ? (
                        <p className="text-xs text-fg-2">{u.familyGroupName}</p>
                      ) : (
                        <span className="text-xs text-fg-disabled dark:text-fg-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => toggleAdmin(u.id, u.isAdmin)}
                        disabled={userSaving === u.id + ':admin'}
                        className={`rounded-lg p-1.5 transition
 ${u.isAdmin ? 'text-warning hover:bg-warning-soft' : 'text-fg-disabled dark:text-fg-muted hover:bg-hover'}
 disabled:opacity-50`}
                        title={u.isAdmin ? 'Remover admin' : 'Tornar admin'}
                      >
                        {userSaving === u.id + ':admin'
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Crown className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        {PLANS.map(p => (
                          <button
                            key={p}
                            onClick={() => updateUserPlan(u.id, p)}
                            disabled={userSaving === u.id || u.plan?.toLowerCase() === p}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition capitalize
 ${u.plan?.toLowerCase() === p
 ? `${PLAN_COLORS[p]} cursor-default`
 : 'border border-border text-fg-muted dark:text-fg-2 hover:border-primary hover:text-accent '}
 disabled:opacity-60`}
                          >
                            {userSaving === u.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : p === 'intermediario' ? 'Inter.' : p}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-surface-2 border-t border-border">
            <p className="text-xs text-fg-muted">{users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}.</p>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
