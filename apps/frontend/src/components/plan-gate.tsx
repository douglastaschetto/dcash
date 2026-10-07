'use client';

import { usePlan, FeatureKey } from '@/hooks/usePlan';
import { Zap } from '@/components/ui/icons';

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
    <div className="m-4 md:m-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border-hover bg-card px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary-border bg-primary-soft">
        <Zap className="h-5 w-5 text-accent" strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-sm font-semibold text-fg">Recurso disponível no plano {PLAN_LABELS[feature] ?? 'superior'}</p>
        <p className="text-xs text-fg-muted mt-1">Faça upgrade para desbloquear este módulo.</p>
      </div>
      <a
        href="/profile"
        className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-medium text-on-primary hover:bg-primary-hover transition-colors"
      >
        <Zap className="h-3.5 w-3.5" /> Ver planos
      </a>
    </div>
  );
}
