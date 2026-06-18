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
  commands: unknown[];
  provider: string;
  input_text: string;
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
  context: { project_id?: string; devices?: unknown[] },
): Promise<BrainInterpretResult> {
  return fetchAPI<BrainInterpretResult>('/api/brain/interpret', {
    method: 'POST',
    body: JSON.stringify({ text, context }),
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
