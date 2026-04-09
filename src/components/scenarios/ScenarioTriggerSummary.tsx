import Badge from '@/components/ui/Badge';
import type { ScenarioDeviceOption, ScenarioTrigger } from '@/lib/scenario-types';
import {
  formatScenarioTriggerLabel,
  getScenarioTriggerBadgeVariant,
  getScenarioTriggerSummary,
} from '@/lib/scenario-types';

interface ScenarioTriggerSummaryProps {
  trigger: ScenarioTrigger;
  devices: ScenarioDeviceOption[];
  ariaLabel?: string;
  prefix?: string;
}

export default function ScenarioTriggerSummary({
  trigger,
  devices,
  ariaLabel,
  prefix = 'Trigger',
}: ScenarioTriggerSummaryProps) {
  const detail = getScenarioTriggerSummary(trigger, devices);

  return (
    <div className="flex items-center gap-2 text-xs text-hub-muted" aria-label={ariaLabel}>
      <span>{prefix}</span>
      <Badge variant={getScenarioTriggerBadgeVariant(trigger.type)}>
        {formatScenarioTriggerLabel(trigger.type)}
      </Badge>
      {detail && <span className="font-medium text-hub-text">{detail}</span>}
    </div>
  );
}
