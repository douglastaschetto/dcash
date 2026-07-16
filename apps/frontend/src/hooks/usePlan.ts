'use client';

import { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export type FeatureKey =
  | 'trial_days'
  | 'max_categories'
  | 'max_cards'
  | 'fixed_bills'
  | 'export_reports'
  | 'family_group'
  | 'dreams_goals'
  | 'whatsapp_alerts'
  | 'google_calendar'
  | 'financial_challenges';

export interface FeatureValue {
  enabled: boolean;
  numValue: number | null;
  label: string;
  description: string | null;
}

export interface PlanContext {
  plan: string;
  features: Record<string, FeatureValue>;
  loading: boolean;
  can: (key: FeatureKey) => boolean;
  limit: (key: FeatureKey) => number | null;
  isPro: boolean;
  isFree: boolean;
  refresh: () => void;
}

export function usePlan(): PlanContext {
  const [plan, setPlan] = useState('free');
  const [features, setFeatures] = useState<Record<string, FeatureValue>>({});
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('dcash:token') : null;
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/plan/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan ?? 'free');
        setFeatures(data.features ?? {});
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  return {
    plan,
    features,
    loading,
    can: (key: FeatureKey) => features[key]?.enabled ?? false,
    limit: (key: FeatureKey) => features[key]?.numValue ?? null,
    isPro: plan === 'pro',
    isFree: plan === 'free',
    refresh: fetch_,
  };
}
