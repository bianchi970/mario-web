import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface ScenariosHeaderProps {
  scenarioCount: number;
  blockCount: number;
  onCreate: () => void;
}

export default function ScenariosHeader({
  scenarioCount,
  blockCount,
  onCreate,
}: ScenariosHeaderProps) {
  return (
    <section className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-hub-text">Scenario Builder</h2>
          <Badge variant="blue">Mock</Badge>
        </div>
        <p className="text-sm text-hub-muted">Create local UI-only scenarios with action blocks.</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="gray">{scenarioCount} scenarios</Badge>
        <Badge variant="gray">{blockCount} blocks</Badge>
        <Button variant="primary" onClick={onCreate}>
          Nuovo scenario
        </Button>
      </div>
    </section>
  );
}
