'use client';

import { useMemo, useState } from 'react';
import type {
  Scenario,
  ScenarioAction,
  ScenarioBlock,
  ScenarioDeviceOption,
  ScenarioTrigger,
  ScenarioType,
} from '@/lib/scenario-types';
import { loadStoredScenarios, saveStoredScenarios } from '@/lib/scenarios-storage';

interface UseScenarioBuilderOptions {
  initialScenarios: Scenario[];
  devices: ScenarioDeviceOption[];
}

export function useScenarioBuilder({
  initialScenarios,
  devices,
}: UseScenarioBuilderOptions) {
  const [scenarios, setScenarios] = useState<Scenario[]>(() =>
    loadStoredScenarios(initialScenarios)
  );
  const [isCreating, setIsCreating] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [draftBlocks, setDraftBlocks] = useState<ScenarioBlock[]>([]);
  const [selectedDevice, setSelectedDevice] = useState(devices[0]?.id ?? '');
  const [selectedAction, setSelectedAction] = useState<ScenarioAction>('on');
  const [selectedScenarioType, setSelectedScenarioType] = useState<ScenarioType>('manual');
  const [selectedTriggerType, setSelectedTriggerType] = useState<ScenarioTrigger['type']>('manual');
  const [selectedTriggerTime, setSelectedTriggerTime] = useState('');
  const [selectedTriggerDevice, setSelectedTriggerDevice] = useState('');
  const [hasDuplicateError, setHasDuplicateError] = useState(false);

  const totalBlocks = useMemo(
    () => scenarios.reduce((count, scenario) => count + scenario.blocks.length, 0),
    [scenarios]
  );

  const canCreateScenario = useMemo(
    () => scenarioName.trim().length >= 3 && draftBlocks.length > 0,
    [scenarioName, draftBlocks.length]
  );

  const validationMessages = useMemo(() => {
    const messages: string[] = [];
    if (scenarioName.trim().length < 3) messages.push('Nome minimo 3 caratteri.');
    if (draftBlocks.length === 0) messages.push('Aggiungi almeno un blocco.');
    if (hasDuplicateError) messages.push('Blocco duplicato non consentito.');
    return messages;
  }, [scenarioName, draftBlocks.length, hasDuplicateError]);

  function resetDraft() {
    setScenarioName('');
    setDraftBlocks([]);
    setSelectedDevice(devices[0]?.id ?? '');
    setSelectedAction('on');
    setSelectedScenarioType('manual');
    setSelectedTriggerType('manual');
    setSelectedTriggerTime('');
    setSelectedTriggerDevice('');
    setHasDuplicateError(false);
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
    if (!selectedDevice) return;

    const isDuplicate = draftBlocks.some(
      (b) => b.deviceId === selectedDevice && b.action === selectedAction
    );

    if (isDuplicate) {
      setHasDuplicateError(true);
      return;
    }

    setHasDuplicateError(false);
    setDraftBlocks((current) => [
      ...current,
      {
        id: `draft-${Date.now()}-${current.length}`,
        deviceId: selectedDevice,
        action: selectedAction,
      },
    ]);
  }

  function removeDraftBlock(id: string) {
    setDraftBlocks((current) => current.filter((b) => b.id !== id));
    setHasDuplicateError(false);
  }

  function moveDraftBlockUp(id: string) {
    setDraftBlocks((current) => {
      const index = current.findIndex((b) => b.id === id);
      if (index <= 0) return current;
      const next = [...current];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDraftBlockDown(id: string) {
    setDraftBlocks((current) => {
      const index = current.findIndex((b) => b.id === id);
      if (index < 0 || index >= current.length - 1) return current;
      const next = [...current];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  function createScenario() {
    const trimmedName = scenarioName.trim();
    if (trimmedName.length < 3 || draftBlocks.length === 0) return;

    const trigger: ScenarioTrigger = { type: selectedTriggerType };
    if (selectedTriggerType === 'schedule' && selectedTriggerTime) {
      trigger.time = selectedTriggerTime;
    }
    if (selectedTriggerType === 'device_event' && selectedTriggerDevice) {
      trigger.deviceId = selectedTriggerDevice;
    }

    const newScenario: Scenario = {
      id: `scenario-${Date.now()}`,
      name: trimmedName,
      type: selectedScenarioType,
      trigger,
      blocks: draftBlocks,
    };

    const updated = [newScenario, ...scenarios];
    saveStoredScenarios(updated);
    setScenarios(updated);
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
    selectedScenarioType,
    selectedTriggerType,
    selectedTriggerTime,
    selectedTriggerDevice,
    totalBlocks,
    canCreateScenario,
    validationMessages,
    setScenarioName,
    setSelectedDevice,
    setSelectedAction,
    setSelectedScenarioType,
    setSelectedTriggerType,
    setSelectedTriggerTime,
    setSelectedTriggerDevice,
    openComposer,
    closeComposer,
    addBlock,
    removeDraftBlock,
    moveDraftBlockUp,
    moveDraftBlockDown,
    createScenario,
  };
}
