'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useOfflineMode } from '@/components/layout/OfflineModeProvider';
import { useProjectId } from '@/hooks/useProjectId';
import { listNotifications, dismissNotification, type HubNotification } from '@/lib/api/notifications';

// ── Severity helpers ──────────────────────────────────────────────────────────

function severityDot(severity: HubNotification['severity']) {
  if (severity === 'critical') return 'bg-red-500';
  if (severity === 'warning')  return 'bg-amber-400';
  return 'bg-hub-muted';
}

function severityRow(severity: HubNotification['severity']) {
  if (severity === 'critical') return 'border-red-500/30 bg-red-500/5';
  if (severity === 'warning')  return 'border-amber-400/30 bg-amber-400/5';
  return 'border-hub-border bg-hub-surface';
}

function formatTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ── TopBar ────────────────────────────────────────────────────────────────────

export default function TopBar({ title }: { title: string }) {
  const { offlineMode, offlineModeLoading } = useOfflineMode();
  const projectId = useProjectId();

  const [hubOk, setHubOk]               = useState<boolean | null>(null);
  const [notifications, setNotifications] = useState<HubNotification[]>([]);
  const [bellOpen, setBellOpen]           = useState(false);
  const [dismissing, setDismissing]       = useState<Set<string>>(new Set());
  const bellRef = useRef<HTMLDivElement>(null);

  // ── Hub health ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (offlineModeLoading || offlineMode) { setHubOk(null); return; }
    fetch('/api/hub/health')
      .then((r) => r.json())
      .then((d) => setHubOk(d.status === 'ok'))
      .catch(() => setHubOk(false));
  }, [offlineMode, offlineModeLoading]);

  // ── Notifications polling ───────────────────────────────────────────────────
  const loadNotifications = useCallback(async () => {
    if (!projectId || offlineMode) return;
    try {
      const data = await listNotifications(projectId, 'client');
      setNotifications(data);
    } catch { /* silent — hub potrebbe non rispondere */ }
  }, [projectId, offlineMode]);

  useEffect(() => {
    void loadNotifications();
    const timer = setInterval(() => void loadNotifications(), 30_000);
    return () => clearInterval(timer);
  }, [loadNotifications]);

  // ── Close dropdown on outside click ────────────────────────────────────────
  useEffect(() => {
    if (!bellOpen) return;
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [bellOpen]);

  // ── Dismiss ─────────────────────────────────────────────────────────────────
  async function handleDismiss(id: string) {
    if (!projectId) return;
    setDismissing((prev) => new Set(prev).add(id));
    try {
      await dismissNotification(projectId, id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch { /* silent */ } finally {
      setDismissing((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  }

  const count = notifications.length;

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-hub-border bg-hub-surface md:bg-transparent">
      <h1 className="font-semibold text-hub-text">{title}</h1>

      <div className="flex items-center gap-3">

        {/* ── Bell ─────────────────────────────────────────────────────── */}
        {projectId && (
          <div ref={bellRef} className="relative">
            <button
              type="button"
              onClick={() => setBellOpen((prev) => !prev)}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-hub-muted hover:text-hub-text hover:bg-hub-bg transition-colors"
              aria-label="Notifiche"
            >
              <span className="text-base leading-none">🔔</span>
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {bellOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-hub-border bg-hub-surface shadow-xl">
                <div className="px-4 py-2.5 border-b border-hub-border">
                  <span className="text-xs font-semibold uppercase tracking-wide text-hub-muted">
                    Notifiche {count > 0 && `(${count})`}
                  </span>
                </div>

                {count === 0 ? (
                  <p className="px-4 py-5 text-sm text-hub-muted text-center">Nessuna notifica</p>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-hub-border">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 border-l-2 ${severityRow(n.severity)}`}
                      >
                        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${severityDot(n.severity)}`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-hub-text leading-snug">{n.title}</div>
                          <div className="text-xs text-hub-muted mt-0.5 leading-snug">{n.message}</div>
                          {n.created_at && (
                            <div className="text-[10px] text-hub-muted opacity-60 mt-1">{formatTime(n.created_at)}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDismiss(n.id)}
                          disabled={dismissing.has(n.id)}
                          className="mt-0.5 shrink-0 rounded p-0.5 text-hub-muted hover:text-hub-text disabled:opacity-30 transition-colors"
                          aria-label="Chiudi"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Hub status dot ───────────────────────────────────────────── */}
        <div className="flex items-center gap-2 text-xs text-hub-muted">
          <span
            className={`w-2 h-2 rounded-full inline-block ${
              offlineMode        ? 'bg-hub-red' :
              offlineModeLoading ? 'bg-hub-amber animate-pulse' :
              hubOk === null     ? 'bg-hub-amber animate-pulse' :
              hubOk              ? 'bg-hub-green' :
                                   'bg-hub-red'
            }`}
          />
          {offlineMode        ? 'Sistema offline' :
           offlineModeLoading ? 'Connessione...'  :
           hubOk === null     ? 'Connessione...'  :
           hubOk              ? 'Online'          :
                                'Offline'}
        </div>

      </div>
    </header>
  );
}
