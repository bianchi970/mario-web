/**
 * test/helpers/fetch-router.ts
 *
 * MOCK DI FETCH INSTRADATI PER URL, NON PER POSIZIONE.
 *
 * I test degli scenari usavano `mockResolvedValueOnce` in sequenza:
 *
 *     fetchMock
 *       .mockResolvedValueOnce(scenari)      // call 0
 *       .mockResolvedValueOnce(audit)        // call 1
 *       .mockResolvedValueOnce(automazioni)  // call 2
 *       .mockResolvedValueOnce(dispositivi)  // call 3
 *
 * Basta che un componente aggiunga o tolga una chiamata al mount perché tutti
 * gli indici slittino e cinque suite falliscano insieme — è esattamente quanto
 * è successo quando la pagina ha iniziato a leggere /scenes e /devices.
 * Il test non stava segnalando una regressione: stava segnalando sé stesso.
 *
 * Qui le risposte si dichiarano per URL. L'ordine e il numero delle chiamate
 * diventano un dettaglio del componente, non un vincolo del test.
 */

export interface RispostaFinta {
  ok?: boolean;
  status?: number;
  body: unknown;
}

type Rotta = [RegExp, RispostaFinta | ((url: string, init?: RequestInit) => RispostaFinta)];

/** Risposta JSON riuscita. */
export function json(body: unknown, status = 200): RispostaFinta {
  return { ok: status >= 200 && status < 300, status, body };
}

/** Risposta di errore, per i casi in cui il test vuole il fallimento. */
export function errore(status: number, body: unknown = {}): RispostaFinta {
  return { ok: false, status, body };
}

/**
 * Costruisce un mock di `fetch` che sceglie la risposta in base all'URL.
 *
 * @param rotte        coppie [pattern URL, risposta]; vince la prima che matcha
 * @param predefinita  risposta per URL non previsti (default: 200 con {})
 *
 * @example
 *   global.fetch = routerFetch([
 *     [/\/scenes/,      json({ success: true, data: [] })],
 *     [/\/automations/, json({ automations: [] })],
 *     [/\/devices/,     json({ devices: [] })],
 *   ]) as unknown as typeof fetch;
 */
export function routerFetch(rotte: Rotta[], predefinita: RispostaFinta = json({})) {
  const chiamate: Array<{ url: string; init?: RequestInit }> = [];

  const mock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : String(input);
    chiamate.push({ url, init });

    const rotta = rotte.find(([pattern]) => pattern.test(url));
    const rispostaGrezza = rotta
      ? (typeof rotta[1] === 'function' ? rotta[1](url, init) : rotta[1])
      : predefinita;

    const status = rispostaGrezza.status ?? 200;
    return {
      ok:     rispostaGrezza.ok ?? (status >= 200 && status < 300),
      status,
      json:   async () => rispostaGrezza.body,
      text:   async () => JSON.stringify(rispostaGrezza.body),
      headers: new Headers({ 'content-type': 'application/json' }),
    };
  });

  /** Chiamate registrate, per asserire COSA è stato inviato e non quando. */
  (mock as unknown as { chiamate: typeof chiamate }).chiamate = chiamate;

  /** Corpo JSON della prima richiesta verso un URL che matcha il pattern. */
  (mock as unknown as { corpoVerso: (p: RegExp) => unknown }).corpoVerso = (pattern: RegExp) => {
    const c = chiamate.find((x) => pattern.test(x.url) && x.init?.body);
    return c?.init?.body ? JSON.parse(c.init.body as string) : null;
  };

  /** Quante richieste sono andate verso un URL che matcha il pattern. */
  (mock as unknown as { conteggioVerso: (p: RegExp) => number }).conteggioVerso = (pattern: RegExp) =>
    chiamate.filter((x) => pattern.test(x.url)).length;

  return mock;
}

/**
 * Serve le chiamate che la pagina Scenari fa al MONTAGGIO e lascia passare
 * tutto il resto al mock che segue.
 *
 * Permette di mantenere i mock posizionali dove sono utili — le risposte alle
 * azioni dell'utente, che hanno un ordine vero — togliendo la fragilità: il
 * numero di chiamate al montaggio non sposta più gli indici. Quando la pagina
 * ha aggiunto la lettura di `/scenes`, è esattamente questo slittamento ad aver
 * fatto fallire cinque suite senza che nulla fosse rotto nel prodotto.
 *
 * @param coda   mock con la catena `.mockResolvedValueOnce(...)` per le azioni
 * @param audit  contenuto dell'audit al montaggio (default: vuoto)
 */
export function conMontaggioScenari(
  coda: jest.Mock,
  { audit = [] as unknown, scenari = [] as unknown[], devices = [] as unknown[] } = {},
) {
  const risposta = (body: unknown) => ({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: new Headers({ 'content-type': 'application/json' }),
  });

  const montaggio: Array<[RegExp, unknown]> = [
    [/\/api\/scenarios\/audit/, audit],
    [/\/api\/scenarios(\?|$)/,  { success: true, data: scenari }],
    [/\/scenes/,                { success: true, data: [] }],
    [/\/automations/,           { automations: [] }],
    [/\/devices/,               { devices }],
  ];

  const visti = new Set<string>();

  return jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : String(input);
    const rotta = montaggio.find(([p]) => p.test(url));

    // Solo la PRIMA richiesta verso ciascun URL di montaggio viene servita qui:
    // un refresh successivo chiesto dall'utente deve poter leggere dalla coda.
    if (rotta && !visti.has(rotta[0].source) && (!init?.method || init.method === 'GET')) {
      visti.add(rotta[0].source);
      return risposta(rotta[1]);
    }
    return coda(input, init);
  });
}
