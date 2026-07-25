'use client';

import type { Room } from '@/lib/hub-types';
import RoomCard from './RoomCard';

export default function RoomGrid({ rooms, deviceCounts = {} }: { rooms: Room[]; deviceCounts?: Record<string, { total: number; online: number }> }) {
  if (rooms.length === 0) {
    return (
      <div className="card text-center py-16 text-hub-muted">
        <p className="text-4xl mb-3">&#127968;</p>
        <p className="text-sm">Nessuna zona configurata.</p>
        <p className="text-xs mt-1">Crea zone dall&apos;Hub API o assegna dispositivi alle zone.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} devicesTotal={deviceCounts[room.id]?.total} devicesOnline={deviceCounts[room.id]?.online} />
      ))}
    </div>
  );
}
