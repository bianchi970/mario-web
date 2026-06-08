interface Point {
  ts: string;
  value: number;
}

interface Props {
  points: Point[];
  unit?: string;
  color?: string;
}

function fmtHour(isoStr: string): string {
  // "2026-06-08T14:00:00" → "14:00"
  const t = isoStr.slice(11, 16);
  return t || isoStr;
}

export default function DeviceHistoryChart({
  points,
  unit = 'W',
  color = 'var(--hub-accent, #3b82f6)',
}: Props) {
  if (points.length < 2) return null;

  const W = 300;
  const H = 72;
  const PAD = 4;

  const values = points.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values, min + 1);
  const range = max - min;

  const pts = points
    .map((p, i) => {
      const x = PAD + (i / (points.length - 1)) * (W - PAD * 2);
      const y = PAD + (1 - (p.value - min) / range) * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const first = fmtHour(points[0].ts);
  const last = fmtHour(points[points.length - 1].ts);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline
          points={pts}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="flex justify-between text-[10px] text-hub-muted font-mono mt-0.5">
        <span>{first}</span>
        <span className="text-hub-text">{max.toFixed(0)} {unit}</span>
        <span>{last}</span>
      </div>
    </div>
  );
}
