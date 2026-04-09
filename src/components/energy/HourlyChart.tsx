import type { EnergyHourlySlot } from '@/lib/hub-client';

interface Props {
  slots: EnergyHourlySlot[] | null;
}

export default function HourlyChart({ slots }: Props) {
  const hasData = slots && slots.length > 0 && slots.some(s => s.total_w > 0);
  const list = slots ?? [];
  const maxW = Math.max(...list.map(s => s.total_w), 1);

  const BAR_W = 8;
  const GAP   = 2;
  const H     = 64;
  const total = list.length;
  const svgW  = total * (BAR_W + GAP);

  return (
    <div className="card">
      <h2 className="text-sm font-medium text-hub-text mb-3">Andamento orario (24h)</h2>
      {!hasData ? (
        <p className="text-xs text-hub-muted">Nessun dato nelle ultime 24 ore</p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${svgW} ${H}`}
            width="100%"
            height={H}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {list.map((s, i) => {
              const barH = s.total_w > 0 ? Math.max(Math.round((s.total_w / maxW) * H), 2) : 1;
              const x    = i * (BAR_W + GAP);
              const y    = H - barH;
              return (
                <rect
                  key={s.hour_ts}
                  x={x}
                  y={y}
                  width={BAR_W}
                  height={barH}
                  rx={2}
                  fill={s.total_w > 0 ? 'var(--hub-accent, #3b82f6)' : 'rgba(255,255,255,0.08)'}
                />
              );
            })}
          </svg>
          <div className="mt-1 flex justify-between text-[10px] text-hub-muted font-mono">
            {list
              .filter((_, i) => i % 6 === 0)
              .map(s => <span key={s.hour_ts}>{s.hour}</span>)
            }
          </div>
        </>
      )}
    </div>
  );
}
