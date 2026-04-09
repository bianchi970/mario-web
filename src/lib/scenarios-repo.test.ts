import {
  clearStoredScenarios,
  SCENARIOS_STORAGE_KEY,
} from '@/lib/scenarios-storage';
import {
  createScenario,
  deleteScenario,
  listScenarios,
  updateScenario,
} from '@/lib/scenarios-repo';
import type { Scenario } from '@/lib/scenario-types';

describe('scenarios-repo', () => {
  const seedScenarios: Scenario[] = [
    {
      id: 'seed-scenario',
      name: 'Seed scenario',
      type: 'manual',
      trigger: { type: 'manual' },
      blocks: [],
    },
  ];

  beforeEach(() => {
    clearStoredScenarios();
  });

  it('returns the seed when storage is empty', () => {
    expect(listScenarios(seedScenarios)).toMatchObject(seedScenarios);
  });

  it('creates and persists a scenario', () => {
    const createdScenarios = createScenario({
      id: 'scenario-1',
      name: 'Scenario 1',
      type: 'automatic',
      trigger: { type: 'schedule', time: '08:00' },
      blocks: [],
    });

    expect(createdScenarios).toMatchObject([
      {
        id: 'scenario-1',
        name: 'Scenario 1',
      },
    ]);
    expect(JSON.parse(window.localStorage.getItem(SCENARIOS_STORAGE_KEY) ?? '[]')).toMatchObject(
      createdScenarios
    );
  });

  it('updates and persists a scenario', () => {
    window.localStorage.setItem(
      SCENARIOS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'scenario-1',
          name: 'Scenario 1',
          type: 'manual',
          trigger: { type: 'manual' },
          blocks: [],
        },
      ])
    );

    const updatedScenarios = updateScenario({
      id: 'scenario-1',
      name: 'Scenario renamed',
      type: 'automatic',
      trigger: { type: 'device_event', deviceId: 'garage-cover' },
      blocks: [],
    });

    expect(updatedScenarios).toMatchObject([
      {
        id: 'scenario-1',
        name: 'Scenario renamed',
        type: 'automatic',
      },
    ]);
    expect(JSON.parse(window.localStorage.getItem(SCENARIOS_STORAGE_KEY) ?? '[]')).toMatchObject(
      updatedScenarios
    );
  });

  it('deletes and persists the scenario list', () => {
    window.localStorage.setItem(
      SCENARIOS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'scenario-1',
          name: 'Scenario 1',
          type: 'manual',
          trigger: { type: 'manual' },
          blocks: [],
        },
        {
          id: 'scenario-2',
          name: 'Scenario 2',
          type: 'manual',
          trigger: { type: 'manual' },
          blocks: [],
        },
      ])
    );

    const remainingScenarios = deleteScenario('scenario-1');

    expect(remainingScenarios).toMatchObject([
      {
        id: 'scenario-2',
        name: 'Scenario 2',
      },
    ]);
    expect(JSON.parse(window.localStorage.getItem(SCENARIOS_STORAGE_KEY) ?? '[]')).toMatchObject(
      remainingScenarios
    );
  });
});
