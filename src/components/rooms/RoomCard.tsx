'use client';

import { useState } from 'react';
import type { Room, Device } from '@/lib/hub-types';
import Badge from '@/components/ui/Badge';
import StatusDot from '@/components/ui/StatusDot';

const ROOM_ICONS: Record<string, string> = {
  living: '🛋', kitchen: '🍳', bedroom: '🛏', bathroom: '🚿',
  office: '💼', garage: '🚗', garden: '🌿', corridor: '🚪',
  laundry: '🫧', cellar: '🪣', attic: '🏠',
};

interface Props {
  room: Room;
  projectId: string;
}

export default function RoomCard({ room, projectId }: Props) {
  const [open, setOpen]       = useState(false);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [loading, setLoading] = useState(false);

  const icon = room.icon ? (ROOM_ICONS[room.icon] ?? room.icon) : '⬜';

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    if (!devices) {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/hub/rooms/${encodeURIComponent(projectId)}/${encodeURIComponent(room.id)}/devices`
        );
        const json = await res.json() as { devices: Device[] };
        setDevices(json.devices ?? []);
      } catch {
        setDevices([]);
      } finally {
        setLoading(false);
      }
    }
    setOpen(true);
  }

  return (
    <div className="card cursor-pointer select-none" onClick={toggle}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-3xl leading-none">{icon}</span>
          <div>
            <p className="font-medium text-hub-text">{room.name}</p>
            {room.floor && <p className="text-xs text-hub-muted">Floor {room.floor}</p>}
          </div>
        </div>
        <span className={`text-hub-muted text-sm transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t border-hub-border/50 space-y-2" onClick={(e) => e.stopPropagation()}>
          {loading ? (
            <p className="text-xs text-hub-muted text-center py-3">Loading…</p>
          ) : !devices || devices.length === 0 ? (
            <p className="text-xs text-hub-muted text-center py-3">No devices assigned</p>
          ) : (
            devices.map((d) => (
              <div key={d.id} className="flex items-center gap-2 text-xs p-1.5 rounded-lg bg-hub-bg">
                <StatusDot online={d.online} pulse={false} />
                <span className="flex-1 text-hub-text truncate">{d.name}</span>
                {!d.online && <Badge variant="red" className="shrink-0">Offline</Badge>}
                <Badge variant="gray" className="shrink-0">{d.protocol}</Badge>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
