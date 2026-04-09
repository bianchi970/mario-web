'use client';

import { useMemo, useState } from 'react';
import type {
  Scenario,
  ScenarioAction,
  ScenarioBlock,
  ScenarioDeviceOption,
} from '@/lib/scenario-types';

interface UseScenarioBuilderOptions {
  initialScenarios: Scenario[];
  devices: ScenarioDeviceOption[];
}

export function useScenarioBuilder({
  initialScenarios,
  devices,
}: UseScenarioBuilderOptions) {
  const [scenarios, setScenarios] = useState<Scenario[]>(initialScenarios);
  const [isCreating, setIsCreating] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [draftBlocks, setDraftBlocks] = useState<ScenarioBlock[]>([]);
  const [selectedDevice, setSelectedDevice] = useState(devices[0]?.id ?? '');
  const [selectedAction, setSelectedAction] = useState<ScenarioAction>('on');

  const totalBlocks = useMemo(
    () => scenarios.reduce((count, scenario) => count + scenario.blocks.length, 0),
    [scenarios]
  );

  function resetDraft() {
    setScenarioName('');
    setDraftBlocks([]);
    setSelectedDevice(devices[0]?.id ?? '');
    setSelectedAction('on');
  }

  function openComposer() {
    setIsCreating(true);
    if (!selectedDevice) {
      setSelectedDevice(devices[0]?.id ?? '');
    }
  }

  function closeComposer() {
    setIsCreating(false);
    resetDraft();
  }

  function addBlock() {
    if (!selectedDevice) {
      return;
    }

    setDraftBlocks((current) => [
      ...current,
      {
        id: `draft-${Date.now()}-${current.length}`,
        deviceId: selectedDevice,
        action: selectedAction,
      },
    ]);
  }

  function createScenario() {
    const trimmedName = scenarioName.trim();
    if (!trimmedName) {
      return;
    }

    setScenarios((current) => [
      {
        id: `scenario-${Date.now()}`,
        name: trimmedName,
        blocks: draftBlocks,
      },
      ...current,
    ]);
    setIsCreating(false);
    resetDraft();
  }

  return {
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
  };
}
