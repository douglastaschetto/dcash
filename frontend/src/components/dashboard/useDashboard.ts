import { useState, useEffect } from 'react';
import api from '@/services/api';

export function useDashboard(month: number, year: number) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/dashboard?month=${month}&year=${year}`);
      setData(res.data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, [month, year]);

  return { data, loading, error, refresh: fetchDashboard };
}