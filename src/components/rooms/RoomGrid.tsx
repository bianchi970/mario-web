'use client';

import type { Room } from '@/lib/hub-types';
import RoomCard from './RoomCard';

interface Props {
  rooms: Room[];
  projectId: string;
}

export default function RoomGrid({ rooms, projectId }: Props) {
  if (rooms.length === 0) {
    return (
      <div className="card text-center py-16 text-hub-muted">
        <p className="text-4xl mb-3">⬜</p>
        <p className="text-sm">No rooms configured.</p>
        <p className="text-xs mt-1">Create rooms from the Hub API or assign devices to rooms.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} projectId={projectId} />
      ))}
    </div>
  );
}
