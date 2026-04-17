'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import Badge from '@/components/ui/Badge';
import RoomGrid from '@/components/rooms/RoomGrid';
import { useProjectId } from '@/hooks/useProjectId';
import { listRooms } from '@/lib/api/rooms';
import type { Room } from '@/lib/hub-types';

export default function RoomsPage() {
  const projectId = useProjectId();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setRooms([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadRooms() {
      setLoading(true);
      setError(null);
      try {
        const items = await listRooms(projectId!);
        if (cancelled) return;
        setRooms(items);
      } catch (err) {
        if (cancelled) return;
        setRooms([]);
        if (err instanceof Error && err.message === 'HUB_UNAVAILABLE') {
          setError('Hub non disponibile');
        } else {
          setError('Errore caricamento stanze');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRooms();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <>
      <TopBar title="Stanze" />
      <main className="flex-1 p-5">
        {!projectId ? (
          <div className="card py-16 text-center text-hub-muted">
            <p className="text-sm text-hub-text">Seleziona un progetto.</p>
            <p className="mt-1 text-xs">Imposta il Project ID nelle Impostazioni.</p>
          </div>
        ) : loading ? (
          <div className="card py-16 text-center text-hub-muted">
            <p className="text-sm text-hub-text">Caricamento stanze...</p>
          </div>
        ) : error ? (
          <div className="card py-16 text-center text-hub-muted">
            <div className="mb-3 flex justify-center">
              <Badge variant="red">Offline</Badge>
            </div>
            <p className="text-sm text-hub-text">{error}</p>
          </div>
        ) : (
          <RoomGrid rooms={rooms} />
        )}
      </main>
    </>
  );
}
