'use client';

import { fetchAPI } from './client';

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
    description?: string | null;
  }>;
  suggest_diagnose: boolean;
  missing?: string[];
  provider: string;
  input_text: string;
  _v2?: {
    outcome?: string;
    explanation?: string;
    task_kind?: string;
    question?: string | null;
    /**
     * Le parole che la domanda riconosce («sì», «no», i nomi fra cui scegliere).
     * La PWA le offre come pulsanti; un pulsante le manda come se si
     * scrivessero, nella stessa conversazione (mario-brain `_conRisposte`).
     */
    risposte?: string[] | null;
    /** B86 compound alias fast path: array semplice [{device_id, action}] */
    plan?: Array<{ device_id: string; action: string }> | Record<string, unknown> | null;
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
  /** `origine: 'voce'` dice al Brain che la frase viene dal microfono: li
   *  un'esecuzione diventa una domanda (`gate_voce_non_esegue`). */
  context: { project_id?: string; devices?: unknown[]; session_id?: string; origine?: 'voce' },
): Promise<BrainInterpretResult> {
  return fetchAPI<BrainInterpretResult>('/api/brain/interpret', {
    method: 'POST',
    body: JSON.stringify({ text, context, session_id: context.session_id }),
  });
}

export async function brainLearn(payload: {
  wrong_phrase: string;
  correct_phrase: string;
  correct_entity?: { type: string; id: string; name: string };
  feedback_type?: 'correction' | 'success' | 'failure';
  project_id?: string;
  session_id?: string;
  execution_id?: string;
  step_index?: number;
  outcome?: string;
}): Promise<{ success: boolean; data: { learned: { wrong_phrase: string; correct_phrase: string; error_type: string } }; error: string | null }> {
  return fetchAPI('/api/brain/learn', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
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
