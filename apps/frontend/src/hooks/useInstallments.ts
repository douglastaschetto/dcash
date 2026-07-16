'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';

export interface InstallmentTransaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: string;
  isPaid: boolean;
  installmentGroup: string;
  totalInstallments: number;
  installmentNumber: number;
  paymentMethodType: string;
  fixedBillId?: string;
  piggyBankId?: string;
  user?: { name: string };
}

export function useInstallments() {
  const [data, setData] = useState<InstallmentTransaction[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/transactions/installments');
      setData(res.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, isLoading, error, refresh: load };
}
