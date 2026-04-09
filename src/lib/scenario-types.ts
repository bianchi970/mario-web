export type ScenarioAction = 'on' | 'off' | 'open' | 'close';

export interface ScenarioBlock {
  id: string;
  deviceId: string;
  action: ScenarioAction;
}

export interface Scenario {
  id: string;
  name: string;
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
