'use client';

import { fetchAPI } from './client';

export type UiCommandResponse = {
  /** executed · simulated (un comando fallito arriva come errore HTTP 502) */
  status?: string;
  esito?: 'eseguito' | 'simulato' | 'fallito';
  /** Quanto si sa dell'esecuzione, dal protocollo: `device` = il device ha detto di averlo fatto. */
  conferma?: 'device' | 'in_corso' | 'nessuna' | null;
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

/**
 * La frase dell'esito di un comando, in un posto solo.
 *
 * Fino al 21/10/2026 la barra dei comandi scriveva «Fatto.» a ogni risposta
 * 2xx, senza leggerla: anche su un comando che l'Hub aveva solo simulato. Ora
 * «Fatto.» si dice soltanto se l'Hub l'ha eseguito; un fallito arriva già come
 * errore HTTP (502) e non passa di qui.
 */
export function esitoDetto(r: UiCommandResponse | null | undefined): { fatto: boolean; frase: string } {
  if (r?.status === 'executed') return fraseConferma(r.conferma, 1);
  if (r?.status === 'simulated') return { fatto: false, frase: 'Simulato: il comando non ha raggiunto un dispositivo vero.' };
  return { fatto: false, frase: 'Non so se è stato eseguito: MARIO non ha ricevuto un esito.' };
}

/**
 * «Arrivato» non è «fatto» (21/10/2026). L'Hub dice `eseguito` quando il
 * comando ha raggiunto il device, e la `conferma` quando il device ha detto
 * di averlo fatto: «Fatto.» solo nel secondo caso. Gli altri si dicono come
 * sono — una frase più rassicurante su un comando non confermato è il
 * «fatto» falso che fa uscire di casa.
 */
function fraseConferma(conferma: UiCommandResponse['conferma'], quanti: number): { fatto: boolean; frase: string } {
  if (conferma === 'device') return { fatto: true, frase: 'Fatto.' };
  if (conferma === 'in_corso') return { fatto: false, frase: 'Il dispositivo lo sta facendo: non ha ancora finito.' };
  return { fatto: false, frase: quanti === 1
    ? 'Inviato, ma il dispositivo non ha confermato di averlo fatto.'
    : `Inviato, ma ${quanti} dispositivi non hanno confermato di averlo fatto.` };
}

type RisultatoDevice = { ok?: boolean; conferma?: UiCommandResponse['conferma'] };

/**
 * La frase di fine piano, in un posto solo: era scritta cinque volte nella
 * barra dei comandi, con cinque parole diverse per la stessa cosa. Legge i
 * passi e, dentro, la conferma di ogni device; un passo fallito dice perché
 * (il motivo è già una frase di MARIO, `porta3_siPuoFare`).
 */
export function esitoPiano(run: ExecutionRun): { fatto: boolean; frase: string } {
  const risultati = run.steps.flatMap((s) => (Array.isArray(s.result) ? (s.result as RisultatoDevice[]) : []));
  const motivi = [...new Set(run.steps.filter((s) => s.status === 'failed' || s.status === 'blocked')
    .map((s) => s.error).filter((e): e is string => typeof e === 'string' && e.length > 0))];
  if (run.status === 'succeeded') {
    // Senza i risultati dei device non si sa: «non so» non diventa mai «fatto».
    const arrivati = risultati.filter((r) => r.ok);
    if (arrivati.length === 0) return { fatto: false, frase: 'Non so se è stato eseguito: MARIO non ha ricevuto un esito.' };
    const nonConfermati = arrivati.filter((r) => r.conferma !== 'device').length;
    if (nonConfermati === 0) return { fatto: true, frase: 'Fatto.' };
    const inCorso = risultati.length > 0 && risultati.every((r) => r.conferma === 'in_corso');
    return fraseConferma(inCorso ? 'in_corso' : 'nessuna', nonConfermati);
  }
  if (run.status === 'partially_succeeded') {
    return { fatto: false, frase: `${run.steps_done} di ${run.steps_total} riusciti, ${run.steps_failed} no.${motivi.length ? ' ' + motivi.join(' ') : ''}` };
  }
  return { fatto: false, frase: motivi.length ? motivi.join(' ') : 'Esecuzione fallita.' };
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
