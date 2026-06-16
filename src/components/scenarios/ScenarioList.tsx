'use client';

import { useMemo, useState } from 'react';
import { SCENARIO_COPY } from '@/components/scenarios/scenario-copy';
import type { ScenarioRecord } from '@/lib/api/scenarios';

type Props = {
  items: ScenarioRecord[];
  loading?: boolean;
  onRefresh: () => Promise<void> | void;
  onToggle: (scenarioId: string, enabled: boolean) => Promise<void> | void;
  onDelete: (scenarioId: string) => Promise<void> | void;
  onRun: (scenarioId: string) => Promise<void> | void;
};

type RunStatus = 'idle' | 'loading' | 'ok' | 'error';

const DANGEROUS_KEYWORDS = ['allarme', 'alarm', 'serratura', 'lock', 'inserisci', 'arm', 'disarma'];

function isDangerous(item: ScenarioRecord): boolean {
  const name = item.name.toLowerCase();
  return DANGEROUS_KEYWORDS.some((k) => name.includes(k));
}

function formatTrigger(item: ScenarioRecord): string {
  const t = item.trigger as Record<string, unknown>;
  const type = t?.type as string | undefined;

  if (type === 'schedule') {
    const cron = t.cron as string | undefined;
    if (cron) {
      const parts = cron.trim().split(/\s+/);
      if (parts.length >= 5) {
        const [min, hour] = parts;
        if (/^\d+$/.test(min) && /^\d+$/.test(hour)) {
          return `Ogni giorno ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
        }
      }
      return `Pianificato (${cron})`;
    }
    return 'Pianificato';
  }
  if (type === 'bus_event') {
    const evt = (t.event_type as string) || '';
    return evt ? `Evento: ${evt}` : 'Evento bus';
  }
  if (type === 'device_state') {
    return 'Stato dispositivo';
  }
  if (type === 'sun_event') {
    const evtName = t.event === 'sunrise' ? 'Alba' : t.event === 'sunset' ? 'Tramonto' : String(t.event ?? '');
    const off = typeof t.offset_minutes === 'number' && t.offset_minutes !== 0
      ? ` ${t.offset_minutes > 0 ? '+' : ''}${t.offset_minutes} min`
      : '';
    return `${evtName}${off}`;
  }
  // fallback: raw cron field at top level (legacy)
  const cron = t?.cron as string | undefined;
  if (cron) return cron;
  return '-';
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('it-IT');
}

export default function ScenarioList({
  items,
  loading = false,
  onRefresh,
  onToggle,
  onDelete,
  onRun,
}: Props) {
  const [search, setSearch] = useState('');
  const [runState, setRunState] = useState<Record<string, RunStatus>>({});
  const [pendingRunId, setPendingRunId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((s) => s.name.toLowerCase().includes(q));
  }, [items, search]);

  async function executeRun(id: string) {
    setRunState((prev) => ({ ...prev, [id]: 'loading' }));
    try {
      await onRun(id);
      setRunState((prev) => ({ ...prev, [id]: 'ok' }));
      setTimeout(() => setRunState((prev) => ({ ...prev, [id]: 'idle' })), 2500);
    } catch {
      setRunState((prev) => ({ ...prev, [id]: 'error' }));
      setTimeout(() => setRunState((prev) => ({ ...prev, [id]: 'idle' })), 2500);
    }
  }

  function handleRunClick(item: ScenarioRecord) {
    if (isDangerous(item)) {
      setPendingRunId(item.id);
    } else {
      void executeRun(item.id);
    }
  }

  function handleConfirmRun() {
    if (!pendingRunId) return;
    const id = pendingRunId;
    setPendingRunId(null);
    void executeRun(id);
  }

  const pendingItem = pendingRunId ? items.find((i) => i.id === pendingRunId) : null;

  return (
    <div className="card space-y-3">

      {/* ── Confirm dialog ── */}
      {pendingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="rounded-xl border border-hub-border bg-hub-surface p-6 space-y-4 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-sm font-semibold text-hub-text">Conferma esecuzione</h3>
            <p className="text-sm text-hub-muted">
              Stai per eseguire{' '}
              <span className="font-medium text-hub-text">{pendingItem.name}</span>.
              Questo scenario coinvolge elementi critici. Continuare?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setPendingRunId(null)}
                className="rounded-lg border border-hub-border px-4 py-2 text-sm text-hub-text hover:bg-hub-bg transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfirmRun}
                className="rounded-lg bg-hub-accent px-4 py-2 text-sm text-white font-medium hover:opacity-90 transition-opacity"
              >
                Esegui
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-hub-text">{SCENARIO_COPY.listTitle}</h2>
          <p className="text-sm text-hub-muted">{SCENARIO_COPY.listDescription}</p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={loading}
          className="rounded-lg border border-hub-border px-3 py-2 text-sm text-hub-text disabled:opacity-50"
        >
          {loading ? SCENARIO_COPY.listRefreshing : SCENARIO_COPY.listRefresh}
        </button>
      </div>

      {/* ── Search ── */}
      {items.length > 0 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca scenario..."
          className="w-full rounded-lg border border-hub-border bg-hub-bg px-3 py-2 text-sm text-hub-text placeholder:text-hub-muted focus:outline-none focus:ring-1 focus:ring-hub-accent"
        />
      )}

      {/* ── Table ── */}
      {items.length ? (
        <div className="overflow-auto">
          <table className="w-full text-sm text-hub-text">
            <thead>
              <tr className="text-left text-hub-muted">
                <th className="py-2 pr-4 font-medium">{SCENARIO_COPY.listName}</th>
                <th className="py-2 pr-4 font-medium">{SCENARIO_COPY.listStatus}</th>
                <th className="py-2 pr-4 font-medium">{SCENARIO_COPY.listTrigger}</th>
                <th className="py-2 pr-4 font-medium">Ultima esec.</th>
                <th className="py-2 pr-4 font-medium">{SCENARIO_COPY.listActions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-hub-muted text-sm">
                    Nessun risultato
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const rs: RunStatus = runState[item.id] ?? 'idle';
                  return (
                    <tr key={item.id} className="border-t border-hub-border">
                      <td className="py-2 pr-4 font-medium">{item.name}</td>
                      <td className="py-2 pr-4">
                        <span className={item.enabled ? 'text-emerald-400' : 'text-hub-muted'}>
                          {item.enabled ? SCENARIO_COPY.listEnabled : SCENARIO_COPY.listDisabled}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-hub-muted text-xs">{formatTrigger(item)}</td>
                      <td className="py-2 pr-4 text-hub-muted text-xs">{formatDate(item.last_run)}</td>
                      <td className="py-2 pr-4">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleRunClick(item)}
                            disabled={loading || rs === 'loading'}
                            className={`rounded-lg border px-3 py-1 text-sm disabled:opacity-50 transition-colors ${
                              rs === 'ok'
                                ? 'border-emerald-500/60 text-emerald-400'
                                : rs === 'error'
                                ? 'border-red-500/60 text-red-400'
                                : 'border-hub-accent/60 text-hub-accent'
                            }`}
                          >
                            {rs === 'loading' ? '…' : rs === 'ok' ? 'Eseguito ✓' : rs === 'error' ? 'Errore' : 'Esegui'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void onToggle(item.id, !item.enabled)}
                            disabled={loading}
                            className="rounded-lg border border-hub-border px-3 py-1 text-sm text-hub-text disabled:opacity-50"
                          >
                            {item.enabled ? SCENARIO_COPY.listDisable : SCENARIO_COPY.listEnable}
                          </button>
                          <button
                            type="button"
                            onClick={() => void onDelete(item.id)}
                            disabled={loading}
                            className="rounded-lg border border-hub-border px-3 py-1 text-sm text-hub-text disabled:opacity-50"
                          >
                            {SCENARIO_COPY.listDelete}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-hub-border px-3 py-3 text-sm text-hub-muted">
          {SCENARIO_COPY.listEmpty}
        </div>
      )}
    </div>
  );
}
