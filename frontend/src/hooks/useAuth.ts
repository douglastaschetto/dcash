'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../services/api';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('@dcash:token', res.data.access_token);
      router.push('/dashboard'); 
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  const loginSocial = async (provider: string) => {
    // Pega a URL da API da variável de ambiente
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    if (!apiUrl) {
      console.error("Variável NEXT_PUBLIC_API_URL não definida!");
      return;
    }

    // Redireciona o navegador diretamente para a rota de OAuth do Backend
    window.location.href = `${apiUrl}/auth/${provider}`;
  };

  return { login, loginSocial, loading, error };
}