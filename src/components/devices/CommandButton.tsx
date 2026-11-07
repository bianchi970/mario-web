'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { useOfflineMode } from '@/components/layout/OfflineModeProvider';
import { useProjectId } from '@/hooks/useProjectId';
import { ApiClientError } from '@/lib/api/client';
import type { Device } from '@/lib/hub-types';
import { executeUiCommand, esitoDetto } from '@/lib/api/ui-command';
import { azioniDi, vuoleUnValore } from '@/lib/capacita';

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

function formatCommandError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.message) return error.message;
    if (error.code) return HUB_ERROR_CODES[error.code] ?? 'Operazione non riuscita';
  }
  return 'Operazione non riuscita';
}

async function sendCommand(
  deviceId: string,
  projectId: string,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; errorMessage: string | null }> {
  try {
    const esito = esitoDetto(await executeUiCommand(projectId, {
      device_id: deviceId,
      action,
      params,
    }));
    // Riuscito solo se l'Hub l'ha eseguito: un simulato lo dice (21/10/2026).
    return esito.fatto ? { ok: true, errorMessage: null } : { ok: false, errorMessage: esito.frase };
  } catch (error) {
    if (error instanceof ApiClientError) {
      return { ok: false, errorMessage: formatCommandError(error) };
    }
    return { ok: false, errorMessage: 'Errore di comunicazione' };
  }
}

// ── Controllo termostato ──────────────────────────────────────────────────

function ThermostatControl({ device, projectId }: { device: Device; projectId: string }) {
  const s = (device.state ?? {}) as Record<string, unknown>;

  // Setpoint: null finché il protocollo non lo invia — nessun fallback fisso
  const rawSetpoint = s.setpoint ?? s.target_temperature ?? s.heating_setpoint;
  const initialSetpoint: number | null = typeof rawSetpoint === 'number' ? rawSetpoint : null;

  // Range e step dal protocollo (schema comune); se assenti usa valori sicuri
  const minTemp  = typeof s.min  === 'number' ? s.min  : 5;
  const maxTemp  = typeof s.max  === 'number' ? s.max  : 35;
  const stepTemp = typeof s.step === 'number' ? s.step : 0.5;
  const unit     = typeof s.unit === 'string'  ? s.unit : '°C';

  const currentTemp = typeof s.temperature === 'number' ? s.temperature : null;

  const [setpoint, setSetpoint] = useState<number | null>(initialSetpoint);
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

  // Si regola a partire dal setpoint LETTO, e da nient'altro. Fino al 6/11/2026
  // senza setpoint si partiva dalla temperatura della stanza o dal minimo (5 °C
  // inventato se il device non lo dichiara): il «+» mandava 5,5 °C alla valvola.
  const regolabile = setpoint !== null;

  function adjust(delta: number) {
    if (setpoint === null) return;
    const base = setpoint;
    const next = Math.round((base + delta) / stepTemp) * stepTemp;
    const clamped = Math.min(maxTemp, Math.max(minTemp, next));
    setSetpoint(clamped);
    void applySetpoint(clamped);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {currentTemp !== null && (
        <span className="text-xs text-hub-muted">Attuale: {currentTemp}{unit}</span>
      )}
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="secondary" onClick={() => adjust(-stepTemp)} disabled={loading || !regolabile}>−</Button>
        <span className={`min-w-[3.2rem] text-center text-sm font-mono tabular-nums ${
          result === 'ok' ? 'text-hub-green' : result === 'error' ? 'text-hub-red' : 'text-hub-text'
        }`}>
          {loading ? '…' : setpoint !== null ? `${setpoint.toFixed(1)}${unit}` : '—'}
        </span>
        <Button size="sm" variant="secondary" onClick={() => adjust(+stepTemp)} disabled={loading || !regolabile}>+</Button>
      </div>
      {errorMessage && <p className="text-xs text-hub-red text-right">{errorMessage}</p>}
    </div>
  );
}

// ── Comandi generici ──────────────────────────────────────────────────────
//
// ⛔ I pulsanti nascono da ciò che il device DICHIARA di saper fare, con il nome
// che gli dà l'Hub — non dal suo tipo. Fino al 5/11/2026 c'era una tabella per
// tipo con On/Off di ripiego: una tapparella aveva «Apri» = `turn_on` (che
// l'Hub rifiuta), e la valvola `4-ep1`, di tipo `termostato` e non
// `thermostat`, mostrava On/Off e nessun controllo della temperatura.
// Un device che non dichiara azioni non ha pulsanti: non si inventano.

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

  const azioni = azioniDi(device);
  const regolaTemperatura = azioni.some((a) => a.key === 'set_temperature');
  const cmds = azioni.filter((a) => !vuoleUnValore(a.key)).map((a) => ({ action: a.key, label: a.label }));
  if (!regolaTemperatura && cmds.length === 0) return null;

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
      {/* Chi sa regolare la temperatura ha il suo controllo (la valvola, il termostato) */}
      {regolaTemperatura && <ThermostatControl device={device} projectId={projectId} />}
      {cmds.length > 0 && <div className="flex items-center gap-1.5 flex-wrap justify-end">
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
      </div>}
      {errorMessage && <p className="text-xs text-hub-red text-right">{errorMessage}</p>}
    </div>
  );
}
