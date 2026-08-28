'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import Image from 'next/image';
import { useOfflineMode } from '@/components/layout/OfflineModeProvider';
import { useProjectId } from '@/hooks/useProjectId';
import { listNotifications, dismissNotification, dismissAllNotifications, type HubNotification } from '@/lib/api/notifications';
import HouseStatusBar from '@/components/dashboard/HouseStatusBar';
import EmergencyButton from '@/components/emergency/EmergencyButton';

// ── Severity helpers ──────────────────────────────────────────────────────────

function severityDot(severity: HubNotification['severity']) {
  if (severity === 'critical') return 'bg-danger';
  if (severity === 'warning')  return 'bg-warning';
  return 'bg-text-2';
}

function severityRow(severity: HubNotification['severity']) {
  if (severity === 'critical') return 'border-danger/30 bg-danger/5';
  if (severity === 'warning')  return 'border-warning/30 bg-warning/5';
  return 'border-border bg-surface';
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
  const { offlineMode } = useOfflineMode();
  const projectId = useProjectId();

  const [notifications, setNotifications] = useState<HubNotification[]>([]);
  const [bellOpen,      setBellOpen]      = useState(false);
  const [dismissing,    setDismissing]    = useState<Set<string>>(new Set());
  const bellRef = useRef<HTMLDivElement>(null);

  // ── Notifications: SSE con fallback a polling ──────────────────────────────
  const loadNotifications = useCallback(async () => {
    if (!projectId || offlineMode) return;
    try {
      const data = await listNotifications(projectId, 'client');
      setNotifications(data);
    } catch { /* silent */ }
  }, [projectId, offlineMode]);

  useEffect(() => {
    if (!projectId || offlineMode) return;

    // Carica subito
    void loadNotifications();

    // SSE: riceve notifiche in tempo reale senza polling
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let sseOk = false;

    try {
      es = new EventSource(`/api/hub/notifications/${projectId}/stream`);

      es.onmessage = (e) => {
        sseOk = true;
        try {
          const msg = JSON.parse(e.data) as { type: string; notifications?: HubNotification[]; data?: HubNotification };
          if (msg.type === 'init' && Array.isArray(msg.notifications)) {
            setNotifications(msg.notifications.filter(n => n.audience === 'client' || n.audience === 'both'));
          } else if (msg.type === 'notification' && msg.data) {
            const n = msg.data;
            if (n.audience === 'client' || n.audience === 'both') {
              setNotifications(prev => [n, ...prev.filter(x => x.id !== n.id)]);
            }
          }
        } catch { /* malformed */ }
      };

      // Fallback a polling se SSE non si connette entro 8s
      const sseTimeout = setTimeout(() => {
        if (!sseOk) {
          pollTimer = setInterval(() => void loadNotifications(), 30_000);
        }
      }, 8_000);

      es.onerror = () => {
        clearTimeout(sseTimeout);
        if (!sseOk && !pollTimer) {
          pollTimer = setInterval(() => void loadNotifications(), 30_000);
        }
      };

      return () => {
        clearTimeout(sseTimeout);
        es?.close();
        if (pollTimer) clearInterval(pollTimer);
      };
    } catch {
      // EventSource non disponibile (SSR/test) → solo polling
      pollTimer = setInterval(() => void loadNotifications(), 30_000);
      return () => { if (pollTimer) clearInterval(pollTimer); };
    }
  }, [projectId, offlineMode, loadNotifications]);

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

  async function handleDismissAll() {
    if (!projectId || notifications.length === 0) return;
    try {
      await dismissAllNotifications(projectId);
      setNotifications([]);
      setBellOpen(false);
    } catch { /* silent */ }
  }

    const count = notifications.length;

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface md:bg-transparent">
      {/* Logo + titolo + SOS — solo mobile */}
      <div className="flex items-center gap-2.5 md:hidden">
        <div className="bg-white rounded-lg px-1.5 py-0.5 flex-shrink-0">
          <Image src="/logo-mario.png?v=2" alt="HomeMARIO" width={80} height={80} className="h-7 w-auto" priority />
        </div>
        <h1 className="font-semibold text-text">{title}</h1>
        <EmergencyButton />
      </div>
      <h1 className="hidden md:block font-semibold text-text">{title}</h1>

      <div className="flex items-center gap-3">

        {/* ── House Status ──────────────────────────────────────────── */}
        <HouseStatusBar />

        {/* ── Bell ─────────────────────────────────────────────────── */}
        {projectId && (
          <div ref={bellRef} className="relative">
            <button
              type="button"
              onClick={() => setBellOpen((prev) => !prev)}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-text-2 hover:text-text hover:bg-surface-2 transition-colors"
              aria-label="Notifiche"
            >
              <Bell size={16} strokeWidth={1.8} />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white leading-none">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {bellOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-border bg-surface shadow-xl">
                <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-text-2">
                    Notifiche {count > 0 && `(${count})`}
                  </span>
                  {count > 0 && (
                    <button
                      type="button"
                      onClick={() => void handleDismissAll()}
                      className="text-[10px] text-text-2 hover:text-danger transition-colors"
                    >
                      Cancella tutte
                    </button>
                  )}
                </div>

                {count === 0 ? (
                  <p className="px-4 py-5 text-sm text-text-2 text-center">Nessuna notifica</p>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-border">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 border-l-2 ${severityRow(n.severity)}`}
                      >
                        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${severityDot(n.severity)}`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-text leading-snug">{n.title}</div>
                          <div className="text-xs text-text-2 mt-0.5 leading-snug">{n.message}</div>
                          {n.created_at && (
                            <div className="text-[10px] text-text-2 opacity-60 mt-1">{formatTime(n.created_at)}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDismiss(n.id)}
                          disabled={dismissing.has(n.id)}
                          className="mt-0.5 shrink-0 rounded p-0.5 text-text-2 hover:text-text disabled:opacity-30 transition-colors"
                          aria-label="Chiudi"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </header>
  );
}
