import type { ScenarioAction } from '@/lib/scenario-types';

export interface ScenarioActionVisual {
  icon: string;
  label: string;
  variant: 'green' | 'red' | 'amber' | 'blue' | 'gray';
  selectClassName: string;
}

const SCENARIO_ACTION_VISUALS: Record<ScenarioAction, ScenarioActionVisual> = {
  on: {
    icon: '+',
    label: 'On',
    variant: 'green',
    selectClassName: 'text-hub-green border-hub-green/30 focus:border-hub-green',
  },
  off: {
    icon: '-',
    label: 'Off',
    variant: 'gray',
    selectClassName: 'text-hub-muted border-hub-border focus:border-hub-border',
  },
  open: {
    icon: '>',
    label: 'Open',
    variant: 'blue',
    selectClassName: 'text-hub-accent border-hub-accent/30 focus:border-hub-accent',
  },
  close: {
    icon: '<',
    label: 'Close',
    variant: 'amber',
    selectClassName: 'text-hub-amber border-hub-amber/30 focus:border-hub-amber',
  },
};

export function getScenarioActionVisual(action: ScenarioAction) {
  return SCENARIO_ACTION_VISUALS[action];
}

export function formatScenarioActionOptionLabel(action: ScenarioAction) {
  const { icon, label } = getScenarioActionVisual(action);
  return `${icon} ${label}`;
}
