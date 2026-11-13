/**
 * scritture.ts — le scritture che il proxy della PWA (`app/api/hub/[...path]`)
 * lascia passare verso l'Hub. Sta qui e non nella rotta perché si possa
 * provare (`scritture.test.ts`): una rotta di Next non esporta altro.
 */

/**
 * Le sole scritture che la PWA fa verso l'Hub, una per riga (metodo + percorso).
 * Tutto il resto risponde 405. Ognuna viaggia con il JWT della persona
 * (`authPer`), e l'Hub controlla il ruolo: questo elenco dice *cosa* la PWA può
 * chiedere, l'Hub *chi* può farlo.
 *
 * NON ci sono, e non per svista:
 *   - `devices/:id/command`, `command`: un device lo comanda solo il Brain
 *     (`/api/brain/*`), e l'Hub li chiude comunque col canale di esecuzione;
 *   - `projects/:id/mode`: il modo della casa è UNO, lo stato dell'allarme
 *     (`security/state`, qui sotto). Il modo del progetto è tolto dall'Hub
 *     (21/10/2026, «fuori casa = allarme inserito», decisione di Romeo);
 *   - `user-prefs/home-layout`: nessuna pagina la usa;
 *   - il resto di `zwave/`: `zwave/reset` CANCELLA la rete Z-Wave, e i
 *     parametri dei nodi non li tocca nessuna pagina. Passano solo i tre
 *     percorsi che la PWA usa (24/10/2026: fino ad allora `zwave/.+`).
 *
 * `devices/:id` è la risorsa device e basta (nome e stanza): fino al 29/09
 * bastava `path[0] === 'devices'`, e passava anche `devices/:id/command`.
 */
const SEG = '[^/]+';
export const SCRITTURE: Array<[string, RegExp]> = [
  ['POST',   /^auth\/.+$/],                                   // login, refresh, logout
  ['POST',   /^push\/.+$/],                                   // iscrizione del telefono, prova
  ['DELETE', /^push\/.+$/],
  ['PATCH',  /^notifications\/.+$/],                          // letta, tutte lette
  ['DELETE', /^notifications\/.+$/],
  ['PATCH',  new RegExp(`^devices/${SEG}$`)],                 // nome e stanza di un device
  ['DELETE', new RegExp(`^projects/${SEG}/devices/${SEG}$`)], // ritirare un device («non c'è più»)
  ['POST',   /^onboarding\/.+$/],                             // aggiungere un device
  ['DELETE', new RegExp(`^onboarding/session/${SEG}$`)],      // annullare l'aggiunta
  ['POST',   /^zwave\/(smartstart|exclusion\/(start|stop))$/], // SmartStart, togliere dalla rete
  ['POST',   new RegExp(`^rooms/${SEG}$`)],                   // nuova stanza
  ['PATCH',  new RegExp(`^rooms/${SEG}/${SEG}$`)],            // rinominare una stanza
  ['DELETE', new RegExp(`^rooms/${SEG}/${SEG}$`)],            // eliminare una stanza (13/11/2026: mancava)
  ['POST',   new RegExp(`^rooms/${SEG}/${SEG}/devices/${SEG}$`)], // device in una stanza
  ['DELETE', new RegExp(`^rooms/${SEG}/${SEG}/devices/${SEG}$`)], // device fuori dalla stanza
  ['POST',   /^users$/],                                      // utenti (solo admin, lo dice l'Hub)
  ['PUT',    new RegExp(`^users/${SEG}$`)],
  ['DELETE', new RegExp(`^users/${SEG}$`)],
  ['PATCH',  new RegExp(`^projects/${SEG}/location$`)],       // posizione del meteo
  ['PATCH',  new RegExp(`^projects/${SEG}/emergency-contact$`)], // contatto SOS della casa (7/11/2026)
  ['POST',   /^wireguard\/regenerate-qr$/],                   // accesso da fuori (solo admin)
  ['POST',   /^security\/state$/],                            // IL modo della casa: l'allarme
];

export function scritturaConsentita(method: string, path: string[]): boolean {
  const p = path.join('/');
  return SCRITTURE.some(([m, re]) => m === method && re.test(p));
}
