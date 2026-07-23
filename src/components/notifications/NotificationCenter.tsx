'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, BellOff, X } from 'lucide-react';
import { listNotifications, dismissNotification } from '@/lib/api/notifications';
import type { HubNotification } from '@/lib/api/notifications';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function severityStyle(severity: HubNotification['severity']) {
  switch (severity) {
    case 'critical':
      return 'border-red-500/30 bg-red-500/10 text-red-100';
    case 'warning':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
    default:
      return 'border-white/10 bg-white/5 text-white/80';
  }
}

function severityIcon(severity: HubNotification['severity']) {
  const cls =
    severity === 'critical' ? 'text-red-400' :
    severity === 'warning'  ? 'text-amber-400' : 'text-white/40';
  return <AlertTriangle className={`h-4 w-4 shrink-0 ${cls}`} />;
}

function formatTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/* ─── NotificationCenter ─────────────────────────────────────────────────── */

export default function NotificationCenter({
  projectId,
  audience,
  refreshIntervalMs = 30_000,
}: {
  projectId: string;
  audience?: 'client' | 'installer';
  refreshIntervalMs?: number;
}) {
  const [items, setItems] = useState<HubNotification[]>([]);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const data = await listNotifications(projectId, audience, signal);
        if (!signal?.aborted) setItems(data);
      } catch {
        // silent — hub potrebbe non rispondere
      }
    },
    [projectId, audience],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const timer = setInterval(() => void load(controller.signal), refreshIntervalMs);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [load, refreshIntervalMs]);

  async function handleDismiss(id: string) {
    setDismissing((prev) => new Set(prev).add(id));
    try {
      await dismissNotification(projectId, id);
      setItems((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // silent
    } finally {
      setDismissing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="px-1 text-xs font-semibold uppercase tracking-[0.15em] text-white/40">
        Notifiche
      </div>
      {items.map((n) => (
        <div
          key={n.id}
          className={`flex items-start gap-3 rounded-[20px] border px-4 py-3 ${severityStyle(n.severity)}`}
        >
          {severityIcon(n.severity)}
          <div className="min-w-0 flex-1">
            <div className="font-medium leading-snug">{n.title}</div>
            <div className="mt-0.5 text-sm opacity-80">{n.message}</div>
            {n.created_at && (
              <div className="mt-1 text-xs opacity-50">{formatTime(n.created_at)}</div>
            )}
          </div>
          <button
            onClick={() => void handleDismiss(n.id)}
            disabled={dismissing.has(n.id)}
            className="mt-0.5 shrink-0 rounded-full p-1 opacity-50 transition active:opacity-100 disabled:opacity-20"
            aria-label="Chiudi notifica"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ─── Empty state (utility) ─────────────────────────────────────────────── */

export function NotificationsBell({
  count,
}: {
  count: number;
}) {
  if (count === 0) return <BellOff className="h-5 w-5 text-white/30" />;
  return (
    <div className="relative">
      <div className="h-5 w-5 text-white/70">🔔</div>
      <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
        {count > 9 ? '9+' : count}
      </span>
    </div>
  );
}
