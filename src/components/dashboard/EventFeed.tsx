'use client';

import { useEventStream } from '@/hooks/useEventStream';
import type { HubEvent } from '@/lib/hub-types';
import Badge from '@/components/ui/Badge';

function eventColor(type: string) {
  if (type.includes('offline') || type.includes('failed')) return 'red';
  if (type.includes('online') || type.includes('executed')) return 'green';
  if (type.includes('motion') || type.includes('detected')) return 'amber';
  return 'blue';
}

function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function EventRow({ event }: { event: HubEvent }) {
  const label = event.type.replace(/\./g, ' ');
  const ts = event.timestamp || '';
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
      <span className="text-xs text-hub-muted shrink-0 font-mono">{ts ? formatTime(ts) : '-'}</span>
    </div>
  );
}

interface EventFeedProps {
  projectId: string;
  initialEvents?: HubEvent[];
  initialUnavailable?: boolean;
}

export default function EventFeed({
  projectId,
  initialEvents = [],
  initialUnavailable = false,
}: EventFeedProps) {
  const { events: streamEvents, connected } = useEventStream(projectId);

  const all = [...streamEvents];
  for (const e of initialEvents) {
    const key = (e as HubEvent & { event_id?: string }).event_id || (e as HubEvent & { id?: string }).id;
    const alreadyHave = key
      ? all.some((x) => (x as HubEvent & { event_id?: string }).event_id === key || (x as HubEvent & { id?: string }).id === key)
      : false;
    if (!alreadyHave) all.push(e);
  }
  const displayed = all.slice(0, 30);
  const offline = initialUnavailable && !connected && displayed.length === 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-hub-text">Event Feed</span>
        <span className={`text-xs flex items-center gap-1.5 ${offline ? 'text-hub-red' : connected ? 'text-hub-green' : 'text-hub-muted'}`}>
          <span className={`w-1.5 h-1.5 rounded-full inline-block ${offline ? 'bg-hub-red' : connected ? 'bg-hub-green animate-pulse' : 'bg-hub-muted'}`} />
          {offline ? 'Offline' : connected ? 'live' : 'connecting...'}
        </span>
      </div>
      {offline ? (
        <div className="py-6 text-center">
          <div className="mb-3 flex justify-center">
            <Badge variant="red">Offline</Badge>
          </div>
          <p className="text-sm text-hub-text">Event feed not reachable.</p>
          <p className="mt-1 text-xs text-hub-muted">Offline</p>
        </div>
      ) : displayed.length === 0 ? (
        <p className="text-hub-muted text-sm py-6 text-center">No events yet</p>
      ) : (
        <div className="max-h-72 overflow-y-auto space-y-0">
          {displayed.map((e, i) => (
            <EventRow key={(e as HubEvent & { event_id?: string }).event_id ?? i} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}
