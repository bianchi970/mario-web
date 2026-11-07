'use client';

import { fetchAPI } from './client';

/**
 * Il contatto SOS è della CASA (Hub, `projects.emergency_*`, migrazione 039).
 *
 * Fino al 7/11/2026 stava nel `localStorage` di un browser solo: su un altro
 * telefono il pulsante SOS offriva solo il 112. Ora si legge dall'Hub; nel
 * browser resta l'ultima risposta come COPIA, usata soltanto quando l'Hub non
 * risponde — un SOS non deve dipendere dalla rete di casa. La copia non si
 * scrive mai da sola: la scrive solo una lettura riuscita.
 */

export interface ContattoSos { name: string | null; number: string }

// Due chiavi, due cose: la COPIA dell'ultima risposta dell'Hub, e il VECCHIO
// salvataggio di prima del 7/11/2026, che resta finché non lo si salva nella
// casa (Impostazioni lo propone). Una chiave sola: il pulsante SOS, leggendo
// «nessun contatto» dall'Hub, avrebbe cancellato il vecchio prima della proposta.
const COPIA   = 'mario_sos_copia';
const VECCHIO = 'mario_emergency_contact';
export const EVENTO_SOS = 'mario-contatto-sos';

const url = (projectId: string) => `/api/hub/projects/${encodeURIComponent(projectId)}/emergency-contact`;

function copia(c: ContattoSos | null) {
  try {
    if (c) localStorage.setItem(COPIA, JSON.stringify(c));
    else localStorage.removeItem(COPIA);
    window.dispatchEvent(new Event(EVENTO_SOS));
  } catch { /* storage non disponibile: resta l'Hub */ }
}

function daChiave(chiave: string): ContattoSos | null {
  try {
    const p = JSON.parse(localStorage.getItem(chiave) || 'null') as { name?: string; number?: string } | null;
    return p?.number ? { name: p.name || null, number: p.number } : null;
  } catch { return null; }
}

/** L'ultima copia del contatto della casa, per quando l'Hub non risponde. */
export function contattoDelBrowser(): ContattoSos | null { return daChiave(COPIA) ?? daChiave(VECCHIO); }

/** Il contatto salvato in questo browser prima che fosse della casa. */
export function contattoVecchio(): ContattoSos | null { return daChiave(VECCHIO); }

/** Il contatto della casa; se l'Hub non risponde, l'ultima copia (`daCopia: true`). */
export async function leggiContattoSos(projectId: string): Promise<{ contatto: ContattoSos | null; daCopia: boolean }> {
  try {
    const r = await fetchAPI<{ ok: boolean; contatto: ContattoSos | null }>(url(projectId));
    copia(r.contatto ?? null);
    return { contatto: r.contatto ?? null, daCopia: false };
  } catch {
    return { contatto: contattoDelBrowser(), daCopia: true };
  }
}

/** Lo dichiara per la casa. Numero vuoto: nessun contatto. */
export async function salvaContattoSos(projectId: string, c: { name: string; number: string }): Promise<ContattoSos | null> {
  const r = await fetchAPI<{ ok: boolean; contatto: ContattoSos | null }>(url(projectId), {
    method: 'PATCH',
    body: JSON.stringify(c),
  });
  copia(r.contatto ?? null);
  try { localStorage.removeItem(VECCHIO); } catch { /* niente */ }
  return r.contatto ?? null;
}
