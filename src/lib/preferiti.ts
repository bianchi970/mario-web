'use client';

/**
 * I preferiti di chi abita: i device che vuole in Casa, a portata di dito.
 *
 * Proposta 2 della pagina delle decisioni (Romeo: sì, 14/11/2026). Non è un
 * archivio nuovo: l'Hub ha già le preferenze della pagina Casa per persona
 * (`user-prefs/home-layout`, una riga per utente e casa), che nessuna pagina
 * usava. I preferiti sono la chiave `preferiti` di quel layout; le altre chiavi
 * si conservano, così chi le scriverà domani non le perde oggi.
 */

type Layout = Record<string, unknown> & { preferiti?: unknown };

async function leggiLayout(projectId: string): Promise<Layout> {
  const r = await fetch(`/api/hub/user-prefs/home-layout?project_id=${encodeURIComponent(projectId)}`);
  if (!r.ok) throw new Error(`preferiti ${r.status}`);
  const j = (await r.json()) as { data?: { layout?: Layout | null } };
  return j.data?.layout ?? {};
}

export function preferitiDi(layout: Layout | null | undefined): string[] {
  const p = layout?.preferiti;
  return Array.isArray(p) ? p.filter((x): x is string => typeof x === 'string') : [];
}

export async function leggiPreferiti(projectId: string): Promise<string[]> {
  return preferitiDi(await leggiLayout(projectId));
}

/** Aggiunge o toglie un device; restituisce l'elenco salvato. */
export async function cambiaPreferito(projectId: string, deviceId: string): Promise<string[]> {
  const layout = await leggiLayout(projectId);
  const prima = preferitiDi(layout);
  const preferiti = prima.includes(deviceId) ? prima.filter((x) => x !== deviceId) : [...prima, deviceId];
  const r = await fetch('/api/hub/user-prefs/home-layout', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, layout: { ...layout, preferiti } }),
  });
  if (!r.ok) throw new Error(`preferiti ${r.status}`);
  return preferiti;
}
