'use client';

import { CheckCircle, Loader2, MinusCircle, XCircle } from 'lucide-react';
import type { ExecutionRun, ExecutionStep } from '@/lib/api/ui-command';

const ACTION_IT: Record<string, string> = {
  turn_on:          'accendi',
  turn_off:         'spegni',
  open:             'apri',
  close:            'chiudi',
  stop:             'ferma',
  set:              'imposta',
  set_brightness:   'imposta luminosità',
  set_position:     'imposta posizione',
  set_temperature:  'imposta temperatura',
  set_level:        'imposta livello',
};

function StepIcon({ status }: { status: ExecutionStep['status'] }) {
  switch (status) {
    case 'succeeded':
      return <CheckCircle className="h-3 w-3 shrink-0 mt-0.5 text-hub-green" />;
    case 'failed':
      return <XCircle className="h-3 w-3 shrink-0 mt-0.5 text-hub-red" />;
    case 'blocked':
      return <MinusCircle className="h-3 w-3 shrink-0 mt-0.5 text-hub-amber/60" />;
    case 'running':
      return <Loader2 className="h-3 w-3 shrink-0 mt-0.5 animate-spin text-hub-accent" />;
    case 'cancelled':
      return <MinusCircle className="h-3 w-3 shrink-0 mt-0.5 text-hub-muted" />;
    default:
      return <div className="h-3 w-3 shrink-0 mt-0.5 rounded-full border border-hub-text/20" />;
  }
}

function stepTextColor(status: ExecutionStep['status']): string {
  switch (status) {
    case 'succeeded': return 'text-hub-green/70';
    case 'failed':    return 'text-hub-red/70';
    case 'blocked':   return 'text-hub-amber/50';
    case 'cancelled': return 'text-hub-muted';
    case 'running':   return 'text-hub-text/80';
    default:          return 'text-hub-muted';
  }
}

function stepLabel(step: ExecutionStep): string {
  if (step.description) return step.description;
  const action = ACTION_IT[step.action] ?? step.action;
  const count  = step.device_ids?.length ?? 0;
  if (count > 1)    return `${action} (${count} dispositivi)`;
  if (step.device_id) return `${action} — ${step.device_id}`;
  return action;
}

interface Props {
  run: ExecutionRun;
  phase: 'executing' | 'done';
}

export default function ExecutionProgressCard({ run, phase }: Props) {
  const isExecuting = phase === 'executing';

  return (
    <div className={`space-y-1.5 rounded-[18px] border p-3 ${
      isExecuting
        ? 'border-blue-500/20 bg-blue-500/[0.04]'
        : 'border-hub-text/5 bg-black/10'
    }`}>

      {/* Header esecuzione in corso */}
      {isExecuting && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-hub-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Esecuzione in corso…</span>
          </div>
          {run.steps_total > 0 && (
            <span className="text-xs tabular-nums text-hub-muted">
              {run.steps_done}/{run.steps_total}
            </span>
          )}
        </div>
      )}

      {/* Lista step */}
      {run.steps.map((step, idx) => {
        const isSeqDep =
          step.dependency_type === 'sequential' &&
          step.depends_on != null &&
          idx > 0;

        return (
          <div key={step.id}>
            {/* Connettore visivo per step sequenziali */}
            {isSeqDep && (
              <div className="ml-1.5 my-0.5 h-2.5 border-l border-dashed border-hub-text/10" />
            )}

            <div className="flex items-start gap-2 text-xs">
              <StepIcon status={step.status} />

              <div className="flex-1 min-w-0">
                <span className={stepTextColor(step.status)}>
                  {stepLabel(step)}
                </span>

                {/* Device multipli */}
                {(step.device_ids?.length ?? 0) > 1 && !step.description && (
                  <span className="ml-1 text-hub-muted">
                    ({step.device_ids!.length} disp.)
                  </span>
                )}

                {/* Etichetta bloccato */}
                {step.status === 'blocked' && (
                  <span className="ml-1 text-hub-amber/40 italic">bloccato</span>
                )}

                {/* Errore specifico (non per blocked: già ha etichetta) */}
                {step.error && step.status !== 'blocked' && (
                  <div className="mt-0.5 truncate text-hub-red/60">
                    {step.error}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
