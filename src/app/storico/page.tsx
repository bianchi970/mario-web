'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useProjectId } from '@/hooks/useProjectId';
import DeviceHistoryChart from '@/components/dashboard/DeviceHistoryChart';
import {
  getEnergyHistory,
  getStoricoComandi,
  type ComandoStorico,
  type EnergyHistorySlot,
} from '@/lib/api/history';

/**
 * Lo storico dei comandi è UNO: il registro del Brain (`command_outbox`), dove
 * passa ogni comando che MARIO manda all'Hub (22/10/2026, decisione di Romeo).
 * Prima questa pagina mostrava i conteggi dei tipi di evento dell'Hub
 * («device.state.changed 412»): numeri, non cosa è successo.
 */
const ESITO: Record<ComandoStorico['state'], { testo: string; tono: string }> = {
  acked:     { testo: 'eseguito',        tono: 'text-hub-green' },
  simulated: { testo: 'simulato, non eseguito', tono: 'text-hub-muted' },
  failed:    { testo: 'non riuscito',    tono: 'text-hub-red' },
  expired:   { testo: 'nessuna risposta', tono: 'text-hub-red' },
  pending:   { testo: 'in corso',        tono: 'text-hub-muted' },
  sent:      { testo: 'in corso',        tono: 'text-hub-muted' },
};

// Quanto ne sa il device, con le parole dell'Hub (`device` · `in_corso` · `nessuna`).
const CONFERMA: Record<string, string> = {
  device:   'confermato dal dispositivo',
  in_corso: 'il dispositivo ci sta lavorando',
  nessuna:  'arrivato, ma il dispositivo non lo conferma',
};

/** `created_at` è UTC senza fuso ("YYYY-MM-DD HH:MM:SS"): si legge come UTC. */
function quando(utc: string): string {
  const d = new Date(utc.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return utc;
  return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function maiuscola(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export default function StoricoPage() {
  const projectId = useProjectId();

  const [energyHistory, setEnergyHistory] = useState<EnergyHistorySlot[]>([]);
  const [comandi, setComandi] = useState<ComandoStorico[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void Promise.allSettled([
      getEnergyHistory(projectId, 24),
      getStoricoComandi(projectId, 50),
    ]).then(([energyRes, comandiRes]) => {
      if (cancelled) return;
      setLoading(false);

      setEnergyHistory(
        energyRes.status === 'fulfilled' ? (energyRes.value.history ?? []) : [],
      );
      // `null` = non letto: «non riesco a leggere» non è «nessun comando».
      setComandi(
        comandiRes.status === 'fulfilled' ? (comandiRes.value.comandi ?? []) : null,
      );

      if (energyRes.status === 'rejected' && comandiRes.status === 'rejected') {
        setError('Casa non raggiungibile');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (!projectId) {
    return (
      <>
        <TopBar title="Storico" />
        <main className="flex-1 p-5">
          <div className="card text-center py-12">
            <p className="text-sm text-hub-text">Seleziona un progetto nelle Impostazioni.</p>
            <p className="mt-1 text-xs text-hub-muted">Imposta il Project ID per vedere lo storico.</p>
          </div>
        </main>
      </>
    );
  }

  const energyPoints = energyHistory.map(s => ({ ts: s.hour, value: s.total_w }));

  return (
    <>
      <TopBar title="Storico" />
      <main className="flex-1 p-5 space-y-6">

        {loading && (
          <div className="card text-center py-12 text-hub-muted">
            <p className="text-sm">Caricamento storico...</p>
          </div>
        )}

        {!loading && error && (
          <div className="card text-center py-8">
            <p className="text-sm text-hub-text">{error}</p>
            <p className="mt-1 text-xs text-hub-muted">Verifica che MARIO sia attivo.</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="card">
              <h2 className="text-sm font-medium text-hub-text mb-3">Comandi</h2>
              {comandi === null ? (
                <p className="text-xs text-hub-muted">Non riesco a leggere lo storico dei comandi.</p>
              ) : comandi.length === 0 ? (
                <p className="text-xs text-hub-muted">Nessun comando registrato.</p>
              ) : (
                <ul className="divide-y divide-hub-border/40" aria-label="Storico dei comandi">
                  {comandi.map((c) => {
                    const esito = ESITO[c.state] ?? { testo: c.state, tono: 'text-hub-muted' };
                    const conferma = c.state === 'acked' && c.conferma ? CONFERMA[c.conferma] : null;
                    return (
                      <li key={c.command_id} className="py-2">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm text-hub-text">{maiuscola(c.detto)}</span>
                          <span className="text-xs font-mono text-hub-muted shrink-0">{quando(c.created_at)}</span>
                        </div>
                        <p className="text-xs mt-0.5">
                          <span className={esito.tono}>{esito.testo}</span>
                          {conferma && <span className="text-hub-muted"> · {conferma}</span>}
                          {c.origine && <span className="text-hub-muted"> · chiesto da {c.origine}</span>}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="card">
              <h2 className="text-sm font-medium text-hub-text mb-3">⚡ Potenza — ultime 24h</h2>
              {energyPoints.length < 2 ? (
                <p className="text-xs text-hub-muted">Nessun dato energetico nelle ultime 24 ore</p>
              ) : (
                <DeviceHistoryChart points={energyPoints} unit="W" />
              )}
            </div>
          </>
        )}

      </main>
    </>
  );
}
