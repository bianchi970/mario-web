'use client';

import { fetchAPI } from './client';

// ── Tipi risposta Hub ──────────────────────────────────────────────────────────

export interface HistoryEvent {
  id: string;
  project_id: string;
  device_id: string | null;
  type: string;
  payload: Record<string, unknown>;
  ts: string;
  source: string | null;
}

export interface DeviceHistoryResponse {
  project_id: string;
  device_id: string;
  count: number;
  events: HistoryEvent[];
}

/**
 * Un comando dello storico — dal registro del Brain (`command_outbox`), l'unico
 * dal 22/10/2026 (decisione di Romeo). Le parole (`detto`) le scrive il Brain.
 */
export interface ComandoStorico {
  command_id: string;
  device_id: string;
  device_name: string | null;
  action: string;
  detto: string;
  state: 'pending' | 'sent' | 'acked' | 'simulated' | 'failed' | 'expired';
  conferma: 'device' | 'in_corso' | 'nessuna' | null;
  origine: string | null;
  error: string | null;
  created_at: string;   // UTC, "YYYY-MM-DD HH:MM:SS"
  chiuso_at: string | null;
}

export interface StoricoComandiResponse {
  project_id: string;
  count: number;
  comandi: ComandoStorico[];
}

export interface EnergyHistorySlot {
  hour: string; // ISO "2026-06-08T14:00:00"
  total_w: number;
  devices: { device_id: string; avg_w: number; max_w: number }[];
}

export interface EnergyHistoryResponse {
  ok: boolean;
  hours: number;
  history: EnergyHistorySlot[];
}

// ── Client functions ───────────────────────────────────────────────────────────

export async function getStoricoComandi(
  projectId: string,
  limite = 50,
  signal?: AbortSignal,
): Promise<StoricoComandiResponse> {
  return fetchAPI<StoricoComandiResponse>(
    `/api/brain/projects/${encodeURIComponent(projectId)}/actions/storico?limite=${limite}`,
    { signal },
  );
}

export async function getDeviceHistory(
  projectId: string,
  deviceId: string,
  limit = 100,
  signal?: AbortSignal,
): Promise<DeviceHistoryResponse> {
  return fetchAPI<DeviceHistoryResponse>(
    `/api/hub/history/${encodeURIComponent(projectId)}/device/${encodeURIComponent(deviceId)}?limit=${limit}`,
    { signal },
  );
}

export async function getEnergyHistory(
  projectId: string,
  hours = 24,
  signal?: AbortSignal,
): Promise<EnergyHistoryResponse> {
  return fetchAPI<EnergyHistoryResponse>(
    `/api/hub/energy/${encodeURIComponent(projectId)}/history?hours=${hours}`,
    { signal },
  );
}
