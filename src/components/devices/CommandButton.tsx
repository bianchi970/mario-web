'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { useOfflineMode } from '@/components/layout/OfflineModeProvider';
import { useProjectId } from '@/hooks/useProjectId';
import type { Device } from '@/lib/hub-types';

const HUB_ERROR_CODES: Record<string, string> = {
  DEVICE_NOT_FOUND: 'Dispositivo non trovato',
  DEVICE_UNREACHABLE: 'Dispositivo non raggiungibile',
  COMMAND_NOT_SUPPORTED: 'Comando non supportato',
  AUTH_REQUIRED: 'Autenticazione richiesta',
  AUTH_FAILED: 'Autenticazione fallita',
  UNAUTHORIZED: 'Non autorizzato',
  FORBIDDEN: 'Accesso negato',
  TIMEOUT: 'Timeout comunicazione',
  HUB_UNAVAILABLE: 'Hub non disponibile',
};

function formatCommandError(payload: Record<string, unknown> | null): string {
  if (!payload) return 'Operazione non riuscita';
  const err = payload.error;
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    if (typeof e.message === 'string' && e.message) return e.message;
    if (typeof e.code === 'string' && e.code) return HUB_ERROR_CODES[e.code] ?? 'Operazione non riuscita';
  }
  if (typeof err === 'string' && err) return HUB_ERROR_CODES[err] ?? 'Operazione non riuscita';
  return 'Operazione non riuscita';
}

const COMMANDS: Record<string, { action: string; label: string }[]> = {
  light: [{ action: 'turn_on', label: 'On' }, { action: 'turn_off', label: 'Off' }],
  rgb_light: [{ action: 'turn_on', label: 'On' }, { action: 'turn_off', label: 'Off' }],
  cover: [{ action: 'turn_on', label: 'Open' }, { action: 'turn_off', label: 'Close' }],
  blind: [{ action: 'turn_on', label: 'Open' }, { action: 'turn_off', label: 'Close' }],
  awning: [{ action: 'turn_on', label: 'Open' }, { action: 'turn_off', label: 'Close' }],
  switch: [{ action: 'turn_on', label: 'On' }, { action: 'turn_off', label: 'Off' }],
  plug: [{ action: 'turn_on', label: 'On' }, { action: 'turn_off', label: 'Off' }],
  thermostat: [{ action: 'set_temperature', label: 'Set Temp' }],
  alarm_panel: [{ action: 'arm', label: 'Arm' }, { action: 'disarm', label: 'Disarm' }],
  ev_charger: [{ action: 'turn_on', label: 'Start' }, { action: 'turn_off', label: 'Stop' }],
};

const DEFAULT_CMDS = [{ action: 'turn_on', label: 'On' }, { action: 'turn_off', label: 'Off' }];

const READ_ONLY_TYPES = new Set([
  'motion_sensor', 'sensor', 'meter', 'battery', 'camera', 'controller',
]);

interface Props {
  device: Device;
}

export default function CommandButton({ device }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<'ok' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { offlineMode, offlineModeLoading } = useOfflineMode();
  const projectId = useProjectId();

  if (READ_ONLY_TYPES.has(device.type)) return null;

  const cmds = COMMANDS[device.type] ?? DEFAULT_CMDS;

  async function dispatch(action: string) {
    if (offlineMode || offlineModeLoading || !projectId) {
      return;
    }

    setLoading(action);
    setResult(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/hub/devices/${encodeURIComponent(device.id)}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, action, params: {} }),
      });

      if (res.ok) {
        setResult('ok');
        return;
      }

      const payload = await res.json().catch(() => null) as Record<string, unknown> | null;
      setResult('error');
      setErrorMessage(formatCommandError(payload));
    } catch {
      setResult('error');
      setErrorMessage('Errore di comunicazione');
    } finally {
      setLoading(null);
      setTimeout(() => {
        setResult(null);
        setErrorMessage(null);
      }, 2000);
    }
  }

  if (offlineMode || offlineModeLoading) {
    return (
      <Button size="sm" variant="danger" disabled>
        {offlineMode ? 'Sistema offline' : 'Stato sistema...'}
      </Button>
    );
  }

  if (!projectId) {
    return (
      <Button size="sm" variant="danger" disabled>
        Seleziona progetto
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        {cmds.map(({ action, label }) => (
          <Button
            key={action}
            size="sm"
            variant={result === 'ok' ? 'ghost' : result === 'error' ? 'danger' : 'secondary'}
            loading={loading === action}
            onClick={() => dispatch(action)}
          >
            {result === 'ok' && loading !== action ? 'OK' : label}
          </Button>
        ))}
      </div>
      {errorMessage ? (
        <p className="text-xs text-hub-red text-right">{errorMessage}</p>
      ) : null}
    </div>
  );
}
