'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import Badge from '@/components/ui/Badge';
import DeviceList from '@/components/devices/DeviceList';
import { useProjectId } from '@/hooks/useProjectId';
import { listDevices } from '@/lib/api/devices';
import { listRooms } from '@/lib/api/rooms';
import type { Device, Room } from '@/lib/hub-types';

export default function DevicesPage() {
  const projectId = useProjectId();
  const [devices, setDevices] = useState<Device[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setDevices([]);
      setRooms([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadDevices() {
      setLoading(true);
      setError(null);
      try {
        const [items, roomItems] = await Promise.all([
          listDevices(projectId!),
          listRooms(projectId!).catch(() => [] as Room[]),
        ]);
        if (cancelled) return;
        setDevices(items);
        setRooms(roomItems);
      } catch (err) {
        if (cancelled) return;
        setDevices([]);
        if (err instanceof Error && err.message === 'HUB_UNAVAILABLE') {
          setError('Hub non disponibile');
        } else {
          setError('Errore caricamento dispositivi');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDevices();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <>
      <TopBar title="Dispositivi" />
      <main className="flex-1 p-5">
        {!projectId ? (
          <div className="card py-16 text-center text-hub-muted">
            <p className="text-sm text-hub-text">Seleziona un progetto.</p>
            <p className="mt-1 text-xs">Imposta il Project ID nelle Impostazioni.</p>
          </div>
        ) : loading ? (
          <div className="card py-16 text-center text-hub-muted">
            <p className="text-sm text-hub-text">Caricamento dispositivi...</p>
          </div>
        ) : error ? (
          <div className="card py-16 text-center text-hub-muted">
            <div className="mb-3 flex justify-center">
              <Badge variant="red">Offline</Badge>
            </div>
            <p className="text-sm text-hub-text">{error}</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="card text-center py-16 text-hub-muted">
            <p className="text-4xl mb-3">◈</p>
            <p className="text-sm text-hub-text">Nessun dispositivo trovato.</p>
            <p className="text-xs mt-1">L&apos;inventory del progetto selezionato è vuoto.</p>
          </div>
        ) : (
          <DeviceList devices={devices} rooms={rooms} />
        )}
      </main>
    </>
  );
}
