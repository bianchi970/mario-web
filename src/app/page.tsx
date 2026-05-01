'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopBar from '@/components/layout/TopBar';
import StatsRow from '@/components/dashboard/StatsRow';
import EventFeed from '@/components/dashboard/EventFeed';
import Badge from '@/components/ui/Badge';
import { useProjectId } from '@/hooks/useProjectId';
import { useProject } from '@/context/ProjectContext';
import { ApiClientError, fetchAPI } from '@/lib/api/client';
import { listDevices } from '@/lib/api/devices';
import { listRooms } from '@/lib/api/rooms';
import type { Device, Room, SystemInfo } from '@/lib/hub-types';

type SystemPayload = { success?: boolean; data?: SystemInfo } | SystemInfo;

function unwrapSystem(payload: SystemPayload): SystemInfo {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: SystemInfo }).data;
  }
  return payload as SystemInfo;
}

export default function DashboardPage() {
  const projectId = useProjectId();
  const { setProjectId } = useProject();
  const [searchInput, setSearchInput] = useState('');
  const [mounted, setMounted] = useState(false);
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!projectId) {
      setSystem(null);
      setDevices(null);
      setRooms(null);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadDashboard() {
      setLoading(true);
      setError(null);
      try {
        const [systemPayload, deviceItems, roomItems] = await Promise.all([
          fetchAPI<SystemPayload>('/api/hub/system', { signal: controller.signal }),
          listDevices(projectId!, controller.signal),
          listRooms(projectId!, controller.signal),
        ]);

        setSystem(unwrapSystem(systemPayload));
        setDevices(deviceItems);
        setRooms(roomItems);
      } catch (err) {
        if (controller.signal.aborted) return;
        setSystem(null);
        setDevices(null);
        setRooms(null);
        if (err instanceof ApiClientError && (err.status === 500 || err.status === 502)) {
          setError('Hub non disponibile');
        } else {
          setError('Errore caricamento dashboard');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => controller.abort();
  }, [projectId]);

  const onlineCount = devices?.filter((device) => device.online).length ?? null;
  const hubOffline = error === 'Hub non disponibile';
  const effectiveProjectId = mounted ? projectId : undefined;

  return (
    <>
      <TopBar title="Dashboard" />
      <main className="flex-1 p-5 space-y-6">
        {!effectiveProjectId ? (
          <div className="card">
            <p className="text-sm text-hub-text">Seleziona un progetto.</p>
            <p className="mt-1 text-xs text-hub-muted">Inserisci il nome del progetto per caricare dispositivi e stanze.</p>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && searchInput.trim()) setProjectId(searchInput.trim()); }}
                placeholder="Nome progetto..."
                className="flex-1 rounded-lg border border-hub-border bg-hub-bg px-3 py-2 text-sm text-hub-text placeholder:text-hub-muted focus:outline-none focus:ring-1 focus:ring-hub-accent"
              />
              <button
                onClick={() => { if (searchInput.trim()) setProjectId(searchInput.trim()); }}
                className="rounded-lg border border-hub-border px-4 py-2 text-sm text-hub-text hover:bg-hub-border/30 transition-colors"
              >
                Cerca
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="card">
            <p className="text-sm text-hub-text">Caricamento inventario...</p>
          </div>
        ) : error ? (
          <div className="card">
            <div className="mb-3 flex justify-start">
              <Badge variant="red">Offline</Badge>
            </div>
            <p className="text-sm text-hub-text">{error}</p>
          </div>
        ) : null}

        <StatsRow
          totalDevices={devices?.length ?? null}
          onlineDevices={onlineCount}
          totalRooms={rooms?.length ?? null}
          activeAdapters={system?.active_adapters ?? null}
          uptime={system?.uptime_s}
        />

        {system && (
          <div className="card">
            <h2 className="text-sm font-medium text-hub-text mb-3">Hub System</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { k: 'Hostname', v: system.hostname },
                { k: 'Platform', v: `${system.platform} / ${system.arch}` },
                { k: 'Memory', v: `${system.memory_mb} MB` },
                { k: 'Project', v: projectId ?? '-' },
              ].map(({ k, v }) => (
                <div key={k}>
                  <span className="text-hub-muted block">{k}</span>
                  <span className="text-hub-text font-mono">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {devices && devices.length > 0 && (
          <div className="card">
            <h2 className="text-sm font-medium text-hub-text mb-3">
              Dispositivi <span className="text-hub-muted text-xs">({devices.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {devices.slice(0, 9).map((device) => (
                <div key={device.id} className="flex items-center gap-2 p-2 rounded-lg bg-hub-bg border border-hub-border/50 text-xs">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${device.online ? 'bg-hub-green' : 'bg-hub-red'}`} />
                  <span className="flex-1 truncate text-hub-text">{device.name}</span>
                  {!device.online && <Badge variant="red">Offline</Badge>}
                  <span className="text-hub-muted font-mono">{device.protocol}</span>
                </div>
              ))}
              {devices.length > 9 && (
                <div className="flex items-center justify-center p-2 rounded-lg border border-hub-border/50 border-dashed text-hub-muted text-xs">
                  +{devices.length - 9} altri
                </div>
              )}
            </div>
          </div>
        )}

        {projectId && !loading && !error && devices && devices.length === 0 && (
          <div className="card">
            <p className="text-sm text-hub-text">Nessun dispositivo trovato.</p>
          </div>
        )}

        <div className="card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-hub-text mb-1">Scenari</h2>
              <p className="text-xs text-hub-muted">Gestisci scenari e audit dal path operativo dedicato.</p>
            </div>
            <Link href="/scenarios" className="rounded-lg border border-hub-border px-4 py-2 text-sm text-hub-text">
              Scenari
            </Link>
          </div>
        </div>

        <EventFeed initialEvents={[]} initialUnavailable={hubOffline} />
      </main>
    </>
  );
}
