'use client';

import type { ProjectMode, ProjectModeInfo } from '@/lib/hub-types';

export const MODE_LABELS: Record<ProjectMode, string> = {
  home:       'Casa',
  night:      'Notte',
  away:       'Fuori casa',
  vacation:   'Vacanza',
  simulation: 'Simulazione',
};

export const MODE_ORDER: ProjectMode[] = ['home', 'night', 'away', 'vacation', 'simulation'];

export async function getProjectMode(projectId: string): Promise<ProjectModeInfo | null> {
  try {
    const res = await fetch(`/api/hub/projects/${encodeURIComponent(projectId)}/mode`);
    if (!res.ok) return null;
    const data = await res.json() as { project_id?: string; mode?: string };
    if (!data.mode || !Object.prototype.hasOwnProperty.call(MODE_LABELS, data.mode)) return null;
    return { project_id: data.project_id ?? projectId, mode: data.mode as ProjectMode };
  } catch {
    return null;
  }
}

export async function setProjectMode(projectId: string, mode: ProjectMode): Promise<boolean> {
  try {
    const res = await fetch(`/api/hub/projects/${encodeURIComponent(projectId)}/mode`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
