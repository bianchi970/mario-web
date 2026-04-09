'use client';

import useSWR from 'swr';

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

/**
 * Generic SWR hook for Hub API (via proxy /api/hub/...).
 * refreshInterval: 10 seconds for live data.
 */
export function useHubQuery<T>(path: string | null, refreshInterval = 10000) {
  const url = path ? `/api/hub${path}` : null;
  return useSWR<T>(url, fetcher, {
    refreshInterval,
    revalidateOnFocus: true,
  });
}
