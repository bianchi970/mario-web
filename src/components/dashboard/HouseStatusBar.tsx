'use client';

/**
 * HouseStatusBar — indicatore stato casa in tempo reale.
 *
 * Polling adattivo:
 *   - 30s quando hub risponde OK
 *   - 5s quando hub ha errori (per rilevare recovery velocemente)
 *   - Sospeso quando la pagina è nascosta (document.visibilityState === 'hidden')
 */

import { useEffect, useRef, useState } from 'react';
import { listDevices } from '@/lib/api/devices';
import { allarmiAperti, computeHouseState } from '@/lib/house-state';
import { listNotifications, type HubNotification } from '@/lib/api/notifications';
import { useProjectId } from '@/hooks/useProjectId';
import { useOfflineMode } from '@/components/layout/OfflineModeProvider';

type StatusLevel = 'ok' | 'warning' | 'error' | 'offline' | 'loading';

interface StatusInfo {
  level: StatusLevel;
  label: string;
}

const NOME_PERICOLO = { gas: 'gas', fumo: 'fumo', acqua: 'acqua' } as const;

/**
 * Gli allarmi di pericolo si leggono dalle notifiche dell'Hub, come in «Stato
 * Casa» (`allarmiAperti`): il sensore gas vero ha lo stato vuoto, e fino al
 * 13/11/2026 questa barra diceva «Casa OK» con un allarme gas aperto (HS-01).
 */
export function computeStatus(
  devices: Awaited<ReturnType<typeof listDevices>>,
  notifiche: HubNotification[] = [],
): StatusInfo {
  const pericoli = allarmiAperti(notifiche).filter((a) => !a.prova);
  if (pericoli.length > 0) {
    const tipi = [...new Set(pericoli.map((a) => NOME_PERICOLO[a.pericolo]))];
    return { level: 'error', label: `Allarme ${tipi.join(', ')}` };
  }
  if (!devices.length) return { level: 'ok', label: 'Casa OK' };

  const state       = computeHouseState(devices);
  const offlines    = state.alerts.filter((a) => a.type === 'offline').length;
  const criticals   = state.alerts.filter((a) => a.type === 'gas' || a.type === 'tamper').length;

  if (criticals > 0) return { level: 'error',   label: `${criticals} alert critico` };
  if (offlines  > 0) return { level: 'error',   label: `${offlines} ${offlines === 1 ? 'dispositivo offline' : 'dispositivi offline'}` };
  if (state.batteryWarnings > 0) return { level: 'warning', label: `${state.batteryWarnings} batter${state.batteryWarnings === 1 ? 'ia scarica' : 'ie scariche'}` };
  return { level: 'ok', label: 'Casa OK' };
}

const DOT_CLASS: Record<StatusLevel, string> = {
  ok:      'bg-success',
  warning: 'bg-warning',
  error:   'bg-danger',
  offline: 'bg-offline',
  loading: 'bg-text-2 animate-pulse',
};

export default function HouseStatusBar() {
  const projectId = useProjectId();
  const { offlineMode } = useOfflineMode();

  const [info,     setInfo]     = useState<StatusInfo>({ level: 'loading', label: '' });
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (offlineMode) {
      setInfo({ level: 'offline', label: 'Sistema offline' });
      return;
    }

    cancelRef.current = false;

    async function poll() {
      if (cancelRef.current) return;
      if (document.visibilityState === 'hidden') return;
      if (!projectId) {
        timerRef.current = setTimeout(poll, 10_000);
        return;
      }

      try {
        const [devices, notifiche] = await Promise.all([
          listDevices(projectId),
          listNotifications(projectId).catch(() => [] as HubNotification[]),
        ]);
        if (cancelRef.current) return;
        setInfo(computeStatus(devices, notifiche));
        timerRef.current = setTimeout(poll, 30_000);
      } catch {
        if (cancelRef.current) return;
        setInfo({ level: 'error', label: 'Hub non raggiungibile' });
        timerRef.current = setTimeout(poll, 5_000);
      }
    }

    void poll();

    function onVisible() {
      if (document.visibilityState === 'visible') {
        if (timerRef.current) clearTimeout(timerRef.current);
        void poll();
      }
    }

    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [projectId, offlineMode]);

  return (
    <div className="flex items-center gap-1.5 text-xs text-text-2 select-none">
      <span className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${DOT_CLASS[info.level]}`} />
      {/* Sul telefono restava solo il pallino: un allarme si dice anche lì. */}
      <span className={`${info.level === 'error' ? 'inline' : 'hidden sm:inline'} truncate max-w-[120px]`}>{info.label}</span>
    </div>
  );
}
