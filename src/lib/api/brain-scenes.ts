'use client';

import { fetchAPI } from './client';

export interface BrainSceneStep {
  device_id: string;
  device_name?: string;
  action: string;
  params?: Record<string, unknown> | null;
}

export interface BrainScene {
  id: string;
  project_id: string;
  name: string;
  label: string;
  trigger_phrases: string[];
  steps: BrainSceneStep[];
  requires_confirm: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export async function listBrainScenes(projectId: string | undefined): Promise<BrainScene[]> {
  if (!projectId) return [];
  const res = await fetchAPI<{ scenes: BrainScene[] } | BrainScene[]>(
    `/api/brain/projects/${encodeURIComponent(projectId)}/scenes`,
  );
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object' && 'scenes' in res && Array.isArray((res as { scenes: BrainScene[] }).scenes)) {
    return (res as { scenes: BrainScene[] }).scenes;
  }
  return [];
}

export async function createBrainScene(
  projectId: string,
  payload: {
    name: string;
    label: string;
    trigger_phrases: string[];
    steps: BrainSceneStep[];
    requires_confirm?: boolean;
  },
): Promise<BrainScene> {
  return fetchAPI<BrainScene>(
    `/api/brain/projects/${encodeURIComponent(projectId)}/scenes`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function updateBrainScene(
  projectId: string,
  sceneId: string,
  patch: Partial<{
    label: string;
    trigger_phrases: string[];
    steps: BrainSceneStep[];
    requires_confirm: boolean;
    active: boolean;
  }>,
): Promise<BrainScene> {
  return fetchAPI<BrainScene>(
    `/api/brain/projects/${encodeURIComponent(projectId)}/scenes/${encodeURIComponent(sceneId)}`,
    { method: 'PATCH', body: JSON.stringify(patch) },
  );
}

export async function deleteBrainScene(projectId: string, sceneId: string): Promise<void> {
  await fetchAPI<unknown>(
    `/api/brain/projects/${encodeURIComponent(projectId)}/scenes/${encodeURIComponent(sceneId)}`,
    { method: 'DELETE' },
  );
}
