/**
 * Il login è attivo? — una regola sola, letta da middleware e rotte /api/auth.
 *
 * Fino al 20/10/2026 era attivo solo con `REMOTE_AUTH_MODE=true`, e il default
 * era «passa tutto». Sul Pi la variabile non c'era: chiunque fosse sul Wi-Fi di
 * casa leggeva il catalogo (HTTP 200, misurato) e, dal codice, comandava,
 * perché il proxy prestava `HUB_TOKEN` a chi non aveva il cookie.
 *
 * Ora è attivo per default. Si spegne solo dichiarandolo: `REMOTE_AUTH_MODE=false`
 * (sviluppo in locale). Un valore che non è `false` non spegne niente.
 */
export function authAttiva(): boolean {
  return process.env.REMOTE_AUTH_MODE !== 'false';
}
