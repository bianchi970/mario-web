'use client';

import { useEffect, useState, useRef } from 'react';
import type { HubEvent } from '@/lib/hub-types';

const MAX_EVENTS = 50;

/**
 * SSE hook — subscribes to mario-hub event stream via proxy.
 * Returns the latest N events in reverse-chronological order.
 */
export function useEventStream(projectId: string | null) {
  const [events, setEvents] = useState<HubEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const url = `/api/hub/events/stream/${encodeURIComponent(projectId)}`;
    const es  = new EventSource(url);
    esRef.current = es;

    es.addEventListener('ready', () => setConnected(true));

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as HubEvent;
        setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
      } catch {
        // ignore malformed
      }
    };

    // Also listen to typed events
    const TYPES = [
      'device.state.changed', 'device.online', 'device.offline',
      'command.executed', 'command.failed', 'sensor.motion.detected',
      'device.discovered',
    ];
    for (const type of TYPES) {
      es.addEventListener(type, (e: MessageEvent) => {
        try {
          const event = JSON.parse(e.data) as HubEvent;
          setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
        } catch {
          // ignore
        }
      });
    }

    es.onerror = () => setConnected(false);

    return () => {
      es.close();
      setConnected(false);
    };
  }, [projectId]);

  return { events, connected };
}
