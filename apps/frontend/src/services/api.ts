import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
});

// Configuramos o interceptor sem o 'if' externo para garantir que ele seja registrado
api.interceptors.request.use(
  (config) => {
    // Verificamos se estamos no navegador antes de acessar o localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('@dcash:token');
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// OPCIONAL: Adicione um interceptor de resposta para lidar com erro 401 (token expirado)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      // Se der erro de não autorizado, limpa o token e manda pro login
      localStorage.removeItem('@dcash:token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;