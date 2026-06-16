'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, ShieldOff, Shield } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { useProjectId } from '@/hooks/useProjectId';
import { fetchAPI } from '@/lib/api/client';

// ── Tipi ──────────────────────────────────────────────────────────────────────

type SecurityMode = 'disarmed' | 'home' | 'night' | 'away';

type SecurityState = {
  mode:       SecurityMode;
  updated_at: string | null;
};

type SecurityEvent = {
  id:         string;
  event_type: string;
  severity:   string;
  device_id:  string | null;
  room:       string | null;
  armed_mode: string | null;
  created_at: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const MODE_LABELS: Record<SecurityMode, string> = {
  disarmed: 'Disarmato',
  home:     'Casa',
  night:    'Notte',
  away:     'Fuori casa',
};

const MODE_DESC: Record<SecurityMode, string> = {
  disarmed: 'Nessuna sorveglianza attiva',
  home:     'Perimetro esterno monitorato',
  night:    'Perimetro + corridoi',
  away:     'Sorveglianza completa',
};

function ModeIcon({ mode }: { mode: SecurityMode }) {
  if (mode === 'disarmed') return <ShieldOff  className="h-8 w-8 text-white/30" />;
  if (mode === 'home')     return <Shield     className="h-8 w-8 text-blue-400" />;
  if (mode === 'night')    return <ShieldCheck className="h-8 w-8 text-violet-400" />;
  return                          <ShieldAlert className="h-8 w-8 text-amber-400" />;
}

function modeColors(mode: SecurityMode) {
  if (mode === 'disarmed') return 'border-white/10 bg-white/5 text-white/50';
  if (mode === 'home')     return 'border-blue-500/40 bg-blue-500/10 text-blue-300';
  if (mode === 'night')    return 'border-violet-500/40 bg-violet-500/10 text-violet-300';
  return                          'border-amber-500/40 bg-amber-500/10 text-amber-300';
}

function severityColor(s: string) {
  if (s === 'critical') return 'text-red-400';
  if (s === 'warning')  return 'text-amber-400';
  return 'text-white/40';
}

function formatEventType(t: string) {
  const map: Record<string, string> = {
    motion_detected:  'Movimento rilevato',
    door_open:        'Porta aperta',
    window_open:      'Finestra aperta',
    alarm_triggered:  'Allarme attivato',
    mode_changed:     'Modalità cambiata',
    tamper:           'Manomissione',
    armed:            'Armato',
    disarmed:         'Disarmato',
  };
  return map[t] ?? t;
}

function formatTs(ts: string) {
  try {
    return new Date(ts).toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ts; }
}

const MODES: SecurityMode[] = ['disarmed', 'home', 'night', 'away'];

// ── Componente ────────────────────────────────────────────────────────────────

export default function SecurityPage() {
  const projectId = useProjectId();

  const [state,    setState]    = useState<SecurityState | null>(null);
  const [events,   setEvents]   = useState<SecurityEvent[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const [confirm,  setConfirm]  = useState<SecurityMode | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [stateRes, eventsRes] = await Promise.all([
        fetchAPI<{ success: boolean; mode: SecurityMode; updated_at: string | null }>(
          `/api/hub/security/state?project_id=${encodeURIComponent(projectId)}`,
        ),
        fetchAPI<{ success: boolean; events: SecurityEvent[] }>(
          `/api/hub/security/events?project_id=${encodeURIComponent(projectId)}&limit=20`,
        ),
      ]);
      setState({ mode: stateRes.mode, updated_at: stateRes.updated_at });
      setEvents(eventsRes.events ?? []);
    } catch {
      setError('Sistema di sicurezza non raggiungibile');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  async function handleSetMode(mode: SecurityMode) {
    if (!projectId || changing) return;
    // Conferma per inserimento (non per disarmo)
    if (mode !== 'disarmed' && state?.mode === 'disarmed') {
      setConfirm(mode);
      return;
    }
    await doSetMode(mode);
  }

  async function doSetMode(mode: SecurityMode) {
    if (!projectId) return;
    setChanging(true);
    setConfirm(null);
    try {
      await fetchAPI(`/api/hub/security/state`, {
        method: 'POST',
        body:   JSON.stringify({ mode, project_id: projectId }),
      });
      setState((prev) => prev ? { ...prev, mode, updated_at: new Date().toISOString() } : prev);
      await load();
    } catch {
      setError('Errore cambio modalità');
    } finally {
      setChanging(false);
    }
  }

  if (!projectId) {
    return (
      <>
        <TopBar title="Sicurezza" />
        <main className="flex-1 p-5">
          <div className="rounded-[22px] border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-sm text-white/40">Seleziona un progetto nelle Impostazioni.</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title="Sicurezza" />

      {/* Dialog conferma inserimento */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-[24px] border border-amber-500/30 bg-hub-surface p-6 space-y-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-6 w-6 text-amber-400 shrink-0" />
              <h2 className="font-semibold text-white">Conferma inserimento</h2>
            </div>
            <p className="text-sm text-white/60">
              Stai per attivare la modalità <strong className="text-white">{MODE_LABELS[confirm]}</strong>.
              Il sistema di sicurezza verrà armato.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 rounded-xl border border-white/20 py-2.5 text-sm text-white/60 hover:bg-white/5"
              >
                Annulla
              </button>
              <button
                onClick={() => void doSetMode(confirm)}
                className="flex-1 rounded-xl border border-amber-500/50 bg-amber-500/20 py-2.5 text-sm text-amber-300 hover:bg-amber-500/30"
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 space-y-5 px-4 py-5 text-white">

        {loading && (
          <div className="rounded-[22px] border border-white/10 bg-white/5 p-5 text-center text-sm text-white/40">
            Caricamento...
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center gap-3 rounded-[22px] border border-red-500/25 bg-red-500/10 p-4 text-red-100">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span className="flex-1 text-sm">{error}</span>
            <button
              onClick={() => void load()}
              className="rounded-xl border border-red-500/30 bg-red-500/20 px-3 py-1.5 text-sm"
            >
              Riprova
            </button>
          </div>
        )}

        {state && !loading && (
          <>
            {/* Stato attuale */}
            <div className={`rounded-[28px] border p-6 ${modeColors(state.mode)}`}>
              <div className="flex items-center gap-4">
                <ModeIcon mode={state.mode} />
                <div>
                  <div className="text-xl font-semibold">{MODE_LABELS[state.mode]}</div>
                  <div className="mt-0.5 text-sm opacity-70">{MODE_DESC[state.mode]}</div>
                  {state.updated_at && (
                    <div className="mt-1 text-xs opacity-50">{formatTs(state.updated_at)}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Pulsanti modalità */}
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                Modalità
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MODES.map((m) => (
                  <button
                    key={m}
                    onClick={() => void handleSetMode(m)}
                    disabled={changing || m === state.mode}
                    className={`rounded-[18px] border px-4 py-3 text-sm font-medium transition-all disabled:opacity-40 ${
                      m === state.mode
                        ? modeColors(m) + ' opacity-100'
                        : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {MODE_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            {/* Eventi recenti */}
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                Eventi recenti
              </div>
              {events.length === 0 ? (
                <p className="text-sm text-white/30 py-2">Nessun evento registrato</p>
              ) : (
                <div className="space-y-2">
                  {events.map((e) => (
                    <div key={e.id} className="flex items-start gap-3 py-1.5 border-b border-white/5 last:border-0">
                      <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${severityColor(e.severity)} bg-current`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white/80">{formatEventType(e.event_type)}</div>
                        {(e.device_id || e.room) && (
                          <div className="text-xs text-white/40 truncate">
                            {[e.room, e.device_id].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-white/30 shrink-0">{formatTs(e.created_at)}</span>
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
