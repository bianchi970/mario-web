'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import Badge, { deviceTypeBadge } from '@/components/ui/Badge';
import StatusDot from '@/components/ui/StatusDot';
import CommandButton from '@/components/devices/CommandButton';
import { getDevice } from '@/lib/api/devices';
import { listRooms } from '@/lib/api/rooms';
import { fetchAPI } from '@/lib/api/client';
import { useProjectId } from '@/hooks/useProjectId';
import type { Device, Room } from '@/lib/hub-types';

const DEVICE_ICONS: Record<string, string> = {
  light: '💡', rgb_light: '🌈', cover: '🪟', blind: '🪟', awning: '⛱',
  thermostat: '🌡', boiler: '🔥', valve: '🔧', plug: '🔌',
  inverter: '☀', battery: '🔋', meter: '📊', ev_charger: '⚡',
  alarm_panel: '🚨', siren: '📣', motion_sensor: '👁', camera: '📷',
  lock: '🔒', sensor: '📡', switch: '🔄',
};

function formatLastSeen(ts: string | null | undefined) {
  if (!ts) return null;
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'adesso';
  if (diff < 3600000) return `${Math.round(diff / 60000)}m fa`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h fa`;
  return new Date(ts).toLocaleDateString('it-IT');
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-white/40 shrink-0">{label}</span>
      <span className="text-sm text-white/80 text-right font-mono break-all">{value}</span>
    </div>
  );
}

export default function DeviceDetailPage() {
  const params    = useParams();
  const router    = useRouter();
  const projectId = useProjectId();
  const deviceId  = typeof params.id === 'string' ? params.id : '';

  const [device,    setDevice]    = useState<Device | null>(null);
  const [rooms,     setRooms]     = useState<Room[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  // Rename
  const [editing,   setEditing]   = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving,    setSaving]    = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Room
  const [savingRoom, setSavingRoom] = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getDevice(deviceId),
      projectId ? listRooms(projectId).catch(() => [] as Room[]) : Promise.resolve([] as Room[]),
    ]).then(([dev, roomList]) => {
      if (cancelled) return;
      setDevice(dev);
      setRooms(roomList);
      if (!dev) setError('Dispositivo non trovato');
      setLoading(false);
    });

    // Polling ogni 3s per lo stato
    const timer = setInterval(() => {
      if (cancelled) return;
      getDevice(deviceId).then((dev) => {
        if (!cancelled && dev) setDevice(dev);
      }).catch(() => {});
    }, 3000);

    return () => { cancelled = true; clearInterval(timer); };
  }, [deviceId, projectId]);

  async function commitRename() {
    const trimmed = nameInput.trim();
    if (!trimmed || !device || trimmed === device.name) { setEditing(false); return; }
    setSaving(true);
    try {
      await fetchAPI(`/api/hub/devices/${encodeURIComponent(device.id)}`, {
        method: 'PATCH',
        body:   JSON.stringify({ name: trimmed, project_id: device.project_id }),
      });
      setDevice((prev) => prev ? { ...prev, name: trimmed } : prev);
    } catch { /* silenzioso */ }
    setSaving(false);
    setEditing(false);
  }

  async function handleRoomChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!device) return;
    const roomId = e.target.value;
    setSavingRoom(true);
    try {
      await fetchAPI(`/api/hub/devices/${encodeURIComponent(device.id)}`, {
        method: 'PATCH',
        body:   JSON.stringify({ room_id: roomId || null, project_id: device.project_id }),
      });
      setDevice((prev) => prev ? { ...prev, room_id: roomId || null } : prev);
    } catch { /* silenzioso */ }
    setSavingRoom(false);
  }

  const room = rooms.find((r) => r.id === device?.room_id);
  const icon = DEVICE_ICONS[device?.type ?? ''] ?? '◈';

  return (
    <>
      <TopBar title="Dispositivo" />
      <main className="flex-1 px-4 py-5 space-y-5 max-w-2xl text-white">

        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70">
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </button>

        {loading && (
          <div className="rounded-[22px] border border-white/10 bg-white/5 p-8 text-center text-white/40 text-sm">
            Caricamento...
          </div>
        )}

        {error && !loading && (
          <div className="rounded-[22px] border border-red-500/25 bg-red-500/10 p-5 text-center">
            <p className="text-sm text-red-300">{error}</p>
            <Link href="/devices" className="mt-3 inline-block text-xs text-white/40 hover:text-white/60">
              ← Torna ai dispositivi
            </Link>
          </div>
        )}

        {device && !loading && (
          <>
            {/* Header */}
            <div className="rounded-[24px] border border-white/12 bg-white/[0.04] p-5 space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-4xl">{icon}</span>
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <input
                      ref={inputRef}
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onBlur={() => void commitRename()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void commitRename();
                        if (e.key === 'Escape') setEditing(false);
                      }}
                      disabled={saving}
                      autoFocus
                      className="w-full bg-white/10 border border-white/30 rounded-lg px-3 py-1.5 text-lg font-semibold text-white focus:outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => { setNameInput(device.name); setEditing(true); }}
                      className="group flex items-center gap-2 text-left"
                    >
                      <h1 className="text-xl font-semibold text-white truncate">{device.name}</h1>
                      <span className="text-white/20 group-hover:text-white/50 text-sm">✏</span>
                    </button>
                  )}
                  <p className="text-xs text-white/30 font-mono mt-0.5 truncate">{device.id}</p>
                </div>
                <StatusDot online={device.online} />
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant={deviceTypeBadge(device.type)}>{device.type}</Badge>
                <Badge variant="gray">{device.protocol}</Badge>
                {device.vendor && <Badge variant="gray">{device.vendor}</Badge>}
                {!device.online && <Badge variant="red">Offline</Badge>}
              </div>

              {/* Comando */}
              <div className="pt-2 border-t border-white/10">
                <CommandButton device={device} />
              </div>
            </div>

            {/* Info */}
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Informazioni</div>
              <Row label="Tipo"      value={device.type} />
              <Row label="Protocollo" value={device.protocol} />
              {device.vendor  && <Row label="Marca"      value={device.vendor} />}
              {device.address && <Row label="Indirizzo"  value={device.address} />}
              <Row label="Stato"      value={device.online ? 'Online ✓' : 'Offline'} />
              {formatLastSeen(device.last_seen ?? device.connectivity?.last_seen) && (
                <Row label="Ultimo aggiornamento" value={formatLastSeen(device.last_seen ?? device.connectivity?.last_seen)!} />
              )}
              {device.connectivity?.signal !== undefined && device.connectivity.signal !== null && (
                <Row label="Segnale" value={`${device.connectivity.signal} dBm`} />
              )}
              <Row label="Creato" value={new Date(device.created_at).toLocaleDateString('it-IT')} />
            </div>

            {/* Stato corrente */}
            {Object.keys(device.state ?? {}).length > 0 && (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Stato corrente</div>
                <div className="space-y-1">
                  {Object.entries(device.state as Record<string, unknown>).map(([k, v]) => (
                    <Row key={k} label={k} value={
                      typeof v === 'boolean' ? (v ? 'sì' : 'no') :
                      v === null ? '—' :
                      String(v)
                    } />
                  ))}
                </div>
              </div>
            )}

            {/* Capability */}
            {device.capabilities.length > 0 && (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                  Funzionalità ({device.capabilities.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {device.capabilities.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-white/60"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stanza */}
            {rooms.length > 0 && (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Stanza</div>
                <select
                  value={device.room_id ?? ''}
                  onChange={handleRoomChange}
                  disabled={savingRoom}
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/40"
                >
                  <option value="">— Nessuna stanza —</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                {room && <p className="mt-1 text-xs text-white/30">Attuale: {room.name}</p>}
              </div>
            )}

            {/* Metadata (solo se presente) */}
            {device.metadata && Object.keys(device.metadata).length > 0 && (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Metadata</div>
                <pre className="text-xs text-white/40 font-mono overflow-auto max-h-40">
                  {JSON.stringify(device.metadata, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}

      </main>
    </>
  );
}
