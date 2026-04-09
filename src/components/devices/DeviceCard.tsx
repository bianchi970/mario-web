import type { Device } from '@/lib/hub-types';
import Badge, { deviceTypeBadge } from '@/components/ui/Badge';
import StatusDot from '@/components/ui/StatusDot';
import CommandButton from './CommandButton';

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
  if (diff < 60000)   return 'just now';
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
  return `${Math.round(diff / 3600000)}h ago`;
}

interface Props {
  device: Device;
  projectId: string;
}

export default function DeviceCard({ device, projectId }: Props) {
  const icon     = DEVICE_ICONS[device.type] ?? '◈';
  const lastSeen = formatLastSeen(device.last_seen ?? device.connectivity?.last_seen);

  return (
    <div className="card flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl leading-none">{icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-hub-text truncate">{device.name}</p>
            <p className="text-xs text-hub-muted font-mono truncate">{device.id}</p>
          </div>
        </div>
        <StatusDot online={device.online} />
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        <Badge variant={deviceTypeBadge(device.type)}>{device.type}</Badge>
        <Badge variant="gray">{device.protocol}</Badge>
        {device.vendor && <Badge variant="gray">{device.vendor}</Badge>}
        {!device.online && <Badge variant="red">Offline</Badge>}
      </div>

      {/* State preview */}
      {Object.keys(device.state ?? {}).length > 0 && (
        <div className="text-xs text-hub-muted font-mono bg-hub-bg rounded-lg px-2 py-1.5 break-all line-clamp-2">
          {JSON.stringify(device.state)}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-hub-border/50">
        {device.online && lastSeen ? (
          <span className="text-xs text-hub-muted">seen {lastSeen}</span>
        ) : (
          <span className={`text-xs ${device.online ? 'text-hub-muted' : 'text-hub-red'}`}>
            {device.online ? 'online' : 'Offline'}
          </span>
        )}
        <CommandButton device={device} projectId={projectId} />
      </div>
    </div>
  );
}
