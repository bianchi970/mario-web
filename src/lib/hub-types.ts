// hub-types.ts — TypeScript interfaces mirroring mario-hub data shapes

export interface Device {
  id: string;
  device_id?: string;
  project_id: string;
  name: string;
  type: string;
  deviceClass?: string | null;
  protocol: string;
  vendor?: string | null;
  address?: string | null;
  room_id?: string | null;
  capabilities: string[];
  state: Record<string, unknown>;
  online: boolean;
  last_seen?: string | null;
  created_at: string;
  updated_at?: string;
  connectivity?: {
    status: 'online' | 'offline';
    online: boolean;
    signal?: number | null;
    address?: string | null;
    last_seen?: string | null;
  };
  metadata?: Record<string, unknown>;
  capability_timing?: Record<string, 'realtime' | 'lazy' | 'cached'>;
}

export interface Room {
  id: string;
  project_id: string;
  name: string;
  floor?: string | null;
  icon?: string | null;
  created_at: string;
}

export interface HubEvent {
  event_id?: string;
  id?: string;
  project_id?: string | null;
  device_id?: string | null;
  type: string;
  source?: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

export interface Automation {
  id: string;
  project_id: string;
  name: string;
  enabled: boolean;
  trigger_type: 'bus_event' | 'device_state' | 'schedule';
  trigger: Record<string, unknown>;
  actions: Record<string, unknown>[];
  conditions?: Record<string, unknown>[];
  created_at: string;
  updated_at?: string;
}

export interface Adapter {
  adapter_id: string;
  protocol: string;
  vendor?: string;
  status: string;
  devices?: number;
}

export interface SystemInfo {
  hostname: string;
  platform: string;
  arch: string;
  uptime_s: number;
  memory_mb: number;
  adapters: number;
  active_adapters: number;
  default_project_id: string;
}

export interface HubHealth {
  status: 'ok' | 'error';
  role?: string;
  ts?: string;
  error?: string;
}

export interface CommandResult {
  outcome: {
    status: string;
    [key: string]: unknown;
  };
  command: {
    device_id: string;
    action: string;
    params?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

export interface RegistrySnapshot {
  devices: Device[];
  stateCache?: Record<string, unknown>;
  project_id?: string;
}
