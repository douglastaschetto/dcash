import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export function useDashboard(month: number, year: number) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      
      // Fazemos as duas chamadas em paralelo para ganhar performance
      const [dashboardRes, limitsRes] = await Promise.all([
        api.get(`/dashboard?month=${month}&year=${year}`),
        api.get(`/category-limits?month=${month}&year=${year}`)
      ]);

      // Mapeamos os dados dos limites para o formato que o seu Dashboard (ProgressBar) espera
      // O backend envia 'spent' e 'amount', a UI espera 'amount' (gasto) e 'limit' (teto)
      const categoriesData = limitsRes.data.map((item: any) => ({
        id: item.id,
        name: item.category?.name || 'Categoria',
        amount: item.spent,        // Gasto atual
        limit: item.amount,       // Teto definido
        color: item.category?.color || '#10b981'
      }));

      setData({
        ...dashboardRes.data,
        categoriesData, // Substitui os mocks pelos dados reais transformados
        categoryLimits: limitsRes.data // Mantém os dados originais se precisar
      });
      
    } catch (err) {
      console.error("Erro ao buscar dados do dashboard:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}