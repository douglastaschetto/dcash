'use client';

import { SWRConfig } from 'swr';
import { fetcher } from '@/lib/swr';

/**
 * revalidateOnFocus/Reconnect are off on purpose: no page in this app
 * currently refetches in the background, so turning those on by default
 * would be a silent behavior change (extra requests, numbers shifting
 * under the user's cursor) rather than a pure infra swap. Pages can opt
 * into either per-hook via `useSWR(key, fetcher, { revalidateOnFocus: true })`.
 */
export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ fetcher, revalidateOnFocus: false, revalidateOnReconnect: false }}>
      {children}
    </SWRConfig>
  );
}
