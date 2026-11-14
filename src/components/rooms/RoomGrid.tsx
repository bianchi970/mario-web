'use client';

import type { Device, Room } from '@/lib/hub-types';
import RoomCard from './RoomCard';
import { usePreferiti } from '@/hooks/usePreferiti';

export default function RoomGrid({ rooms, deviceCounts = {}, allDevices = [], onChanged, aperta = null }: {
  rooms: Room[];
  deviceCounts?: Record<string, { total: number; online: number }>;
  allDevices?: Device[];
  onChanged?: () => void;
  /** La stanza toccata nella Casa. */
  aperta?: string | null;
}) {
  // Una lettura per la pagina, non una per stanza (proposta 2, 14/11/2026).
  const { preferiti, cambia } = usePreferiti();
  if (rooms.length === 0) {
    return (
      <div className="card text-center py-16 text-hub-muted">
        <p className="text-4xl mb-3">&#127968;</p>
        <p className="text-sm">Nessuna stanza.</p>
        <p className="text-xs mt-1">Creane una qui sopra, poi aggiungici i dispositivi.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} devicesTotal={deviceCounts[room.id]?.total}
          devicesOnline={deviceCounts[room.id]?.online} allDevices={allDevices} onChanged={onChanged}
          aperta={room.id === aperta} preferiti={preferiti} cambiaPreferito={(id) => void cambia(id)} />
      ))}
    </div>
  );
}
