'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useProjectId } from '@/hooks/useProjectId';
import DeviceHistoryChart from '@/components/dashboard/DeviceHistoryChart';
import {
  getEnergyHistory,
  getHistorySummary,
  type EnergyHistorySlot,
  type HistorySummaryEntry,
} from '@/lib/api/history';

export default function StoricoPage() {
  const projectId = useProjectId();

  const [energyHistory, setEnergyHistory] = useState<EnergyHistorySlot[]>([]);
  const [summary, setSummary] = useState<HistorySummaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void Promise.allSettled([
      getEnergyHistory(projectId, 24),
      getHistorySummary(projectId),
    ]).then(([energyRes, summaryRes]) => {
      if (cancelled) return;
      setLoading(false);

      setEnergyHistory(
        energyRes.status === 'fulfilled' ? (energyRes.value.history ?? []) : [],
      );
      setSummary(
        summaryRes.status === 'fulfilled' ? (summaryRes.value.summary ?? []) : [],
      );

      if (energyRes.status === 'rejected' && summaryRes.status === 'rejected') {
        setError('Hub non raggiungibile');
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
  const topEvents = summary.slice(0, 8);
  const maxCount = topEvents.length > 0 ? Math.max(...topEvents.map(e => e.count), 1) : 1;

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
            <p className="mt-1 text-xs text-hub-muted">Verifica che il Hub sia attivo.</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="card">
              <h2 className="text-sm font-medium text-hub-text mb-3">⚡ Potenza — ultime 24h</h2>
              {energyPoints.length < 2 ? (
                <p className="text-xs text-hub-muted">Nessun dato energetico nelle ultime 24 ore</p>
              ) : (
                <DeviceHistoryChart points={energyPoints} unit="W" />
              )}
            </div>

            <div className="card">
              <h2 className="text-sm font-medium text-hub-text mb-3">Attività — ultimi 30 gg</h2>
              {topEvents.length === 0 ? (
                <p className="text-xs text-hub-muted">Nessun evento registrato</p>
              ) : (
                <div className="space-y-2">
                  {topEvents.map((e, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-hub-text truncate font-mono">{e.type}</span>
                          <span className="text-xs font-mono text-hub-muted shrink-0 ml-2">{e.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-hub-border/40 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-hub-accent"
                            style={{ width: `${Math.round((e.count / maxCount) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

      </main>
    </>
  );
}
