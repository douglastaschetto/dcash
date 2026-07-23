'use client';

import { usePlan, FeatureKey } from '@/hooks/usePlan';
import { Zap } from 'lucide-react';

interface PlanGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

const PLAN_LABELS: Record<string, string> = {
  fixed_bills: 'Básico ou superior',
  export_reports: 'Básico ou superior',
  financial_challenges: 'Básico ou superior',
  family_group: 'Intermediário ou superior',
  dreams_goals: 'Intermediário ou superior',
  google_calendar: 'Intermediário ou superior',
  whatsapp_alerts: 'Pro',
  ofx_import: 'Intermediário ou superior',
};

export function PlanGate({ feature, children, fallback, showUpgradePrompt = true }: PlanGateProps) {
  const { can, loading } = usePlan();

  if (loading) return null;
  if (can(feature)) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  if (!showUpgradePrompt) return null;

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
        <Zap className="h-6 w-6 text-amber-500" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-700">Recurso disponível no plano {PLAN_LABELS[feature] ?? 'superior'}</p>
        <p className="text-xs text-slate-400 mt-1">Faça upgrade para desbloquear este módulo.</p>
      </div>
      <a
        href="/profile"
        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-950 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition"
      >
        <Zap className="h-3.5 w-3.5" /> Ver planos
      </a>
    </div>
  );
}
