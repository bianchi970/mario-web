'use client';

import { useState, useRef } from 'react';
import type { Device, Room } from '@/lib/hub-types';
import Badge, { deviceTypeBadge } from '@/components/ui/Badge';
import StatusDot from '@/components/ui/StatusDot';
import CommandButton from './CommandButton';
import { fetchAPI } from '@/lib/api/client';
import { useInstallerMode } from '@/context/InstallerModeContext';

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
  return `${Math.round(diff / 3600000)}h fa`;
}

const SENSOR_TYPES = new Set(['sensor', 'motion_sensor', 'contact_sensor', 'temperature_sensor', 'humidity_sensor', 'co2_sensor']);

function SensorState({ state }: { state: Record<string, unknown> }) {
  const rows: { label: string; value: string; highlight?: boolean }[] = [];

  if ('motion' in state) {
    rows.push({ label: 'Movimento', value: state.motion ? 'rilevato' : 'assente', highlight: !!state.motion });
  }
  if ('last_motion_at' in state && state.last_motion_at) {
    rows.push({ label: 'Ultimo movimento', value: formatLastSeen(state.last_motion_at as string) ?? '' });
  }
  if ('temperature' in state && state.temperature !== null && state.temperature !== undefined) {
    rows.push({ label: 'Temperatura', value: `${state.temperature} °C` });
  } else if ('motion' in state) {
    rows.push({ label: 'Temperatura', value: 'in attesa' });
  }
  if ('lux' in state && state.lux !== null && state.lux !== undefined) {
    rows.push({ label: 'Luminosità', value: `${state.lux} lx` });
  } else if ('motion' in state) {
    rows.push({ label: 'Luminosità', value: 'in attesa' });
  }
  if ('battery' in state && state.battery !== null && state.battery !== undefined) {
    rows.push({ label: 'Batteria', value: `${state.battery}%` });
  }
  if ('tamper' in state && state.tamper) {
    rows.push({ label: 'Tamper', value: 'aperto', highlight: true });
  }

  if (rows.length === 0) return null;

  return (
    <div className="text-xs bg-hub-bg rounded-lg px-2 py-1.5 space-y-0.5">
      {rows.map(({ label, value, highlight }) => (
        <div key={label} className="flex justify-between gap-2">
          <span className="text-hub-muted">{label}</span>
          <span className={highlight ? 'text-hub-accent font-medium' : 'text-hub-text font-mono'}>{value}</span>
        </div>
      ))}
    </div>
  );
}

export default function DeviceCard({ device, rooms = [] }: { device: Device; rooms?: Room[] }) {
  const icon = DEVICE_ICONS[device.type] ?? '◈';
  const lastSeen = formatLastSeen(device.last_seen ?? device.connectivity?.last_seen);
  const { installerMode } = useInstallerMode();

  const [displayName, setDisplayName] = useState(device.name);
  const [editing, setEditing]         = useState(false);
  const [inputVal, setInputVal]       = useState(device.name);
  const [saving, setSaving]           = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [displayRoom, setDisplayRoom] = useState<string>(device.room_id ?? '');
  const [savingRoom, setSavingRoom]   = useState(false);

  async function handleRoomChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const roomId = e.target.value;
    setDisplayRoom(roomId);
    setSavingRoom(true);
    try {
      await fetchAPI(`/api/hub/devices/${encodeURIComponent(device.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ room_id: roomId || null, project_id: device.project_id }),
      });
    } catch { /* ignora — la select torna al valore precedente al prossimo render */ }
    setSavingRoom(false);
  }

  function startEdit() {
    setInputVal(displayName);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function commitEdit() {
    const trimmed = inputVal.trim();
    if (!trimmed || trimmed === displayName) { setEditing(false); return; }
    setSaving(true);
    try {
      await fetchAPI(`/api/hub/devices/${encodeURIComponent(device.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: trimmed, project_id: device.project_id }),
      });
      setDisplayName(trimmed);
    } catch { /* ignora — nome resta invariato */ }
    setSaving(false);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter')  { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') { setEditing(false); }
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl leading-none">{icon}</span>
          <div className="min-w-0 flex-1">

            {editing ? (
              <input
                ref={inputRef}
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleKeyDown}
                disabled={saving}
                className="w-full bg-hub-surface border border-hub-accent rounded px-1 py-0.5 text-sm font-medium text-hub-text focus:outline-none"
              />
            ) : (
              <button
                onClick={startEdit}
                className="group flex items-center gap-1 text-left w-full min-w-0"
                title="Rinomina"
              >
                <p className="text-sm font-medium text-hub-text truncate">{displayName}</p>
                <span className="text-hub-muted opacity-0 group-hover:opacity-100 transition-opacity text-xs">✏</span>
              </button>
            )}

            <p className="text-xs text-hub-muted font-mono truncate">{device.id}</p>
          </div>
        </div>
        <StatusDot online={device.online} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant={deviceTypeBadge(device.type)}>{device.type}</Badge>
        <Badge variant="gray">{device.protocol}</Badge>
        {device.vendor && <Badge variant="gray">{device.vendor}</Badge>}
        {!device.online && <Badge variant="red">Non in linea</Badge>}
      </div>

      {Object.keys(device.state ?? {}).length > 0 && (
        SENSOR_TYPES.has(device.type)
          ? <SensorState state={device.state as Record<string, unknown>} />
          : <div className="text-xs text-hub-muted font-mono bg-hub-bg rounded-lg px-2 py-1.5 break-all line-clamp-2">
              {JSON.stringify(device.state)}
            </div>
      )}

      {installerMode && rooms.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-hub-muted shrink-0">Stanza</span>
          <select
            value={displayRoom}
            onChange={handleRoomChange}
            disabled={savingRoom}
            aria-label="Assegna stanza"
            className="flex-1 bg-hub-bg border border-hub-border rounded px-2 py-0.5 text-xs text-hub-text focus:outline-none focus:border-hub-accent"
          >
            <option value="">— nessuna —</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-hub-border/50">
        {device.online && lastSeen ? (
          <span className="text-xs text-hub-muted">visto {lastSeen}</span>
        ) : (
          <span className={`text-xs ${device.online ? 'text-hub-muted' : 'text-hub-red'}`}>
            {device.online ? 'In linea' : 'Non in linea'}
          </span>
        )}
        <CommandButton device={device} />
      </div>
    </div>
  );
}
