/**
 * hub-client.ts — Server-side typed Hub API client.
 * Used in Next.js Server Components for initial data load.
 * NOT for direct use in client components (use the proxy route instead).
 */

import type {
  Device, Room, HubEvent, Automation, Adapter,
  SystemInfo, HubHealth, RegistrySnapshot, CommandResult,
} from './hub-types';

const HUB_URL   = process.env.HUB_URL   || 'http://localhost:4001';
const HUB_TOKEN = process.env.HUB_TOKEN || '';
const DEFAULT_PROJECT_ID = process.env.DEFAULT_PROJECT_ID || 'default';
type HubEnvelope<T> = { success: boolean; data: T; error: string | null };

function isHubEnvelope<T>(payload: T | HubEnvelope<T>): payload is HubEnvelope<T> {
  return typeof payload === 'object' && payload !== null && 'data' in payload && 'success' in payload;
}

function unwrapHubPayload<T>(payload: T | HubEnvelope<T>): T {
  return isHubEnvelope(payload) ? payload.data : payload;
}

function authHeader(): Record<string, string> {
  return HUB_TOKEN ? { Authorization: `Bearer ${HUB_TOKEN}` } : {};
}

async function hubFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${HUB_URL}/api/hub${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...(options.headers ?? {}),
    },
    // No caching on server side — always fresh
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Hub API ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Public helpers ──────────────────────────────────────────────

export function getDefaultProjectId(): string {
  return DEFAULT_PROJECT_ID;
}

// ── Health / System ─────────────────────────────────────────────

export async function getHealth(): Promise<HubHealth> {
  return hubFetch<HubHealth>('/health');
}

export async function getSystem(): Promise<SystemInfo> {
  const res = await hubFetch<HubEnvelope<SystemInfo>>('/system');
  return res.data;
}

// ── Adapters ────────────────────────────────────────────────────

export async function getAdapters(): Promise<{ adapters: Adapter[] }> {
  return hubFetch<{ adapters: Adapter[] }>('/adapters');
}

// ── Devices ─────────────────────────────────────────────────────

export async function getDevices(projectId = DEFAULT_PROJECT_ID): Promise<{ devices: Device[]; project_id: string }> {
  const parseDevices = (
    res: HubEnvelope<{ devices: Device[]; project_id?: string; meta?: { project_id?: string } }>
    | { devices: Device[]; project_id?: string; meta?: { project_id?: string } }
  ) => {
    const data = unwrapHubPayload(res);

    return {
      devices: data.devices ?? [],
      project_id: data.project_id ?? data.meta?.project_id ?? projectId,
    };
  };

  try {
    const res = await hubFetch<
      HubEnvelope<{ devices: Device[]; project_id?: string; meta?: { project_id?: string } }>
      | { devices: Device[]; project_id?: string; meta?: { project_id?: string } }
    >(`/projects/${encodeURIComponent(projectId)}/devices`);

    return parseDevices(res);
  } catch {
    const res = await hubFetch<
      HubEnvelope<{ devices: Device[]; project_id?: string; meta?: { project_id?: string } }>
      | { devices: Device[]; project_id?: string; meta?: { project_id?: string } }
    >(`/devices?project_id=${encodeURIComponent(projectId)}`);

    return parseDevices(res);
  };
}

export async function getDeviceState(projectId: string, deviceId: string): Promise<{ state: Record<string, unknown>; driver?: unknown }> {
  return hubFetch(`/devices/${encodeURIComponent(projectId)}/${encodeURIComponent(deviceId)}/state`);
}

export async function sendCommand(
  projectId: string,
  deviceId: string,
  action: string,
  params: Record<string, unknown> = {},
): Promise<CommandResult> {
  return hubFetch<CommandResult>(`/devices/${encodeURIComponent(deviceId)}/command`, {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId, action, params }),
  });
}

// ── Registry ────────────────────────────────────────────────────

export async function getRegistry(projectId = DEFAULT_PROJECT_ID): Promise<RegistrySnapshot> {
  return hubFetch<RegistrySnapshot>(`/registry/${encodeURIComponent(projectId)}`);
}

// ── Rooms ────────────────────────────────────────────────────────

export async function getRooms(projectId = DEFAULT_PROJECT_ID): Promise<{ rooms: Room[] }> {
  const res = await hubFetch<HubEnvelope<{ rooms: Room[] }> | { rooms: Room[] }>(`/rooms/${encodeURIComponent(projectId)}`);
  const data = unwrapHubPayload(res);

  return {
    rooms: data.rooms ?? [],
  };
}

export async function getRoomDevices(projectId: string, roomId: string): Promise<{ devices: Device[] }> {
  return hubFetch(`/rooms/${encodeURIComponent(projectId)}/${encodeURIComponent(roomId)}/devices`);
}

export async function createRoom(projectId: string, data: { name: string; floor?: string; icon?: string }): Promise<{ room: Room }> {
  return hubFetch(`/rooms/${encodeURIComponent(projectId)}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteRoom(projectId: string, roomId: string): Promise<void> {
  await hubFetch(`/rooms/${encodeURIComponent(projectId)}/${encodeURIComponent(roomId)}`, {
    method: 'DELETE',
  });
}

// ── Events ───────────────────────────────────────────────────────

export async function getEvents(projectId = DEFAULT_PROJECT_ID, limit = 25): Promise<{ events: HubEvent[] }> {
  const res = await hubFetch<HubEnvelope<{ events: HubEvent[] }>>(`/events/${encodeURIComponent(projectId)}?limit=${limit}`);
  return res.data;
}

// ── Automations ──────────────────────────────────────────────────

export async function getAutomations(projectId = DEFAULT_PROJECT_ID): Promise<{ automations: Automation[] }> {
  return hubFetch(`/automations/${encodeURIComponent(projectId)}`);
}

// ── State ────────────────────────────────────────────────────────

export async function getProjectState(projectId = DEFAULT_PROJECT_ID): Promise<{ state: Record<string, unknown> }> {
  return hubFetch(`/state/${encodeURIComponent(projectId)}`);
}

// ── Energy ───────────────────────────────────────────────────────

export interface EnergySummary {
  ok: boolean;
  today_wh: number;
  week_wh: number;
  month_wh: number;
  current_w: number;
  peak_w: number;
}

export interface EnergyDevice {
  device_id: string;
  name: string;
  room_id: string | null;
  room_name: string | null;
  total_wh: number;
  avg_w: number;
  peak_w: number;
}

export interface EnergyByDeviceResult {
  ok: boolean;
  from: string;
  to: string;
  devices: EnergyDevice[];
}

export interface EnergyHourlySlot {
  hour: string;
  hour_ts: string;
  total_w: number;
}

export interface EnergyHourlyChart {
  ok: boolean;
  hours: number;
  slots: EnergyHourlySlot[];
}

export async function getEnergySummary(projectId = DEFAULT_PROJECT_ID): Promise<EnergySummary> {
  return hubFetch<EnergySummary>(`/energy/${encodeURIComponent(projectId)}/summary`);
}

export async function getEnergyByDevice(projectId = DEFAULT_PROJECT_ID): Promise<EnergyByDeviceResult> {
  return hubFetch<EnergyByDeviceResult>(`/energy/${encodeURIComponent(projectId)}/by-device`);
}

export async function getEnergyHourlyChart(projectId = DEFAULT_PROJECT_ID, hours = 24): Promise<EnergyHourlyChart> {
  return hubFetch<EnergyHourlyChart>(`/energy/${encodeURIComponent(projectId)}/hourly-chart?hours=${hours}`);
}
