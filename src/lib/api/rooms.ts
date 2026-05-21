'use client';

import type { Room } from '@/lib/hub-types';
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

export async function createRoom(projectId: string, name: string): Promise<Room> {
  const trimmedProjectId = projectId.trim();
  if (!trimmedProjectId) throw new Error('PROJECT_REQUIRED');
  const url = `/api/hub/rooms/${encodeURIComponent(trimmedProjectId)}`;
  const payload = await fetchAPI<HubEnvelope<{ room?: Room }>>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = unwrapPayload<{ room?: Room } | null>(payload as { room?: Room } | null);
  if (!data?.room) throw new Error('ROOM_CREATE_FAILED');
  return data.room;
}

export async function listRooms(projectId: string, signal?: AbortSignal): Promise<Room[]> {
  const trimmedProjectId = projectId.trim();
  if (!trimmedProjectId) {
    throw new Error('PROJECT_REQUIRED');
  }

  const url = `/api/hub/rooms/${encodeURIComponent(trimmedProjectId)}`;
  const payload = await fetchAPI<{ rooms?: Room[] } | HubEnvelope<{ rooms?: Room[] }>>(url, {
    method: 'GET',
    signal,
  });

  console.log('[rooms] projectId=%s endpoint=%s status=%s', trimmedProjectId, url, 200);
  const data = unwrapPayload<{ rooms?: Room[] } | null>(payload as { rooms?: Room[] } | null);
  return Array.isArray(data?.rooms) ? data.rooms : [];
}
