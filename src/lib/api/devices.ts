'use client';

import type { Device } from '@/lib/hub-types';
import { fetchAPI } from './client';

type HubEnvelope<T> = {
  success?: boolean;
  data?: T;
};

function unwrapPayload<T>(payload: T | HubEnvelope<T>): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as HubEnvelope<T>).data as T;
  }
  return payload as T;
}

export async function listDevices(projectId: string, signal?: AbortSignal): Promise<Device[]> {
  const trimmedProjectId = projectId.trim();
  if (!trimmedProjectId) {
    throw new Error('PROJECT_REQUIRED');
  }

  const url = `/api/hub/projects/${encodeURIComponent(trimmedProjectId)}/devices`;
  const payload = await fetchAPI<{ devices?: Device[] } | HubEnvelope<{ devices?: Device[] }>>(url, {
    method: 'GET',
    signal,
  });

  console.log('[devices] projectId=%s endpoint=%s status=%s', trimmedProjectId, url, 200);
  const data = unwrapPayload<{ devices?: Device[] } | null>(payload as { devices?: Device[] } | null);
  return Array.isArray(data?.devices) ? data.devices : [];
}
