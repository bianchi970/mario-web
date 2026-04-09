import Badge from '@/components/ui/Badge';
import type { ScenarioAction } from '@/lib/scenario-types';
import { getScenarioActionVisual } from '@/components/scenarios/scenario-action-visual';

interface ScenarioActionBadgeProps {
  action: ScenarioAction;
  className?: string;
}

export default function ScenarioActionBadge({
  action,
  className = '',
}: ScenarioActionBadgeProps) {
  const { icon, label, variant } = getScenarioActionVisual(action);

  return (
    <Badge variant={variant} className={className}>
      <span className="mr-1 font-mono text-[11px] leading-none">{icon}</span>
      <span>{label}</span>
    </Badge>
  );
}
