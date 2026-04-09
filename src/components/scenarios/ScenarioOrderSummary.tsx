import Badge from '@/components/ui/Badge';
import ScenarioActionBadge from '@/components/scenarios/ScenarioActionBadge';
import type { ScenarioBlock, ScenarioDeviceOption } from '@/lib/scenario-types';
import { getScenarioDeviceLabel } from '@/lib/scenario-types';

interface ScenarioOrderSummaryProps {
  blocks: ScenarioBlock[];
  devices: ScenarioDeviceOption[];
}

export default function ScenarioOrderSummary({
  blocks,
  devices,
}: ScenarioOrderSummaryProps) {
  if (!blocks.length) {
    return null;
  }

  return (
    <div
      className="rounded-lg border border-hub-border/60 bg-hub-bg px-3 py-3"
      aria-label="Ordine esecuzione"
    >
      <p className="text-xs uppercase tracking-wide text-hub-muted">Ordine esecuzione</p>
      <div className="mt-2 space-y-1">
        {blocks.map((block, index) => (
          <div key={`summary-${block.id}`} className="flex items-center gap-3 text-sm text-hub-text">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-hub-accent/30 bg-hub-accent/15 text-xs font-semibold text-hub-accent">
              {index + 1}
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <p className="truncate">{getScenarioDeviceLabel(block.deviceId, devices)}</p>
              <span className="text-hub-muted" aria-hidden="true">
                -&gt;
              </span>
              <ScenarioActionBadge action={block.action} />
            </div>
            {!index ? (
              <Badge variant="blue">Inizio</Badge>
            ) : index === blocks.length - 1 ? (
              <Badge variant="blue">Fine</Badge>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
