'use client';

import { fetchAPI } from './client';

export interface HubUser {
  id: string;
  username: string;
  role: 'admin' | 'installatore' | 'utente';
  project_id: string | null;
  active: number; // 1 = attivo, 0 = disattivo (SQLite boolean)
  created_at?: string;
}

export async function listUsers(): Promise<HubUser[]> {
  const data = await fetchAPI<{ success: boolean; data: HubUser[] }>('/api/hub/users');
  return data.data ?? [];
}

export async function createUser(body: {
  username: string;
  password: string;
  role: HubUser['role'];
  project_id?: string | null;
}): Promise<HubUser> {
  const data = await fetchAPI<{ success: boolean; data: HubUser }>('/api/hub/users', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.data;
}

export async function updateUser(
  id: string,
  body: { role?: HubUser['role']; password?: string; active?: boolean; project_id?: string | null },
): Promise<HubUser> {
  const data = await fetchAPI<{ success: boolean; data: HubUser }>(`/api/hub/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return data.data;
}

export async function deactivateUser(id: string): Promise<void> {
  await fetchAPI(`/api/hub/users/${id}`, { method: 'DELETE' });
}
