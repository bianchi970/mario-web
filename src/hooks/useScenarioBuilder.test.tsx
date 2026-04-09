import { act, renderHook } from '@testing-library/react';
import { useScenarioBuilder } from '@/hooks/useScenarioBuilder';
import {
  clearStoredScenarios,
  SCENARIOS_STORAGE_KEY,
} from '@/lib/scenarios-storage';
import { SCENARIO_INITIAL_SCENARIOS, SCENARIO_MOCK_DEVICES } from '@/lib/scenarios-mock';

describe('useScenarioBuilder', () => {
  beforeEach(() => {
    clearStoredScenarios();
  });

  const seededScenario = [
    {
      id: 'scenario-seed',
      name: 'Seed scenario',
      type: 'manual' as const,
      trigger: { type: 'manual' as const },
      blocks: [],
    },
  ];

  it('initializes with an empty scenarios list', () => {
    const { result } = renderHook(() =>
      useScenarioBuilder({
        initialScenarios: SCENARIO_INITIAL_SCENARIOS,
        devices: SCENARIO_MOCK_DEVICES,
      })
    );

    expect(result.current.scenarios).toEqual([]);
    expect(result.current.isCreating).toBe(false);
    expect(result.current.draftBlocks).toEqual([]);
    expect(result.current.canCreateScenario).toBe(false);
    expect(result.current.selectedScenarioType).toBe('manual');
    expect(result.current.selectedTriggerType).toBe('manual');
  });

  it('uses initial scenarios as seed only when storage is missing', () => {
    const { result } = renderHook(() =>
      useScenarioBuilder({
        initialScenarios: seededScenario,
        devices: SCENARIO_MOCK_DEVICES,
      })
    );

    expect(result.current.scenarios).toMatchObject([
      {
        id: 'scenario-seed',
        name: 'Seed scenario',
      },
    ]);
  });

  it('does not reuse the seed when storage already contains an empty array', () => {
    window.localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify([]));

    const { result } = renderHook(() =>
      useScenarioBuilder({
        initialScenarios: seededScenario,
        devices: SCENARIO_MOCK_DEVICES,
      })
    );

    expect(result.current.scenarios).toEqual([]);
  });

  it('initializes scenarios from localStorage when available', () => {
    window.localStorage.setItem(
      SCENARIOS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'scenario-persisted',
          name: 'Persisted scenario',
          type: 'manual',
          trigger: { type: 'manual' },
          blocks: [],
        },
      ])
    );

    const { result } = renderHook(() =>
      useScenarioBuilder({
        initialScenarios: SCENARIO_INITIAL_SCENARIOS,
        devices: SCENARIO_MOCK_DEVICES,
      })
    );

    expect(result.current.scenarios).toMatchObject([
      {
        id: 'scenario-persisted',
        name: 'Persisted scenario',
        type: 'manual',
      },
    ]);
  });

  it('opens and closes the composer', () => {
    const { result } = renderHook(() =>
      useScenarioBuilder({
        initialScenarios: SCENARIO_INITIAL_SCENARIOS,
        devices: SCENARIO_MOCK_DEVICES,
      })
    );

    act(() => {
      result.current.openComposer();
    });
    expect(result.current.isCreating).toBe(true);

    act(() => {
      result.current.setScenarioName('Mattina');
      result.current.addBlock();
    });
    expect(result.current.scenarioName).toBe('Mattina');
    expect(result.current.draftBlocks).toHaveLength(1);

    act(() => {
      result.current.closeComposer();
    });
    expect(result.current.isCreating).toBe(false);
    expect(result.current.scenarioName).toBe('');
    expect(result.current.draftBlocks).toEqual([]);
    expect(result.current.selectedScenarioType).toBe('manual');
    expect(result.current.selectedTriggerType).toBe('manual');
    expect(result.current.validationMessages).toEqual([
      'Nome minimo 3 caratteri.',
      'Aggiungi almeno un blocco.',
    ]);
  });

  it('adds a draft block', () => {
    const { result } = renderHook(() =>
      useScenarioBuilder({
        initialScenarios: SCENARIO_INITIAL_SCENARIOS,
        devices: SCENARIO_MOCK_DEVICES,
      })
    );

    act(() => {
      result.current.setSelectedAction('close');
    });

    act(() => {
      result.current.addBlock();
    });

    expect(result.current.draftBlocks).toHaveLength(1);
    expect(result.current.draftBlocks[0]).toMatchObject({
      deviceId: SCENARIO_MOCK_DEVICES[0].id,
      action: 'close',
    });
  });

  it('prevents duplicate blocks with the same device and action', () => {
    const { result } = renderHook(() =>
      useScenarioBuilder({
        initialScenarios: SCENARIO_INITIAL_SCENARIOS,
        devices: SCENARIO_MOCK_DEVICES,
      })
    );

    act(() => {
      result.current.addBlock();
    });

    act(() => {
      result.current.addBlock();
    });

    expect(result.current.draftBlocks).toHaveLength(1);
    expect(result.current.validationMessages).toContain('Blocco duplicato non consentito.');
  });

  it('removes a draft block', () => {
    const { result } = renderHook(() =>
      useScenarioBuilder({
        initialScenarios: SCENARIO_INITIAL_SCENARIOS,
        devices: SCENARIO_MOCK_DEVICES,
      })
    );

    act(() => {
      result.current.setScenarioName('Mattina');
      result.current.addBlock();
    });

    const blockId = result.current.draftBlocks[0].id;

    act(() => {
      result.current.removeDraftBlock(blockId);
    });

    expect(result.current.draftBlocks).toEqual([]);
    expect(result.current.canCreateScenario).toBe(false);
    expect(result.current.validationMessages).toContain('Aggiungi almeno un blocco.');
  });

  it('reorders draft blocks up and down', () => {
    const { result } = renderHook(() =>
      useScenarioBuilder({
        initialScenarios: SCENARIO_INITIAL_SCENARIOS,
        devices: SCENARIO_MOCK_DEVICES,
      })
    );

    act(() => {
      result.current.setScenarioName('Mattina');
    });

    act(() => {
      result.current.setSelectedDevice('living-light');
      result.current.setSelectedAction('on');
    });

    act(() => {
      result.current.addBlock();
    });

    act(() => {
      result.current.setSelectedDevice('garage-cover');
      result.current.setSelectedAction('open');
    });

    act(() => {
      result.current.addBlock();
    });

    const firstOrder = result.current.draftBlocks.map((block) => block.deviceId);
    expect(firstOrder).toEqual(['living-light', 'garage-cover']);

    act(() => {
      result.current.moveDraftBlockUp(result.current.draftBlocks[1].id);
    });

    const movedUpOrder = result.current.draftBlocks.map((block) => block.deviceId);
    expect(movedUpOrder).toEqual(['garage-cover', 'living-light']);

    act(() => {
      result.current.moveDraftBlockDown(result.current.draftBlocks[0].id);
    });

    const movedDownOrder = result.current.draftBlocks.map((block) => block.deviceId);
    expect(movedDownOrder).toEqual(['living-light', 'garage-cover']);
  });

  it('creates a scenario and resets the draft state', () => {
    const { result } = renderHook(() =>
      useScenarioBuilder({
        initialScenarios: SCENARIO_INITIAL_SCENARIOS,
        devices: SCENARIO_MOCK_DEVICES,
      })
    );

    act(() => {
      result.current.openComposer();
    });

    act(() => {
      result.current.setScenarioName('Rientro sera');
      result.current.setSelectedScenarioType('automatic');
      result.current.setSelectedTriggerType('schedule');
      result.current.setSelectedTriggerTime('08:15');
      result.current.addBlock();
    });
    expect(result.current.canCreateScenario).toBe(true);

    act(() => {
      result.current.createScenario();
    });

    expect(result.current.scenarios).toHaveLength(1);
    expect(result.current.scenarios[0]).toMatchObject({
      name: 'Rientro sera',
      type: 'automatic',
      trigger: {
        type: 'schedule',
        time: '08:15',
      },
      blocks: [{ deviceId: SCENARIO_MOCK_DEVICES[0].id, action: 'on' }],
    });
    expect(result.current.isCreating).toBe(false);
    expect(result.current.scenarioName).toBe('');
    expect(result.current.draftBlocks).toEqual([]);
    expect(result.current.selectedScenarioType).toBe('manual');
    expect(result.current.selectedTriggerType).toBe('manual');
    expect(JSON.parse(window.localStorage.getItem(SCENARIOS_STORAGE_KEY) ?? '[]')).toMatchObject([
      {
        name: 'Rientro sera',
        type: 'automatic',
      },
    ]);
  });
});
