export type DeviceContextInput = {
  id: string;
  name: string;
  type: string;
  capabilities: string[];
};

export type ScenarioSpecV2 = {
  name: string;
  enabled: boolean;
  trigger: Record<string, unknown>;
  conditions: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
};

export type DraftScenarioV2Response = {
  success: true;
  status: 'draft';
  data: ScenarioSpecV2;
};

export type NeedsClarificationResponse = {
  success: false;
  status: 'needs_clarification';
  question: string;
  options: string[];
};

export type CreateScenarioFromTextRequest = {
  text: string;
  projectId?: string;
  devices?: DeviceContextInput[];
};

export type NeedsConfirmationResponse = {
  success: false;
  status: 'needs_confirmation';
  missing: string[];
};

export type CreatedScenarioResponse = {
  success: true;
  status: 'created';
  data: {
    id?: string;
    name: string;
    trigger: Record<string, unknown>;
    conditions: Array<Record<string, unknown>>;
    outcome: Record<string, unknown>;
  };
};

export type ErrorScenarioResponse = {
  success: false;
  status?: 'error';
  error?: string;
};

export type CreateScenarioFromTextResponse =
  | NeedsConfirmationResponse
  | CreatedScenarioResponse
  | DraftScenarioV2Response
  | NeedsClarificationResponse
  | ErrorScenarioResponse;

export type ScenarioAuditItem = {
  scenario_id: string;
  scenario_name?: string;
  status: 'triggered' | 'skipped' | 'blocked' | 'executed';
  reason?: string | null;
  executed_at?: string | null;
};

export type ScenarioRecord = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: Record<string, unknown>;
  conditions: Array<Record<string, unknown>>;
  outcome: Record<string, unknown>;
  updated_at?: string | null;
};

function jsonHeaders() {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function assertNoRawPayload(payload: unknown) {
  const text = JSON.stringify(payload ?? {});
  const forbidden = ['"actions"', '"targets"', '"protocol"', '"vendor"', '"adapter"', '"driver"'];
  for (const key of forbidden) {
    if (text.includes(key)) {
      throw new Error(`forbidden_client_payload:${key.replace(/"/g, '')}`);
    }
  }
}

export async function createScenarioFromText(
  payload: CreateScenarioFromTextRequest
): Promise<CreateScenarioFromTextResponse> {
  assertNoRawPayload({ text: payload.text });

  const res = await fetch('/api/scenarios/from-text', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({
      text: payload.text,
      projectId: payload.projectId,
      ...(Array.isArray(payload.devices) ? { devices: payload.devices } : {}),
    }),
  });

  const data = await res
    .json()
    .catch(() => ({ success: false, status: 'error', error: 'invalid_json' }));
  return data;
}

export async function createScenarioCanonical(payload: {
  name: string;
  trigger: Record<string, unknown>;
  conditions: Array<Record<string, unknown>>;
  outcome: Record<string, unknown>;
  projectId?: string;
}): Promise<CreatedScenarioResponse | ErrorScenarioResponse> {
  assertNoRawPayload(payload);

  const res = await fetch('/api/scenarios', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res
    .json()
    .catch(() => ({ success: false, status: 'error', error: 'invalid_json' }));
  return data;
}

export async function listScenarioAudit(projectId?: string): Promise<ScenarioAuditItem[]> {
  const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  const res = await fetch(`/api/scenarios/audit${qs}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  const data = await res.json().catch(() => ({ success: false, error: 'invalid_json' }));
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'success' in data && data.success === false) {
    throw new Error(typeof data.error === 'string' ? data.error : 'scenario_audit_failed');
  }
  return [];
}

export async function listScenarios(projectId?: string): Promise<ScenarioRecord[]> {
  const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  const res = await fetch(`/api/scenarios${qs}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({ success: false, data: [], error: 'invalid_json' }));
  if (data?.success === false) {
    throw new Error(typeof data.error === 'string' ? data.error : 'scenario_list_failed');
  }
  return Array.isArray(data?.data) ? data.data : [];
}

export async function setScenarioEnabled(
  scenarioId: string,
  enabled: boolean,
  projectId?: string
): Promise<{ success: boolean; error?: string }> {
  const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  const res = await fetch(`/api/scenarios/${encodeURIComponent(scenarioId)}${qs}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({ enabled }),
  });

  return res.json().catch(() => ({ success: false, error: 'invalid_json' }));
}

export async function deleteScenario(
  scenarioId: string,
  projectId?: string
): Promise<{ success: boolean; error?: string }> {
  const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  const res = await fetch(`/api/scenarios/${encodeURIComponent(scenarioId)}${qs}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });

  return res.json().catch(() => ({ success: false, error: 'invalid_json' }));
}

export async function runScenario(
  scenarioId: string,
  projectId?: string
): Promise<{ status: string; error?: string }> {
  const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  const res = await fetch(`/api/scenarios/${encodeURIComponent(scenarioId)}/run${qs}`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
  return res.json().catch(() => ({ status: 'error', error: 'invalid_json' }));
}
