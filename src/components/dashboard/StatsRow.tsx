'use client';

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
      ? `${Math.round(uptime / 60)}m attivo`
      : `${Math.round(uptime / 3600)}h attivo`
    : undefined;

  const devicesOffline = totalDevices == null || onlineDevices == null;
  const roomsOffline = totalRooms == null;
  const adaptersOffline = activeAdapters == null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Dispositivi"
        value={devicesOffline ? '–' : totalDevices}
        sub={devicesOffline ? 'Non disponibile' : `${onlineDevices} in linea`}
        color={devicesOffline ? 'text-hub-red' : onlineDevices > 0 ? 'text-hub-text' : 'text-hub-muted'}
      />
      <StatCard
        label="In linea"
        value={devicesOffline ? '–' : onlineDevices}
        sub={devicesOffline ? 'Non disponibile' : `${totalDevices - onlineDevices} non in linea`}
        color={devicesOffline ? 'text-hub-red' : 'text-hub-green'}
      />
      <StatCard
        label="Zone"
        value={roomsOffline ? '–' : totalRooms}
        sub={roomsOffline ? 'Non disponibile' : 'zone configurate'}
        color={roomsOffline ? 'text-hub-red' : 'text-hub-accent'}
      />
      <StatCard
        label="Adattatori"
        value={adaptersOffline ? '–' : activeAdapters}
        sub={adaptersOffline ? 'Non disponibile' : uptimeStr || 'attivi'}
        color={adaptersOffline ? 'text-hub-red' : 'text-hub-amber'}
      />
    </div>
  );
}
