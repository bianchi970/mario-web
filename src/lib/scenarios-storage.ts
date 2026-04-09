import type { Scenario } from '@/lib/scenario-types';

const SCENARIOS_STORAGE_KEY = 'mario.scenarios';

export function loadStoredScenarios(fallback: Scenario[] = []) {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(SCENARIOS_STORAGE_KEY);

    // Only use the seed fallback on first run, when the storage key does not exist yet.
    if (rawValue === null) {
      return fallback;
    }

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? (parsedValue as Scenario[]) : fallback;
  } catch {
    return fallback;
  }
}

export function saveStoredScenarios(scenarios: Scenario[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(scenarios));
}

export function clearStoredScenarios() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(SCENARIOS_STORAGE_KEY);
}

export { SCENARIOS_STORAGE_KEY };
