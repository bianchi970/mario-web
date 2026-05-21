'use client';

import type { Automation } from '@/lib/hub-types';
import { fetchAPI } from './client';

export async function listAutomations(projectId: string): Promise<Automation[]> {
  const pid = projectId.trim();
  if (!pid) throw new Error('PROJECT_REQUIRED');
  const payload = await fetchAPI<{ automations?: Automation[] }>(
    `/api/hub/automations/${encodeURIComponent(pid)}`,
    { method: 'GET' },
  );
  return Array.isArray(payload?.automations) ? payload.automations : [];
}

export async function createAutomation(
  projectId: string,
  body: Omit<Automation, 'id' | 'project_id' | 'created_at' | 'updated_at'>,
): Promise<Automation> {
  const pid = projectId.trim();
  if (!pid) throw new Error('PROJECT_REQUIRED');
  return fetchAPI<Automation>(`/api/hub/automations/${encodeURIComponent(pid)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateAutomation(
  projectId: string,
  id: string,
  patch: Partial<Omit<Automation, 'id' | 'project_id' | 'created_at'>>,
): Promise<Automation> {
  const pid = projectId.trim();
  if (!pid) throw new Error('PROJECT_REQUIRED');
  return fetchAPI<Automation>(
    `/api/hub/automations/${encodeURIComponent(pid)}/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(patch) },
  );
}

export async function deleteAutomation(
  projectId: string,
  id: string,
): Promise<{ ok: boolean }> {
  const pid = projectId.trim();
  if (!pid) throw new Error('PROJECT_REQUIRED');
  return fetchAPI<{ ok: boolean }>(
    `/api/hub/automations/${encodeURIComponent(pid)}/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
}
