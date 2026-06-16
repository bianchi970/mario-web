'use client';

import { useState } from 'react';
import type { Automation } from '@/lib/hub-types';
import { useInstallerMode } from '@/context/InstallerModeContext';
import { AUTOMATION_COPY, triggerToText, actionsToText } from './automation-copy';

type RunStatus = 'idle' | 'loading' | 'ok' | 'error';

interface Props {
  automation: Automation;
  deviceNames: Map<string, string>;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onRun?: (id: string) => Promise<void>;
}

export default function AutomationCard({ automation, deviceNames, onToggle, onDelete, onRun }: Props) {
  const { installerMode } = useInstallerMode();
  const whenText = triggerToText(automation.trigger, deviceNames);
  const doesText = actionsToText(automation.actions, deviceNames);
  const [runState, setRunState] = useState<RunStatus>('idle');

  async function handleRun() {
    if (!onRun) return;
    setRunState('loading');
    try {
      await onRun(automation.id);
      setRunState('ok');
      setTimeout(() => setRunState('idle'), 2500);
    } catch {
      setRunState('error');
      setTimeout(() => setRunState('idle'), 2500);
    }
  }

  return (
    <div className="card space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-hub-text text-sm">{automation.name}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
            automation.enabled
              ? 'bg-hub-accent/20 text-hub-accent'
              : 'bg-hub-border/40 text-hub-muted'
          }`}
        >
          {automation.enabled ? AUTOMATION_COPY.enabled : AUTOMATION_COPY.disabled}
        </span>
      </div>

      <div className="text-xs text-hub-muted space-y-0.5">
        <div>
          <span className="font-medium text-hub-text">{AUTOMATION_COPY.when}:</span>{' '}
          {whenText}
        </div>
        <div>
          <span className="font-medium text-hub-text">{AUTOMATION_COPY.does}:</span>{' '}
          {doesText}
        </div>
        {automation.last_run && (
          <div className="text-[10px] opacity-60">
            Ultima esec.:{' '}
            {(() => { try { return new Date(automation.last_run!).toLocaleString('it-IT'); } catch { return automation.last_run; } })()}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1 flex-wrap">
        {/* Esegui — visibile a tutti */}
        {onRun && (
          <button
            onClick={() => void handleRun()}
            disabled={runState === 'loading'}
            className={`text-xs px-3 py-1 rounded border transition-colors disabled:opacity-40 ${
              runState === 'ok'
                ? 'border-emerald-500/60 text-emerald-400'
                : runState === 'error'
                ? 'border-red-500/60 text-red-400'
                : 'border-hub-accent/60 text-hub-accent hover:bg-hub-accent/10'
            }`}
          >
            {runState === 'loading' ? '…' : runState === 'ok' ? 'Eseguito ✓' : runState === 'error' ? 'Errore' : 'Esegui'}
          </button>
        )}

        {/* Toggle on/off — visibile a tutti */}
        <button
          onClick={() => onToggle(automation.id, !automation.enabled)}
          className={`text-xs px-3 py-1 rounded border transition-colors ${
            automation.enabled
              ? 'border-hub-accent/50 text-hub-accent hover:bg-hub-accent/10'
              : 'border-hub-border text-hub-muted hover:text-hub-text hover:bg-hub-border/30'
          }`}
        >
          {automation.enabled ? 'Disattiva' : 'Attiva'}
        </button>

        {/* Elimina — solo installatore */}
        {installerMode && (
          <button
            onClick={() => {
              if (window.confirm(AUTOMATION_COPY.deleteConfirm)) {
                onDelete(automation.id);
              }
            }}
            className="text-xs px-3 py-1 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Elimina
          </button>
        )}
      </div>
    </div>
  );
}
