'use client';

import { useState, useEffect } from 'react';
import Badge from '@/components/ui/Badge';
import { useProjectId } from '@/hooks/useProjectId';
import { useEventStream } from '@/hooks/useEventStream';
import type { HubEvent } from '@/lib/hub-types';

const EVENT_LABELS: Record<string, string> = {
  'device.online': 'Dispositivo in linea',
  'device.offline': 'Dispositivo fuori linea',
  'device.state_changed': 'Stato aggiornato',
  'device.error': 'Errore dispositivo',
  'automation.executed': 'Automazione eseguita',
  'automation.failed': 'Automazione fallita',
  'motion.detected': 'Movimento rilevato',
  'motion.cleared': 'Movimento cessato',
};

function formatEventType(type: string): string {
  return EVENT_LABELS[type] ?? 'Sconosciuto';
}

function eventColor(type: string) {
  if (type.includes('offline') || type.includes('failed')) return 'red';
  if (type.includes('online') || type.includes('executed')) return 'green';
  if (type.includes('motion') || type.includes('detected')) return 'amber';
  return 'blue';
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function EventRow({ event }: { event: HubEvent }) {
  const label = formatEventType(event.type);
  const timestamp = event.timestamp || '';
  return (
    <div className="flex items-start gap-3 py-2 border-b border-hub-border/50 last:border-0">
      <Badge variant={eventColor(event.type)} className="mt-0.5 shrink-0 font-mono text-[10px]">
        {label}
      </Badge>
      <div className="flex-1 min-w-0">
        {event.device_id && (
          <span className="text-xs text-hub-muted font-mono truncate block">{event.device_id}</span>
        )}
      </div>
      <span className="text-xs text-hub-muted shrink-0 font-mono">{timestamp ? formatTime(timestamp) : '-'}</span>
    </div>
  );
}

export default function EventFeed({
  initialEvents = [],
  initialUnavailable = false,
}: {
  initialEvents?: HubEvent[];
  initialUnavailable?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const rawProjectId = useProjectId();
  const projectId = mounted ? (rawProjectId ?? null) : null;
  const { events: streamEvents, connected } = useEventStream(projectId);

  const all = [...streamEvents];
  for (const event of initialEvents) {
    const key = (event as HubEvent & { event_id?: string }).event_id || (event as HubEvent & { id?: string }).id;
    const alreadyHave = key
      ? all.some((item) => (item as HubEvent & { event_id?: string }).event_id === key || (item as HubEvent & { id?: string }).id === key)
      : false;
    if (!alreadyHave) all.push(event);
  }

  const displayed = all.slice(0, 30);
  const offline = !!projectId && initialUnavailable && !connected && displayed.length === 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-hub-text">Registro eventi</span>
        <span className={`text-xs flex items-center gap-1.5 ${offline ? 'text-hub-red' : connected ? 'text-hub-green' : 'text-hub-muted'}`}>
          <span className={`w-1.5 h-1.5 rounded-full inline-block ${offline ? 'bg-hub-red' : connected ? 'bg-hub-green animate-pulse' : 'bg-hub-muted'}`} />
          {offline ? 'Non raggiungibile' : connected ? 'in diretta' : 'connessione...'}
        </span>
      </div>
      {!projectId ? (
        <div className="py-6 text-center">
          <p className="text-sm text-hub-text">Seleziona un progetto.</p>
          <p className="mt-1 text-xs text-hub-muted">Il registro eventi usa il progetto selezionato.</p>
        </div>
      ) : offline ? (
        <div className="py-6 text-center">
          <div className="mb-3 flex justify-center">
            <Badge variant="red">Non raggiungibile</Badge>
          </div>
          <p className="text-sm text-hub-text">Registro eventi non raggiungibile.</p>
          <p className="mt-1 text-xs text-hub-muted">Hub non disponibile</p>
        </div>
      ) : displayed.length === 0 ? (
        <p className="text-hub-muted text-sm py-6 text-center">Nessun evento registrato</p>
      ) : (
        <div className="max-h-72 overflow-y-auto space-y-0">
          {displayed.map((event, index) => (
            <EventRow key={(event as HubEvent & { event_id?: string }).event_id ?? index} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
