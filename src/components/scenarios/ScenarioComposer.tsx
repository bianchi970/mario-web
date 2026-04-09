import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ScenarioBlockRow from '@/components/scenarios/ScenarioBlockRow';
import type {
  ScenarioAction,
  ScenarioBlock,
  ScenarioDeviceOption,
} from '@/lib/scenario-types';
import {
  SCENARIO_ACTION_OPTIONS,
  formatScenarioActionLabel,
} from '@/lib/scenario-types';

interface ScenarioComposerProps {
  name: string;
  blocks: ScenarioBlock[];
  devices: ScenarioDeviceOption[];
  selectedDevice: string;
  selectedAction: ScenarioAction;
  onNameChange: (value: string) => void;
  onSelectedDeviceChange: (value: string) => void;
  onSelectedActionChange: (value: ScenarioAction) => void;
  onAddBlock: () => void;
  onClose: () => void;
  onCreate: () => void;
}

export default function ScenarioComposer({
  name,
  blocks,
  devices,
  selectedDevice,
  selectedAction,
  onNameChange,
  onSelectedDeviceChange,
  onSelectedActionChange,
  onAddBlock,
  onClose,
  onCreate,
}: ScenarioComposerProps) {
  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-hub-text">Nuovo scenario</h3>
          <p className="text-xs text-hub-muted">Only local mock state. No execution.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Chiudi
        </Button>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wide text-hub-muted">Nome scenario</label>
        <input
          type="text"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Es. Rientro sera"
          className="w-full rounded-lg border border-hub-border bg-hub-bg px-3 py-2 text-sm text-hub-text focus:outline-none focus:border-hub-accent"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-hub-muted">Device</label>
          <select
            value={selectedDevice}
            onChange={(event) => onSelectedDeviceChange(event.target.value)}
            className="w-full rounded-lg border border-hub-border bg-hub-bg px-3 py-2 text-sm text-hub-text focus:outline-none focus:border-hub-accent"
          >
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-hub-muted">Azione</label>
          <select
            value={selectedAction}
            onChange={(event) => onSelectedActionChange(event.target.value as ScenarioAction)}
            className="w-full rounded-lg border border-hub-border bg-hub-bg px-3 py-2 text-sm text-hub-text focus:outline-none focus:border-hub-accent"
          >
            {SCENARIO_ACTION_OPTIONS.map((action) => (
              <option key={action} value={action}>
                {formatScenarioActionLabel(action)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <Button variant="secondary" className="w-full justify-center" onClick={onAddBlock}>
            Aggiungi blocco
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs uppercase tracking-wide text-hub-muted">Blocchi azione</span>
          <Badge variant="gray">{blocks.length} draft</Badge>
        </div>

        {blocks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-hub-border bg-hub-bg px-4 py-5 text-sm text-hub-muted">
            Nessun blocco azione.
          </div>
        ) : (
          <div className="space-y-2">
            {blocks.map((block, index) => (
              <ScenarioBlockRow key={block.id} block={block} index={index} devices={devices} />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Annulla
        </Button>
        <Button variant="primary" onClick={onCreate} disabled={!name.trim()}>
          Crea scenario
        </Button>
      </div>
    </section>
  );
}
