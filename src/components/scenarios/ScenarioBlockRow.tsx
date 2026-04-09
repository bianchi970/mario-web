import Badge from '@/components/ui/Badge';
import type { ScenarioBlock, ScenarioDeviceOption } from '@/lib/scenario-types';
import { formatScenarioActionLabel, getScenarioDeviceLabel } from '@/lib/scenario-types';

interface ScenarioBlockRowProps {
  block: ScenarioBlock;
  index: number;
  devices: ScenarioDeviceOption[];
}

export default function ScenarioBlockRow({ block, index, devices }: ScenarioBlockRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-hub-border/60 bg-hub-bg px-3 py-3 text-sm">
      <div className="min-w-0">
        <p className="font-medium text-hub-text">Blocco {index + 1}</p>
        <p className="text-xs text-hub-muted">
          {getScenarioDeviceLabel(block.deviceId, devices)} -&gt; {formatScenarioActionLabel(block.action)}
        </p>
      </div>
      <Badge variant="gray">{block.action}</Badge>
    </div>
  );
}
