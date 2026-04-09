import TopBar from '@/components/layout/TopBar';
import Badge from '@/components/ui/Badge';
import RoomGrid from '@/components/rooms/RoomGrid';
import { getRooms, getDefaultProjectId } from '@/lib/hub-client';
import type { Room } from '@/lib/hub-types';

export const dynamic = 'force-dynamic';

export default async function RoomsPage() {
  const projectId = getDefaultProjectId();
  let rooms: Room[] = [];
  let hubOffline = false;

  try {
    const res = await getRooms(projectId);
    rooms = res.rooms;
  } catch {
    hubOffline = true;
  }

  return (
    <>
      <TopBar title="Rooms" />
      <main className="flex-1 p-5">
        {hubOffline ? (
          <div className="card py-16 text-center text-hub-muted">
            <div className="mb-3 flex justify-center">
              <Badge variant="red">Offline</Badge>
            </div>
            <p className="text-sm text-hub-text">Hub not reachable.</p>
            <p className="mt-1 text-xs">Offline</p>
          </div>
        ) : (
          <RoomGrid rooms={rooms} projectId={projectId} />
        )}
      </main>
    </>
  );
}
