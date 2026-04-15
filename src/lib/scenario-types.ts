export type ScenarioType = 'manual' | 'automatic';

export function formatScenarioTypeLabel(type: ScenarioType): string {
  return type === 'automatic' ? 'Automatico' : 'Manuale';
}

export interface ScenarioTrigger {
  type: 'manual' | 'schedule' | 'device_event';
  time?: string;
  deviceId?: string;
}

export function formatScenarioTriggerLabel(type: ScenarioTrigger['type']): string {
  const labels: Record<ScenarioTrigger['type'], string> = {
    manual: 'Manuale',
    schedule: 'Pianificato',
    device_event: 'Evento device',
  };
  return labels[type];
}

export function getScenarioTriggerBadgeVariant(type: ScenarioTrigger['type']): 'green' | 'red' | 'amber' | 'blue' | 'gray' {
  const variants: Record<ScenarioTrigger['type'], 'green' | 'red' | 'amber' | 'blue' | 'gray'> = {
    manual: 'gray',
    schedule: 'blue',
    device_event: 'amber',
  };
  return variants[type];
}

export function getScenarioTriggerSummary(trigger: ScenarioTrigger, devices: ScenarioDeviceOption[]): string | null {
  if (trigger.type === 'schedule') {
    return trigger.time ?? null;
  }
  if (trigger.type === 'device_event') {
    return getScenarioDeviceLabel(trigger.deviceId ?? '', devices);
  }
  return null;
}

export type ScenarioAction = 'on' | 'off' | 'open' | 'close';

export interface ScenarioBlock {
  id: string;
  deviceId: string;
  action: ScenarioAction;
}

export interface Scenario {
  id: string;
  name: string;
  type: ScenarioType;
  trigger: ScenarioTrigger;
  blocks: ScenarioBlock[];
}

export interface ScenarioDeviceOption {
  id: string;
  label: string;
}

export const SCENARIO_ACTION_OPTIONS: ScenarioAction[] = ['on', 'off', 'open', 'close'];

export function formatScenarioActionLabel(action: ScenarioAction) {
  const labels: Record<ScenarioAction, string> = {
    on: 'On',
    off: 'Off',
    open: 'Open',
    close: 'Close',
  };

  return labels[action];
}

export function getScenarioDeviceLabel(deviceId: string, devices: ScenarioDeviceOption[]) {
  return devices.find((device) => device.id === deviceId)?.label ?? deviceId;
}
