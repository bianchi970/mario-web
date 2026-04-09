'use client';

import TopBar from '@/components/layout/TopBar';
import ScenarioComposer from '@/components/scenarios/ScenarioComposer';
import ScenariosEmptyState from '@/components/scenarios/ScenariosEmptyState';
import ScenariosHeader from '@/components/scenarios/ScenariosHeader';
import ScenariosList from '@/components/scenarios/ScenariosList';
import { useScenarioBuilder } from '@/hooks/useScenarioBuilder';
import {
  SCENARIO_INITIAL_SCENARIOS,
  SCENARIO_MOCK_DEVICES,
} from '@/lib/scenarios-mock';

export default function ScenariosPage() {
  const {
    scenarios,
    isCreating,
    scenarioName,
    draftBlocks,
    selectedDevice,
    selectedAction,
    totalBlocks,
    setScenarioName,
    setSelectedDevice,
    setSelectedAction,
    openComposer,
    closeComposer,
    addBlock,
    createScenario,
  } = useScenarioBuilder({
    initialScenarios: SCENARIO_INITIAL_SCENARIOS,
    devices: SCENARIO_MOCK_DEVICES,
  });

  return (
    <>
      <TopBar title="Scenarios" />
      <main className="flex-1 p-5 space-y-6">
        <ScenariosHeader
          scenarioCount={scenarios.length}
          blockCount={totalBlocks}
          onCreate={openComposer}
        />

        {isCreating && (
          <ScenarioComposer
            name={scenarioName}
            blocks={draftBlocks}
            devices={SCENARIO_MOCK_DEVICES}
            selectedDevice={selectedDevice}
            selectedAction={selectedAction}
            onNameChange={setScenarioName}
            onSelectedDeviceChange={setSelectedDevice}
            onSelectedActionChange={setSelectedAction}
            onAddBlock={addBlock}
            onClose={closeComposer}
            onCreate={createScenario}
          />
        )}

        {scenarios.length === 0 && !isCreating ? (
          <ScenariosEmptyState onCreate={openComposer} />
        ) : scenarios.length > 0 ? (
          <ScenariosList scenarios={scenarios} devices={SCENARIO_MOCK_DEVICES} />
        ) : null}
      </main>
    </>
  );
}
