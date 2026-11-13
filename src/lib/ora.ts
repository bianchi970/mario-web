/**
 * ora.ts — l'ora che scrive l'Hub, detta in ora italiana. UNA casa sola.
 *
 * L'Hub scrive `datetime('now')` di SQLite: UTC, senza fuso
 * ("2026-11-13 18:38:19"). `new Date()` la legge come ora LOCALE, e la
 * notifica dell'allagamento delle 19:38 diceva «18:38» (13/11/2026). Le copie
 * erano otto, due giuste e sei no (`ora.test.ts`).
 */

/** Un istante dell'Hub, o `null` se non si legge. Con il fuso dichiarato, si rispetta. */
export function dataDellHub(ts: string | null | undefined): Date | null {
  if (!ts) return null;
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(ts) ? ts : `${ts.replace(' ', 'T')}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** «13/11, 19:38» — giorno e ora: una notifica di ieri non sembra di oggi. */
export function quandoLeggibile(ts: string | null | undefined): string {
  const d = dataDellHub(ts);
  return d ? d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : (ts ?? '');
}

/** «13/11/2026» */
export function giornoLeggibile(ts: string | null | undefined): string {
  const d = dataDellHub(ts);
  return d ? d.toLocaleDateString('it-IT') : '';
}

/** Millisecondi da quell'istante a ora, o `null`. */
export function daQuanto(ts: string | null | undefined): number | null {
  const d = dataDellHub(ts);
  return d ? Date.now() - d.getTime() : null;
}

/** «adesso», «5m fa», «3h fa», oltre un giorno la data — o `null`. */
export function vistoDaQuanto(ts: string | null | undefined): string | null {
  const diff = daQuanto(ts);
  if (diff === null) return null;
  if (diff < 60_000) return 'adesso';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m fa`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h fa`;
  return giornoLeggibile(ts);
}
