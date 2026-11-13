'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Device, Room } from '@/lib/hub-types';
import Badge from '@/components/ui/Badge';
import StatusDot from '@/components/ui/StatusDot';
import CommandButton from '@/components/devices/CommandButton';
import { useProjectId } from '@/hooks/useProjectId';

const ROOM_ICONS: Record<string, string> = {
  living: '\u{1F6CB}', kitchen: '\u{1F373}', bedroom: '\u{1F6CF}', bathroom: '\u{1F6BF}',
  office: '\u{1F4BC}', garage: '\u{1F697}', garden: '\u{1F33F}', corridor: '\u{1F6AA}',
  laundry: '\u{1FAE7}', cellar: '\u{1FAA3}', attic: '\u{1F3E0}',
};

// La stanza si gestisce da dove la si guarda (13/11/2026): dal telefono Romeo non
// poteva eliminarla, rinominarla né metterci altri dispositivi, e dopo
// l'associazione un dispositivo non si raggiungeva più. I permessi li decide
// l'Hub (amministratore, installatore): qui si dice il suo «no», non si nasconde.
type Props = {
  room: Room;
  devicesTotal?: number;
  devicesOnline?: number;
  /** Tutti i dispositivi della casa: da qui si sceglie chi aggiungere. */
  allDevices?: Device[];
  /** Qualcosa è cambiato (stanza, nome, dispositivi): la pagina ricarica. */
  onChanged?: () => void;
  /** Scelta toccandola nella Casa (`/rooms?stanza=<id>`): si apre da sola. */
  aperta?: boolean;
};

export default function RoomCard({ room, devicesTotal, devicesOnline, allDevices = [], onChanged, aperta = false }: Props) {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(room.name);
  const [error, setError] = useState<string | null>(null);
  const projectId = useProjectId();

  const icon = room.icon ? (ROOM_ICONS[room.icon] ?? room.icon) : '\u{1F3E0}';
  const base = projectId ? `/api/hub/rooms/${encodeURIComponent(projectId)}/${encodeURIComponent(room.id)}` : null;

  async function loadDevices() {
    if (!base) { setDevices([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${base}/devices`);
      const json = await res.json() as { devices: Device[] };
      setDevices(json.devices ?? []);
    } catch {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    if (!devices) await loadDevices();
    setOpen(true);
  }

  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aperta) return;
    void toggle();
    card.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una volta, all'arrivo
  }, [aperta]);

  /** Una chiamata all'Hub; il suo «no» diventa una frase. */
  async function hub(url: string, method: string, body?: unknown): Promise<boolean> {
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      });
      if (res.ok) return true;
      setError(res.status === 401 || res.status === 403
        ? 'Solo l\'amministratore o l\'installatore può farlo.'
        : 'Non ci sono riuscito: l\'Hub ha detto di no.');
    } catch {
      setError('Non ci sono riuscito: l\'Hub non risponde.');
    }
    return false;
  }

  async function addDevice(deviceId: string) {
    if (!base || !deviceId) return;
    if (await hub(`${base}/devices/${encodeURIComponent(deviceId)}`, 'POST')) {
      await loadDevices();
      onChanged?.();
    }
  }

  async function removeDevice(deviceId: string) {
    if (!base) return;
    if (await hub(`${base}/devices/${encodeURIComponent(deviceId)}`, 'DELETE')) {
      await loadDevices();
      onChanged?.();
    }
  }

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!base || !name) return;
    if (await hub(base, 'PATCH', { name })) {
      setRenaming(false);
      onChanged?.();
    }
  }

  async function remove() {
    if (!base) return;
    const n = devices?.length ?? devicesTotal ?? 0;
    const cosa = n > 0 ? ` I ${n} dispositivi restano, senza stanza.` : '';
    if (!window.confirm(`Eliminare la stanza «${room.name}»?${cosa}`)) return;
    if (await hub(base, 'DELETE')) onChanged?.();
  }

  const qui = new Set((devices ?? []).map((d) => d.id));
  const daAggiungere = allDevices.filter((d) => !qui.has(d.id) && d.room_id !== room.id);

  return (
    <div ref={card} className="card cursor-pointer select-none scroll-mt-4" onClick={toggle}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-3xl leading-none">{icon}</span>
          <div>
            <p className="font-medium text-hub-text">{room.name}</p>
            {room.floor && <p className="text-xs text-hub-muted">Piano {room.floor}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {devicesTotal !== undefined && devicesTotal > 0 && (
            <span className={`text-xs font-medium tabular-nums ${devicesOnline === devicesTotal ? 'text-hub-green' : devicesOnline === 0 ? 'text-hub-red' : 'text-hub-amber'}`}>
              {devicesOnline ?? 0}/{devicesTotal}
            </span>
          )}
          <span className={`text-hub-muted text-sm transition-transform ${open ? 'rotate-180' : ''}`}>&#9662;</span>
        </div>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t border-hub-border/50 space-y-2 cursor-default" onClick={(event) => event.stopPropagation()}>
          {loading ? (
            <p className="text-xs text-hub-muted text-center py-3">Caricamento...</p>
          ) : !devices || devices.length === 0 ? (
            <p className="text-xs text-hub-muted text-center py-3">Nessun dispositivo assegnato</p>
          ) : (
            devices.map((device) => (
              <div key={device.id} className="rounded-lg bg-hub-bg p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <StatusDot online={device.online} pulse={false} />
                  <Link href={`/devices/${encodeURIComponent(device.id)}`}
                    className="flex-1 text-sm text-hub-text truncate font-medium underline-offset-2 hover:underline">
                    {device.name}
                  </Link>
                  {!device.online && <Badge variant="red" className="shrink-0 text-xs">Offline</Badge>}
                  <button type="button" aria-label={`Togli ${device.name} dalla stanza`}
                    onClick={() => void removeDevice(device.id)}
                    className="shrink-0 rounded-md border border-hub-border px-2 py-0.5 text-xs text-hub-muted">
                    Togli
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="gray" className="shrink-0 text-xs">{device.protocol}</Badge>
                  <CommandButton device={device} />
                </div>
              </div>
            ))
          )}

          {daAggiungere.length > 0 && (
            <select
              aria-label="Aggiungi dispositivo"
              value=""
              onChange={(e) => void addDevice(e.target.value)}
              className="w-full rounded-lg border border-hub-border bg-hub-bg px-3 py-2 text-sm text-hub-text"
            >
              <option value="">+ Aggiungi dispositivo…</option>
              {daAggiungere.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}

          {renaming ? (
            <form onSubmit={rename} className="flex gap-2">
              <input
                aria-label="Nuovo nome della stanza"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 rounded-lg border border-hub-border bg-hub-bg px-3 py-2 text-sm text-hub-text"
              />
              <button type="submit" disabled={!newName.trim()} className="rounded-lg bg-hub-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Salva</button>
              <button type="button" onClick={() => { setRenaming(false); setNewName(room.name); }} className="rounded-lg border border-hub-border px-3 py-2 text-sm text-hub-text">Annulla</button>
            </form>
          ) : (
            <div className="flex gap-2">
              <button type="button" onClick={() => setRenaming(true)} className="flex-1 rounded-lg border border-hub-border px-3 py-2 text-sm text-hub-text">Rinomina</button>
              <button type="button" onClick={() => void remove()} className="flex-1 rounded-lg border border-hub-red/40 px-3 py-2 text-sm text-hub-red">Elimina</button>
            </div>
          )}

          {error && <p className="text-xs text-hub-red">{error}</p>}
        </div>
      )}
    </div>
  );
}
