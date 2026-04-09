import {
  loadStoredScenarios,
  saveStoredScenarios,
} from '@/lib/scenarios-storage';
import type { Scenario } from '@/lib/scenario-types';

export function listScenarios(seed: Scenario[] = []) {
  return loadStoredScenarios(seed);
}

export function createScenario(scenario: Scenario, seed: Scenario[] = []) {
  const scenarios = [scenario, ...listScenarios(seed)];
  saveStoredScenarios(scenarios);
  return scenarios;
}

export function updateScenario(nextScenario: Scenario, seed: Scenario[] = []) {
  const scenarios = listScenarios(seed).map((scenario) =>
    scenario.id === nextScenario.id ? nextScenario : scenario
  );
  saveStoredScenarios(scenarios);
  return scenarios;
}

export function deleteScenario(scenarioId: string, seed: Scenario[] = []) {
  const scenarios = listScenarios(seed).filter((scenario) => scenario.id !== scenarioId);
  saveStoredScenarios(scenarios);
  return scenarios;
}
