import type { EnergySummary } from '@/lib/hub-client';

// `null` è «nessuna misura», e si mostra «—»: non è 0 Wh.
function fmtWh(wh: number | null): string {
  if (wh === null) return '—';
  if (wh >= 1000) return `${(wh / 1000).toFixed(2)} kWh`;
  return `${wh} Wh`;
}

function fmtW(w: number | null): string {
  return w === null ? '—' : `${w} W`;
}

interface Props {
  data: EnergySummary | null;
}

export default function EnergySummaryCard({ data }: Props) {
  const stats = [
    { label: 'Oggi',    value: data ? fmtWh(data.today_wh) : '—' },
    { label: 'Corrente', value: data ? fmtW(data.current_w) : '—' },
    { label: 'Picco',   value: data ? fmtW(data.peak_w)    : '—' },
  ];
  // Nemmeno una misura nei 30 giorni: lo si dice, invece di tre «—» muti.
  const nessunaMisura = data !== null && data.month_wh === null;

  return (
    <div className="card">
      <h2 className="text-sm font-medium text-hub-text mb-3">⚡ Consumo energia</h2>
      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-hub-bg border border-hub-border/50 p-3 text-center">
            <span className="block text-xs text-hub-muted mb-1">{label}</span>
            <span className="block text-lg font-mono font-semibold text-hub-text">{value}</span>
          </div>
        ))}
      </div>
      {data && !nessunaMisura && (
        <div className="mt-3 flex gap-4 text-xs text-hub-muted">
          <span>7 gg: <span className="text-hub-text font-mono">{fmtWh(data.week_wh)}</span></span>
          <span>30 gg: <span className="text-hub-text font-mono">{fmtWh(data.month_wh)}</span></span>
        </div>
      )}
      {nessunaMisura && (
        <p className="mt-3 text-xs text-hub-muted">
          Nessuna misura di consumo negli ultimi 30 giorni: nessun dispositivo l&apos;ha riportata.
        </p>
      )}
      {!data && (
        <p className="mt-3 text-xs text-hub-muted">Dati non disponibili</p>
      )}
    </div>
  );
}
