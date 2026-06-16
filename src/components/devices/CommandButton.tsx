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

async function sendCommand(
  deviceId: string,
  projectId: string,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; errorMessage: string | null }> {
  try {
    const res = await fetch(`/api/hub/devices/${encodeURIComponent(deviceId)}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, action, params }),
    });
    if (res.ok) return { ok: true, errorMessage: null };
    const payload = await res.json().catch(() => null) as Record<string, unknown> | null;
    return { ok: false, errorMessage: formatCommandError(payload) };
  } catch {
    return { ok: false, errorMessage: 'Errore di comunicazione' };
  }
}

// ── Controllo termostato ──────────────────────────────────────────────────

function ThermostatControl({ device, projectId }: { device: Device; projectId: string }) {
  const s = (device.state ?? {}) as Record<string, unknown>;
  const initialSetpoint = Number(s.setpoint ?? s.target_temperature ?? s.heating_setpoint ?? 20);
  const currentTemp = typeof s.temperature === 'number' ? s.temperature : null;

  const [setpoint, setSetpoint] = useState<number>(initialSetpoint);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<'ok' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function applySetpoint(value: number) {
    setLoading(true);
    setResult(null);
    setErrorMessage(null);
    const { ok, errorMessage: msg } = await sendCommand(device.id, projectId, 'set_temperature', { temperature: value });
    setResult(ok ? 'ok' : 'error');
    if (!ok) setErrorMessage(msg);
    setLoading(false);
    setTimeout(() => { setResult(null); setErrorMessage(null); }, 2500);
  }

  function adjust(delta: number) {
    const next = Math.round((setpoint + delta) * 2) / 2; // step 0.5°C
    const clamped = Math.min(35, Math.max(5, next));
    setSetpoint(clamped);
    void applySetpoint(clamped);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {currentTemp !== null && (
        <span className="text-xs text-hub-muted">Attuale: {currentTemp}°C</span>
      )}
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="secondary" onClick={() => adjust(-0.5)} disabled={loading}>−</Button>
        <span className={`min-w-[3.2rem] text-center text-sm font-mono tabular-nums ${
          result === 'ok' ? 'text-emerald-400' : result === 'error' ? 'text-red-400' : 'text-hub-text'
        }`}>
          {loading ? '…' : `${setpoint.toFixed(1)}°`}
        </span>
        <Button size="sm" variant="secondary" onClick={() => adjust(+0.5)} disabled={loading}>+</Button>
      </div>
      {errorMessage && <p className="text-xs text-hub-red text-right">{errorMessage}</p>}
    </div>
  );
}

// ── Comandi generici ──────────────────────────────────────────────────────

const COMMANDS: Record<string, { action: string; label: string }[]> = {
  light:     [{ action: 'turn_on', label: 'On' }, { action: 'turn_off', label: 'Off' }],
  rgb_light: [{ action: 'turn_on', label: 'On' }, { action: 'turn_off', label: 'Off' }],
  cover:     [{ action: 'turn_on', label: 'Apri' }, { action: 'stop', label: 'Stop' }, { action: 'turn_off', label: 'Chiudi' }],
  blind:     [{ action: 'turn_on', label: 'Apri' }, { action: 'stop', label: 'Stop' }, { action: 'turn_off', label: 'Chiudi' }],
  awning:    [{ action: 'turn_on', label: 'Apri' }, { action: 'stop', label: 'Stop' }, { action: 'turn_off', label: 'Chiudi' }],
  switch:    [{ action: 'turn_on', label: 'On' }, { action: 'turn_off', label: 'Off' }],
  plug:      [{ action: 'turn_on', label: 'On' }, { action: 'turn_off', label: 'Off' }],
  alarm_panel: [{ action: 'arm', label: 'Inserisci' }, { action: 'disarm', label: 'Disinserisci' }],
  ev_charger:  [{ action: 'turn_on', label: 'Avvia' }, { action: 'turn_off', label: 'Ferma' }],
};

const DEFAULT_CMDS = [{ action: 'turn_on', label: 'On' }, { action: 'turn_off', label: 'Off' }];

const READ_ONLY_TYPES = new Set([
  'motion_sensor', 'contact_sensor', 'temperature_sensor', 'humidity_sensor',
  'sensor', 'meter', 'battery', 'camera', 'controller',
]);

// ── Componente principale ─────────────────────────────────────────────────

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

  if (offlineMode || offlineModeLoading) {
    return (
      <Button size="sm" variant="danger" disabled>
        {offlineMode ? 'Sistema offline' : '…'}
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

  // Termostato: controllo dedicato
  if (device.type === 'thermostat') {
    return <ThermostatControl device={device} projectId={projectId} />;
  }

  const cmds = COMMANDS[device.type] ?? DEFAULT_CMDS;

  async function dispatch(action: string) {
    setLoading(action);
    setResult(null);
    setErrorMessage(null);
    const { ok, errorMessage: msg } = await sendCommand(device.id, projectId!, action);
    setResult(ok ? 'ok' : 'error');
    if (!ok) setErrorMessage(msg);
    setLoading(null);
    setTimeout(() => { setResult(null); setErrorMessage(null); }, 2000);
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
            onClick={() => void dispatch(action)}
          >
            {result === 'ok' && loading !== action ? 'OK' : label}
          </Button>
        ))}
      </div>
      {errorMessage && <p className="text-xs text-hub-red text-right">{errorMessage}</p>}
    </div>
  );
}
