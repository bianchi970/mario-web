import type { ScenarioType } from '@/lib/scenario-types';
import { formatScenarioTypeLabel } from '@/lib/scenario-types';

interface ScenarioMetaSummaryProps {
  type: ScenarioType;
  triggerSummaryText: string;
  blockCount: number;
  ariaLabel: string;
}

export default function ScenarioMetaSummary({
  type,
  triggerSummaryText,
  blockCount,
  ariaLabel,
}: ScenarioMetaSummaryProps) {
  const conditionsSummaryText = type === 'automatic' ? 'Condizioni: Fascia oraria' : null;

  return (
    <p className="text-xs text-hub-muted" aria-label={ariaLabel}>
      {formatScenarioTypeLabel(type)} | {triggerSummaryText}
      {conditionsSummaryText ? ` | ${conditionsSummaryText}` : ''} | {blockCount} blocchi
    </p>
  );
}
