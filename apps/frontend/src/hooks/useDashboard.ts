import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

export function useDashboard(month: number, year: number) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 1. A trava de segurança: Impede que novas requisições iniciem 
  // enquanto uma anterior ainda estiver em curso.
  const isFetching = useRef(false);

  const refresh = useCallback(async () => {
    // Se já estiver buscando, aborta a nova tentativa para evitar Call Stack
    if (isFetching.current) return;

    try {
      isFetching.current = true;
      setLoading(true);
      setError(false);
      
      // 2. Chamadas em paralelo para otimizar o carregamento
      const [dashboardRes, limitsRes] = await Promise.all([
        api.get(`/dashboard`, { params: { month, year } }),
        api.get(`/category-limits`, { params: { month, year } })
      ]);

      // 3. Mapeamento dos limites (Gasto vs Teto)
      const categoriesData = limitsRes.data.map((item: any) => ({
        id: item.id,
        name: item.category?.name || 'Categoria',
        amount: item.spent || 0,        // Quanto a família já gastou
        limit: item.amount || 0,        // Teto definido no budget
        color: item.category?.color || '#10b981'
      }));

      setData({
        ...dashboardRes.data,
        categoriesData,
        categoryLimits: limitsRes.data 
      });
      
    } catch (err) {
      console.error("Erro ao buscar dados do dashboard:", err);
      setError(true);
    } finally {
      setLoading(false);
      // Libera a trava após o término da requisição
      isFetching.current = false;
    }
  }, [month, year]); // SÓ recria a função se o mês ou ano mudarem na UI

  // 4. Efeito controlado: refresh só é chamado quando a identidade da função muda
  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}