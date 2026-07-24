import { fetchAPI } from './client';

export interface HubNotification {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  audience: 'client' | 'installer' | 'both';
  category: 'security' | 'maintenance' | 'comfort' | 'system' | 'energy';
  title: string;
  message: string;
  device_id: string | null;
  source_event_type: string | null;
  persistent: number;
  dismissed: number;
  created_at: string;
}

export async function listNotifications(
  projectId: string,
  audience?: 'client' | 'installer',
  signal?: AbortSignal,
): Promise<HubNotification[]> {
  const params = new URLSearchParams();
  if (audience) params.set('audience', audience);
  const qs = params.toString() ? `?${params.toString()}` : '';

  const res = await fetchAPI<{ notifications?: HubNotification[]; data?: { notifications?: HubNotification[] } }>(
    `/api/hub/notifications/${encodeURIComponent(projectId)}${qs}`,
    { signal },
  );
  return res.data?.notifications ?? (res as { notifications?: HubNotification[] }).notifications ?? [];
}

export async function dismissAllNotifications(projectId: string): Promise<number> {
  const res = await fetchAPI<{ dismissed?: number; data?: { dismissed?: number } }>(
    `/api/hub/notifications/${encodeURIComponent(projectId)}/dismiss-all`,
    { method: "PATCH" },
  );
  return res.data?.dismissed ?? (res as { dismissed?: number }).dismissed ?? 0;
}

export async function dismissNotification(
  projectId: string,
  id: string,
): Promise<void> {
  await fetchAPI(
    `/api/hub/notifications/${encodeURIComponent(projectId)}/${encodeURIComponent(id)}/dismiss`,
    { method: 'PATCH' },
  );
}
