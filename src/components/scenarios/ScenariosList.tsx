import ScenarioCard from '@/components/scenarios/ScenarioCard';
import type { Scenario, ScenarioDeviceOption } from '@/lib/scenario-types';

interface ScenariosListProps {
  scenarios: Scenario[];
  devices: ScenarioDeviceOption[];
}

export default function ScenariosList({ scenarios, devices }: ScenariosListProps) {
  return (
    <section className="space-y-4">
      {scenarios.map((scenario) => (
        <ScenarioCard key={scenario.id} scenario={scenario} devices={devices} />
      ))}
    </section>
  );
}
