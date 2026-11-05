// capacita.ts — ciò che un device SA FARE, come lo dice l'Hub. Un lettore solo.
//
// L'Hub manda `capabilities` in due forme: oggetti `{ key, label, actions,
// letture }` (quasi tutti i device) e parole (`['gas', 'sensor']`). La PWA le
// trattava come parole in tre posti: la scheda di un device le disegnava (`{c}`)
// e con un oggetto si rompeva; il cursore della luminosità cercava la parola
// `brightness`, che non arriva mai; i pulsanti si sceglievano per TIPO e
// promettevano azioni che l'Hub rifiuta (una tapparella «Apri» = `turn_on`).
//
// Cosa un device sa fare lo dichiara lui, e l'Hub lo usa per accettare un
// comando (`resolveCapabilities`). Qui si legge la stessa lista (5/11/2026).

export interface AzioneDichiarata {
  key: string;
  label: string;
  type?: string;
}

export interface Capacita {
  key: string;
  label: string;
  actions: AzioneDichiarata[];
  letture: string[];
}

export type CapacitaDallHub = string | {
  key: string;
  label?: string;
  actions?: AzioneDichiarata[];
  letture?: string[];
};

/** Le capability di un device, in una forma sola. */
export function capacitaDi(device: { capabilities?: CapacitaDallHub[] | null }): Capacita[] {
  return (device.capabilities ?? []).flatMap((c) => {
    if (typeof c === 'string') return c ? [{ key: c, label: c, actions: [], letture: [] }] : [];
    if (!c || typeof c.key !== 'string') return [];
    return [{ key: c.key, label: c.label || c.key, actions: c.actions ?? [], letture: c.letture ?? [] }];
  });
}

/** Le azioni che il device dichiara, una volta ciascuna. */
export function azioniDi(device: { capabilities?: CapacitaDallHub[] | null }): AzioneDichiarata[] {
  const viste = new Map<string, AzioneDichiarata>();
  for (const c of capacitaDi(device)) {
    for (const a of c.actions) if (a?.key && !viste.has(a.key)) viste.set(a.key, a);
  }
  return [...viste.values()];
}

/** Il device sa fare questa azione? */
export function sa(device: { capabilities?: CapacitaDallHub[] | null }, azione: string): boolean {
  return azioniDi(device).some((a) => a.key === azione);
}

/**
 * Un'azione che regola qualcosa (`set_*`) vuole un valore: non è un pulsante.
 * È la stessa regola dell'Hub (`src/command/valore.js`): «un'azione che non
 * comincia con `set_` non regola niente».
 */
export function vuoleUnValore(azione: string): boolean {
  return azione.startsWith('set_');
}

/** Il device dice (o legge) questa cosa? Nel nome della capability o nelle sue letture. */
export function dice(device: { capabilities?: CapacitaDallHub[] | null }, cosa: string): boolean {
  return capacitaDi(device).some((c) => c.key === cosa || c.letture.includes(cosa));
}
