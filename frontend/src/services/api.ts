import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api', // Porta padrão do seu NestJS
});

// Envia o token automaticamente em todas as chamadas
if (typeof window !== 'undefined') {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('@dcash:token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
}

export default api;