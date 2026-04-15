import type { Device } from '@/lib/hub-types';
import Badge, { deviceTypeBadge } from '@/components/ui/Badge';
import StatusDot from '@/components/ui/StatusDot';
import CommandButton from './CommandButton';

const DEVICE_ICONS: Record<string, string> = {
  light: 'ðŸ’¡', rgb_light: 'ðŸŒˆ', cover: 'ðŸªŸ', blind: 'ðŸªŸ', awning: 'â›±',
  thermostat: 'ðŸŒ¡', boiler: 'ðŸ”¥', valve: 'ðŸ”§', plug: 'ðŸ”Œ',
  inverter: 'â˜€', battery: 'ðŸ”‹', meter: 'ðŸ“Š', ev_charger: 'âš¡',
  alarm_panel: 'ðŸš¨', siren: 'ðŸ“£', motion_sensor: 'ðŸ‘', camera: 'ðŸ“·',
  lock: 'ðŸ”’', sensor: 'ðŸ“¡', switch: 'ðŸ”„',
};

function formatLastSeen(ts: string | null | undefined) {
  if (!ts) return null;
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'adesso';
  if (diff < 3600000) return `${Math.round(diff / 60000)}m fa`;
  return `${Math.round(diff / 3600000)}h fa`;
}

export default function DeviceCard({ device }: { device: Device }) {
  const icon = DEVICE_ICONS[device.type] ?? 'â—ˆ';
  const lastSeen = formatLastSeen(device.last_seen ?? device.connectivity?.last_seen);

  return (
    <div className="card flex flex-col gap-3">
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
