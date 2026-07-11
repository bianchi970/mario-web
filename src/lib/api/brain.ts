'use client';

import { fetchAPI } from './client';

export interface AutomationDraft {
  name: string;
  trigger: Record<string, unknown>;
  actions: Record<string, unknown>[];
  conditions: Record<string, unknown>[];
  status: 'draft';
}

export interface BrainStatus {
  mode: string;
  provider: string;
  ai_available: boolean;
}

export interface BrainInterpretResult {
  intent: string;
  action: string | null;
  target: { device_id?: string; room?: string } | null;
  parameters: Record<string, unknown>;
  risk: 'low' | 'medium' | 'high';
  requires_confirmation: boolean;
  confidence: number;
  reason: string | null;
  dispatchable: boolean;
  commands: Array<{
    device_id: string | null;
    device_ids?: string[];
    action: string | null;
    params: Record<string, unknown>;
    step_index: number;
    dependency_type: 'parallel' | 'sequential';
    depends_on: number | null;
    selector?: string | null;
    target_type?: string | null;
    room_id?: string | null;
    excluded_ids?: string[];
    description?: string | null;
  }>;
  suggest_diagnose: boolean;
  missing?: string[];
  provider: string;
  input_text: string;
  _v2?: {
    outcome?: string;
    draft?: AutomationDraft | null;
    explanation?: string;
    task_kind?: string;
    question?: string | null;
    proactive?: Array<{
      type: string;
      message: string;
      draft?: Record<string, unknown>;
      confidence?: number;
      occurrences?: number;
    }>;
    steps?: Array<{
      index: number;
      description: string;
      action: string;
      dependency_type: 'parallel' | 'sequential';
      depends_on: number | null;
      device_count: number;
    }>;
  };
}

export interface BrainDiagnoseResult {
  category: string;
  confidence: string;
  cause: string | null;
  steps: string[];
  tools: string[];
  risk: 'low' | 'medium' | 'high';
  device_detected: string | null;
  additional_checks: string[];
  known_solution: boolean;
  error_id?: number;
  provider: string;
}

export async function getBrainStatus(): Promise<BrainStatus> {
  return fetchAPI<BrainStatus>('/api/brain/status');
}

export async function brainInterpret(
  text: string,
  context: { project_id?: string; devices?: unknown[]; session_id?: string },
): Promise<BrainInterpretResult> {
  return fetchAPI<BrainInterpretResult>('/api/brain/interpret', {
    method: 'POST',
    body: JSON.stringify({ text, context, session_id: context.session_id }),
  });
}

export async function brainConfirmAutomation(
  draft: AutomationDraft,
  projectId: string,
): Promise<{ ok: boolean; automation: { id: string; name: string } }> {
  return fetchAPI('/api/brain/automation/confirm', {
    method: 'POST',
    body: JSON.stringify({ draft, project_id: projectId }),
  });
}

export interface SequencePattern {
  fingerprint: string;
  devices: string[];
  actions: string[];
  time_of_day: string;
  day_type: string;
  occurrences: number;
  confidence: number;
  proposed_trigger: Record<string, unknown>;
  proposed_actions: Array<{ device_id?: string; action: string; device_type?: string }>;
}

export async function brainLearn(payload: {
  wrong_phrase: string;
  correct_phrase: string;
  correct_entity?: { type: string; id: string; name: string };
  feedback_type?: 'correction' | 'success' | 'failure';
  project_id?: string;
}): Promise<{ ok: boolean; learned: { wrong_phrase: string; correct_phrase: string; error_type: string } }> {
  return fetchAPI('/api/brain/learn', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getBrainSequences(projectId: string): Promise<SequencePattern[]> {
  const res = await fetchAPI<{ sequences: SequencePattern[] }>(
    `/api/brain/v2/sequences?project_id=${encodeURIComponent(projectId)}`,
  );
  return res.sequences ?? [];
}

export async function brainDiagnose(
  text: string,
  context: { project_id?: string; devices?: unknown[] },
): Promise<BrainDiagnoseResult> {
  return fetchAPI<BrainDiagnoseResult>('/api/brain/diagnose', {
    method: 'POST',
    body: JSON.stringify({ text, context }),
  });
}
