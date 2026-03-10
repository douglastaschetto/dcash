'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../services/api';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null); // Estado para capturar mensagens de erro
  const router = useRouter();

  // Recupera dados do localStorage ao iniciar
  useEffect(() => {
    const storedUser = localStorage.getItem('@dcash:user');
    const storedToken = localStorage.getItem('@dcash:token');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
  }, []);

  // --- FUNÇÃO: LOGIN ---
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { access_token, user: userData } = res.data;

      saveAuthData(access_token, userData);
      router.push('/dashboard'); 
    } catch (err: any) {
      const msg = err.response?.data?.message || 'E-mail ou senha incorretos';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- FUNÇÃO: CADASTRO (REGISTRO) ---
  const register = async (name: string, email: string, password: string, inviteCode?: string) => {
    setLoading(true);
    setError(null);
    try {
      // Note que aqui enviamos os dados conforme o seu RegisterDto no NestJS
      const res = await api.post('/auth/register', { 
        name, 
        email, 
        password, 
        inviteCode: inviteCode || null 
      });
      
      const { access_token, user: userData } = res.data;

      saveAuthData(access_token, userData);
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao criar conta';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- FUNÇÃO: LOGIN SOCIAL (GOOGLE) ---
  const loginSocial = async (provider: string) => {
    setLoading(true);
    try {
      // Redireciona para o fluxo OAuth do seu backend
      window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/${provider}`;
    } catch (err) {
      setError('Falha ao iniciar login social');
    } finally {
      setLoading(false);
    }
  };

  // --- FUNÇÃO: LOGOUT ---
  const logout = () => {
    localStorage.removeItem('@dcash:token');
    localStorage.removeItem('@dcash:user');
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
    router.push('/login');
  };

  // Helper para salvar dados e configurar API
  const saveAuthData = (token: string, userData: any) => {
    localStorage.setItem('@dcash:token', token);
    localStorage.setItem('@dcash:user', JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  return { login, register, loginSocial, logout, user, loading, error };
}