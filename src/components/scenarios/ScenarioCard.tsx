import Badge from '@/components/ui/Badge';
import ScenarioBlockRow from '@/components/scenarios/ScenarioBlockRow';
import type { Scenario, ScenarioDeviceOption } from '@/lib/scenario-types';

interface ScenarioCardProps {
  scenario: Scenario;
  devices: ScenarioDeviceOption[];
}

export default function ScenarioCard({ scenario, devices }: ScenarioCardProps) {
  return (
    <article className="card space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-hub-text">{scenario.name}</h3>
            <Badge variant="blue">Scenario</Badge>
          </div>
          <p className="text-sm text-hub-muted">Rendering locale di blocchi azione mock.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="gray">{scenario.blocks.length} blocks</Badge>
          <Badge variant="gray">No engine</Badge>
        </div>
      </div>

      {scenario.blocks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-hub-border bg-hub-bg px-4 py-5 text-sm text-hub-muted">
          Nessun blocco azione.
        </div>
      ) : (
        <div className="space-y-2">
          {scenario.blocks.map((block, index) => (
            <ScenarioBlockRow key={block.id} block={block} index={index} devices={devices} />
          ))}
        </div>
      )}
    </article>
  );
}
