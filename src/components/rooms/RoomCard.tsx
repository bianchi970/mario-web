'use client';

import { useState } from 'react';
import type { Device, Room } from '@/lib/hub-types';
import Badge from '@/components/ui/Badge';
import StatusDot from '@/components/ui/StatusDot';
import { useProjectId } from '@/hooks/useProjectId';

const ROOM_ICONS: Record<string, string> = {
  living: 'ðŸ›‹', kitchen: 'ðŸ³', bedroom: 'ðŸ›', bathroom: 'ðŸš¿',
  office: 'ðŸ’¼', garage: 'ðŸš—', garden: 'ðŸŒ¿', corridor: 'ðŸšª',
  laundry: 'ðŸ«§', cellar: 'ðŸª£', attic: 'ðŸ ',
};

export default function RoomCard({ room }: { room: Room }) {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [loading, setLoading] = useState(false);
  const projectId = useProjectId();

  const icon = room.icon ? (ROOM_ICONS[room.icon] ?? room.icon) : 'â¬œ';

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }

    if (!devices) {
      if (!projectId) {
        setDevices([]);
        setOpen(true);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(
          `/api/hub/rooms/${encodeURIComponent(projectId)}/${encodeURIComponent(room.id)}/devices`,
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
            {room.floor && <p className="text-xs text-hub-muted">Piano {room.floor}</p>}
          </div>
        </div>
        <span className={`text-hub-muted text-sm transition-transform ${open ? 'rotate-180' : ''}`}>â–¾</span>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t border-hub-border/50 space-y-2" onClick={(event) => event.stopPropagation()}>
          {loading ? (
            <p className="text-xs text-hub-muted text-center py-3">Caricamento...</p>
          ) : !devices || devices.length === 0 ? (
            <p className="text-xs text-hub-muted text-center py-3">Nessun dispositivo assegnato</p>
          ) : (
            devices.map((device) => (
              <div key={device.id} className="flex items-center gap-2 text-xs p-1.5 rounded-lg bg-hub-bg">
                <StatusDot online={device.online} pulse={false} />
                <span className="flex-1 text-hub-text truncate">{device.name}</span>
                {!device.online && <Badge variant="red" className="shrink-0">Non in linea</Badge>}
                <Badge variant="gray" className="shrink-0">{device.protocol}</Badge>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
