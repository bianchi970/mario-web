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

export interface HistorySummaryEntry {
  type: string;
  source: string | null;
  count: number;
}

export interface HistorySummaryResponse {
  project_id: string;
  summary: HistorySummaryEntry[];
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

export async function getHistorySummary(
  projectId: string,
  signal?: AbortSignal,
): Promise<HistorySummaryResponse> {
  return fetchAPI<HistorySummaryResponse>(
    `/api/hub/history/${encodeURIComponent(projectId)}/summary`,
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
