import type { EnergyDevice } from '@/lib/hub-client';

interface Props {
  devices: EnergyDevice[] | null;
}

function fmtWh(wh: number): string {
  if (wh >= 1000) return `${(wh / 1000).toFixed(1)} kWh`;
  return `${wh} Wh`;
}

export default function TopDevices({ devices }: Props) {
  const top5 = devices?.slice(0, 5) ?? [];
  const maxWh = top5.length > 0 ? Math.max(...top5.map(d => d.total_wh), 1) : 1;

  return (
    <div className="card">
      <h2 className="text-sm font-medium text-hub-text mb-3">Top dispositivi</h2>
      {top5.length === 0 ? (
        <p className="text-xs text-hub-muted">Nessun dato disponibile</p>
      ) : (
        <div className="space-y-2">
          {top5.map(d => (
            <div key={d.device_id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-hub-text truncate">{d.name}</span>
                  <span className="text-xs font-mono text-hub-muted shrink-0 ml-2">{fmtWh(d.total_wh)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-hub-border/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-hub-accent"
                    style={{ width: `${Math.round((d.total_wh / maxWh) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
