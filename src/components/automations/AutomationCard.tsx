'use client';

import type { Automation } from '@/lib/hub-types';
import { useInstallerMode } from '@/context/InstallerModeContext';
import { AUTOMATION_COPY, triggerToText, actionsToText } from './automation-copy';

interface Props {
  automation: Automation;
  deviceNames: Map<string, string>;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}

export default function AutomationCard({ automation, deviceNames, onToggle, onDelete }: Props) {
  const { installerMode } = useInstallerMode();
  const whenText = triggerToText(automation.trigger, deviceNames);
  const doesText = actionsToText(automation.actions, deviceNames);

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
      </div>

      <div className="flex items-center gap-2 pt-1">
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
