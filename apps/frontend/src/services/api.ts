const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function authHeaders(extra?: Record<string, string>): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dcash:token') : null;
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra ?? {}),
  };
}

async function parse(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err: any = new Error(body.message ?? 'Erro na requisição');
    err.response = { data: body, status: res.status };
    throw err;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const api = {
  async get(url: string, options?: { params?: Record<string, any> }) {
    const qs = options?.params
      ? '?' + new URLSearchParams(
          Object.entries(options.params)
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';
    const res = await fetch(`${BASE}${url}${qs}`, { headers: authHeaders() });
    return { data: await parse(res) };
  },

  async post(url: string, body?: any, config?: { headers?: Record<string, string> }) {
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    const res = await fetch(`${BASE}${url}`, {
      method: 'POST',
      headers: authHeaders(isForm ? config?.headers : { 'Content-Type': 'application/json', ...config?.headers }),
      body: isForm ? body : JSON.stringify(body),
    });
    return { data: await parse(res) };
  },

  async put(url: string, body?: any) {
    const res = await fetch(`${BASE}${url}`, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
    return { data: await parse(res) };
  },

  async patch(url: string, body?: any) {
    const res = await fetch(`${BASE}${url}`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
    return { data: await parse(res) };
  },

  async delete(url: string) {
    const res = await fetch(`${BASE}${url}`, { method: 'DELETE', headers: authHeaders() });
    return { data: await parse(res) };
  },
};

export default api;
