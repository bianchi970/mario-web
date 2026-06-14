'use client';

import { useEffect, useMemo, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import Badge from '@/components/ui/Badge';
import RoomGrid from '@/components/rooms/RoomGrid';
import { useProjectId } from '@/hooks/useProjectId';
import { listRooms, createRoom } from '@/lib/api/rooms';
import { useInstallerMode } from '@/context/InstallerModeContext';
import type { Room } from '@/lib/hub-types';

export default function RoomsPage() {
  const projectId = useProjectId();
  const { installerMode } = useInstallerMode();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [creating, setCreating] = useState(false);

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

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    const name = newRoomName.trim();
    if (!name || !projectId || creating) return;
    setCreating(true);
    try {
      const room = await createRoom(projectId, name);
      setRooms((prev) => [...prev, room]);
      setNewRoomName('');
    } catch {
      // silenzioso — la stanza non è stata creata
    } finally {
      setCreating(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return rooms;
    const q = search.toLowerCase();
    return rooms.filter((r) => r.name.toLowerCase().includes(q));
  }, [rooms, search]);

  return (
    <>
      <TopBar title="Stanze" />
      <main className="flex-1 p-5">
        {!projectId ? (
          <div className="card py-16 text-center text-hub-muted">
            <p className="text-sm text-hub-text">Impianto non configurato.</p>
            <p className="mt-1 text-xs">Configura l&apos;impianto nelle Impostazioni.</p>
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
        ) : rooms.length === 0 && !installerMode ? (
          <div className="card py-16 text-center text-hub-muted">
            <p className="text-sm text-hub-text">Nessuna stanza configurata.</p>
            <p className="mt-1 text-xs">Contatta l&apos;installatore per configurare le stanze.</p>
          </div>
        ) : (
          <>
            {installerMode && (
              <form onSubmit={handleCreateRoom} className="mb-4 flex gap-2">
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Nome nuova stanza..."
                  className="flex-1 rounded-lg border border-hub-border bg-hub-bg px-3 py-2 text-sm text-hub-text placeholder:text-hub-muted focus:outline-none focus:ring-1 focus:ring-hub-accent"
                />
                <button
                  type="submit"
                  disabled={!newRoomName.trim() || creating}
                  className="rounded-lg bg-hub-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {creating ? '...' : 'Aggiungi'}
                </button>
              </form>
            )}
            <div className="mb-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca stanza..."
                className="w-full rounded-lg border border-hub-border bg-hub-bg px-3 py-2 text-sm text-hub-text placeholder:text-hub-muted focus:outline-none focus:ring-1 focus:ring-hub-accent"
              />
            </div>
            <RoomGrid rooms={filtered} />
          </>
        )}
      </main>
    </>
  );
}
