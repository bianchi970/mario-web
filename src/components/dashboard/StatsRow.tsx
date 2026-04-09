interface Stat {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

interface StatsRowProps {
  totalDevices: number | null;
  onlineDevices: number | null;
  totalRooms: number | null;
  activeAdapters: number | null;
  uptime?: number;
}

function StatCard({ label, value, sub, color = 'text-hub-accent' }: Stat) {
  return (
    <div className="card flex flex-col gap-1">
      <span className="text-xs text-hub-muted uppercase tracking-wide">{label}</span>
      <span className={`text-3xl font-bold ${color}`}>{value}</span>
      {sub && <span className="text-xs text-hub-muted">{sub}</span>}
    </div>
  );
}

export default function StatsRow({ totalDevices, onlineDevices, totalRooms, activeAdapters, uptime }: StatsRowProps) {
  const uptimeStr = uptime != null
    ? uptime < 3600
      ? `${Math.round(uptime / 60)}m uptime`
      : `${Math.round(uptime / 3600)}h uptime`
    : undefined;

  const devicesOffline = totalDevices == null || onlineDevices == null;
  const roomsOffline = totalRooms == null;
  const adaptersOffline = activeAdapters == null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Devices"
        value={devicesOffline ? 'Offline' : totalDevices}
        sub={devicesOffline ? 'Offline' : `${onlineDevices} online`}
        color={devicesOffline ? 'text-hub-red' : onlineDevices > 0 ? 'text-hub-text' : 'text-hub-muted'}
      />
      <StatCard
        label="Online"
        value={devicesOffline ? 'Offline' : onlineDevices}
        sub={devicesOffline ? 'Offline' : `${totalDevices - onlineDevices} offline`}
        color={devicesOffline ? 'text-hub-red' : 'text-hub-green'}
      />
      <StatCard
        label="Rooms"
        value={roomsOffline ? 'Offline' : totalRooms}
        sub={roomsOffline ? 'Offline' : 'zones configured'}
        color={roomsOffline ? 'text-hub-red' : 'text-hub-accent'}
      />
      <StatCard
        label="Adapters"
        value={adaptersOffline ? 'Offline' : activeAdapters}
        sub={adaptersOffline ? 'Offline' : uptimeStr || 'active'}
        color={adaptersOffline ? 'text-hub-red' : 'text-hub-amber'}
      />
    </div>
  );
}
