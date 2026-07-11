'use client';

import { fetchAPI } from './client';

export type UiCommandResponse = {
  status?: string;
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
  };
  results?: unknown[];
};

type UiCommandPayload = {
  device_id: string;
  action: string;
  params?: Record<string, unknown>;
};

export async function executeUiCommand(
  projectId: string,
  payload: UiCommandPayload,
): Promise<UiCommandResponse> {
  const pid = projectId.trim();
  if (!pid) throw new Error('PROJECT_REQUIRED');

  const deviceId = payload.device_id.trim();
  if (!deviceId) throw new Error('DEVICE_ID_REQUIRED');

  const action = payload.action.trim();
  if (!action) throw new Error('COMMAND_REQUIRED');

  const params =
    payload.params && typeof payload.params === 'object' && !Array.isArray(payload.params)
      ? payload.params
      : {};

  return fetchAPI<UiCommandResponse>(
    `/api/brain/projects/${encodeURIComponent(pid)}/actions/ui-command`,
    {
      method: 'POST',
      body: JSON.stringify({
        device_id: deviceId,
        action,
        params,
      }),
    },
  );
}

// ── B89: Compound execution ────────────────────────────────────────────────

export interface ExecutionStep {
  id: string;
  step_index: number;
  device_id: string | null;
  device_ids: string[];
  action: string;
  description: string | null;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'blocked' | 'cancelled';
  dependency_type: 'parallel' | 'sequential';
  depends_on: number | null;
  result: unknown;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export interface ExecutionRun {
  execution_id: string;
  project_id: string;
  status: 'running' | 'succeeded' | 'failed' | 'partially_succeeded' | 'cancelled';
  steps_total: number;
  steps_done: number;
  steps_failed: number;
  steps: ExecutionStep[];
  created_at: string;
  updated_at: string;
}

type CompoundStep = {
  device_id?: string | null;
  device_ids?: string[];
  action: string;
  params?: Record<string, unknown>;
  step_index?: number;
  dependency_type?: 'parallel' | 'sequential';
  depends_on?: number | null;
  selector?: string | null;
  target_type?: string | null;
  room_id?: string | null;
  excluded_ids?: string[];
  description?: string | null;
};

export async function executeCompoundPlan(
  projectId: string,
  steps: CompoundStep[],
  idempotencyKey?: string,
  sessionId?: string,
): Promise<ExecutionRun> {
  const pid = projectId.trim();
  if (!pid) throw new Error('PROJECT_REQUIRED');
  return fetchAPI<ExecutionRun>(
    `/api/brain/projects/${encodeURIComponent(pid)}/execution/execute-plan`,
    {
      method: 'POST',
      body: JSON.stringify({
        steps,
        idempotency_key: idempotencyKey || undefined,
        session_id: sessionId || undefined,
      }),
    },
  );
}

export async function getExecution(
  projectId: string,
  executionId: string,
): Promise<ExecutionRun> {
  const pid = projectId.trim();
  return fetchAPI<ExecutionRun>(
    `/api/brain/projects/${encodeURIComponent(pid)}/execution/executions/${encodeURIComponent(executionId)}`,
  );
}

const _TERMINAL = new Set(['succeeded', 'failed', 'partially_succeeded', 'cancelled']);

export async function pollExecution(
  projectId: string,
  executionId: string,
  onUpdate: (run: ExecutionRun) => void,
  signal: AbortSignal,
): Promise<ExecutionRun> {
  while (!signal.aborted) {
    const run = await getExecution(projectId, executionId);
    onUpdate(run);
    if (_TERMINAL.has(run.status)) return run;
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, 1000);
      signal.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
    });
  }
  throw new DOMException('Aborted', 'AbortError');
}
