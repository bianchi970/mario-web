'use client';

import { useState, useRef } from 'react';
import type { Device } from '@/lib/hub-types';
import Badge, { deviceTypeBadge } from '@/components/ui/Badge';
import StatusDot from '@/components/ui/StatusDot';
import CommandButton from './CommandButton';
import { fetchAPI } from '@/lib/api/client';

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

export default function DeviceCard({ device }: { device: Device }) {
  const icon = DEVICE_ICONS[device.type] ?? '◈';
  const lastSeen = formatLastSeen(device.last_seen ?? device.connectivity?.last_seen);

  const [displayName, setDisplayName] = useState(device.name);
  const [editing, setEditing]         = useState(false);
  const [inputVal, setInputVal]       = useState(device.name);
  const [saving, setSaving]           = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
        <div className="text-xs text-hub-muted font-mono bg-hub-bg rounded-lg px-2 py-1.5 break-all line-clamp-2">
          {JSON.stringify(device.state)}
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
