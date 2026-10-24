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

export interface HistoryResponse {
  project_id: string;
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

/**
 * Le letture di un genere di sensore (`sensor.temperature.changed`,
 * `sensor.lux.changed`…) fra due istanti, da QUALUNQUE device le misuri: il
 * valore è in `payload.sensor_value`. Fino al 24/10/2026 la home leggeva gli
 * ultimi 500 eventi del device `'3'`, scritto nel codice — e 500 eventi
 * coprivano 9 ore, quindi «ieri» non arrivava mai.
 */
export async function getLetture(
  projectId: string,
  tipo: string,
  da: Date,
  a: Date,
  signal?: AbortSignal,
): Promise<HistoryResponse> {
  const q = new URLSearchParams({
    event_type: tipo, from: da.toISOString(), to: a.toISOString(), limit: '5000',
  });
  return fetchAPI<HistoryResponse>(`/api/hub/history/${encodeURIComponent(projectId)}?${q}`, { signal });
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
