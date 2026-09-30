import api from '@/services/api';

/**
 * Shared fetcher for useSWR — wraps the existing `api` service (which
 * already attaches the auth header and unwraps `{ data }`) instead of a
 * second parallel fetch implementation.
 */
export const fetcher = (url: string) => api.get(url).then((r) => r.data);
