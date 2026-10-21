import type { NextRequest } from 'next/server';

/**
 * Chi sta parlando, per il Brain.
 *
 * Il middleware mette in `x-mario-persona` il JWT della persona appena
 * verificato (o rinnovato), e scarta quello che un client avesse mandato
 * (`src/middleware.ts`). Le rotte che fanno parlare o agire MARIO lo inoltrano
 * accanto al token di servizio, che resta com'era: il Brain ne verifica la
 * firma con il segreto dell'Hub (mario-brain `src/auth/persona.js`).
 * Decisione utente, 21/10/2026: l'identità arriva fino al Gate senza
 * confondersi con i token fra servizi.
 */
export function personaDa(req: NextRequest): Record<string, string> {
  const token = req.headers.get('x-mario-persona');
  return token ? { 'x-mario-persona': token } : {};
}
