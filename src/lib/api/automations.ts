'use client';

import type { Automation, AutomationRun } from '@/lib/hub-types';
import { fetchAPI } from './client';

/** Formato risposta Hub normalizzato (B86) */
type HubResponse<T> = { success: boolean; data: T | null; error: unknown };

export async function listAutomations(projectId: string): Promise<Automation[]> {
  const pid = projectId.trim();
  if (!pid) throw new Error('PROJECT_REQUIRED');
  const payload = await fetchAPI<HubResponse<{ automations?: Automation[] }>>(
    `/api/hub/automations/${encodeURIComponent(pid)}`,
    { method: 'GET' },
  );
  const list = payload?.data?.automations;
  return Array.isArray(list) ? list : [];
}

export async function createAutomation(
  projectId: string,
  body: Omit<Automation, 'id' | 'project_id' | 'created_at' | 'updated_at'>,
): Promise<Automation> {
  const pid = projectId.trim();
  if (!pid) throw new Error('PROJECT_REQUIRED');
  const payload = await fetchAPI<HubResponse<{ automation: Automation }>>(
    `/api/hub/automations/${encodeURIComponent(pid)}`,
    { method: 'POST', body: JSON.stringify(body) },
  );
  if (!payload?.data?.automation) throw new Error('CREATE_FAILED');
  return payload.data.automation;
}

export async function updateAutomation(
  projectId: string,
  id: string,
  patch: Partial<Omit<Automation, 'id' | 'project_id' | 'created_at'>>,
): Promise<Automation> {
  const pid = projectId.trim();
  if (!pid) throw new Error('PROJECT_REQUIRED');
  const payload = await fetchAPI<HubResponse<{ automation: Automation }>>(
    `/api/hub/automations/${encodeURIComponent(pid)}/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(patch) },
  );
  if (!payload?.data?.automation) throw new Error('UPDATE_FAILED');
  return payload.data.automation;
}

export async function deleteAutomation(
  projectId: string,
  id: string,
): Promise<{ ok: boolean }> {
  const pid = projectId.trim();
  if (!pid) throw new Error('PROJECT_REQUIRED');
  const payload = await fetchAPI<HubResponse<{ deleted?: boolean }>>(
    `/api/hub/automations/${encodeURIComponent(pid)}/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
  return { ok: payload?.success === true };
}

export async function listAutomationRuns(
  projectId: string,
  automationId: string,
  limit = 10,
): Promise<AutomationRun[]> {
  const pid = projectId.trim();
  if (!pid) throw new Error('PROJECT_REQUIRED');
  const base = `/api/hub/automations/${encodeURIComponent(pid)}/${encodeURIComponent(automationId)}`;
  const payload = await fetchAPI<HubResponse<{ runs?: AutomationRun[] }>>(
    `${base}/runs?limit=${limit}`,
  );
  const list = payload?.data?.runs;
  return Array.isArray(list) ? list : [];
}

export async function runAutomation(
  projectId: string,
  id: string,
): Promise<{ status: string }> {
  const pid = projectId.trim();
  if (!pid) throw new Error('PROJECT_REQUIRED');
  return fetchAPI<{ status: string }>(
    `/api/scenarios/${encodeURIComponent(id)}/run?projectId=${encodeURIComponent(pid)}`,
    { method: 'POST' },
  );
}
