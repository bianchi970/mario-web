/**
 * Il confine del proxy Hub: cosa passa, cosa no, e con chi.
 *
 * Fino al 21/10/2026 il proxy era «di sola lettura» con eccezioni aggiunte una
 * alla volta, e rifiutava operazioni legittime della PWA (utenti, meteo, QR,
 * annullare un'aggiunta). Ora un elenco esplicito — e una scrittura non porta
 * MAI il token tecnico dell'Hub, che è admin e canale di esecuzione: senza la
 * persona, un comando potrebbe arrivare a un device senza passare dal Brain.
 */
jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private readonly body: unknown;

    constructor(body?: unknown, init?: { status?: number }) {
      this.status = init?.status ?? 200;
      this.body = body;
    }

    async json() {
      if (typeof this.body === 'string') {
        return JSON.parse(this.body);
      }
      return this.body;
    }

    async text() {
      if (typeof this.body === 'string') {
        return this.body;
      }
      return JSON.stringify(this.body);
    }

    static json(body: unknown, init?: { status?: number }) {
      return new MockNextResponse(body, init);
    }
  }

  return {
    NextResponse: MockNextResponse,
  };
});

const UPSTREAM_OK = {
  status: 200,
  body: null,
  headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
  text: async () => JSON.stringify({ ok: true }),
};

function richiesta(method: string, path: string[], cookie?: string) {
  return {
    method,
    headers: { get: () => null },
    cookies: { get: (n: string) => (n === 'mario_hub_token' && cookie ? { value: cookie } : undefined) },
    nextUrl: new URL(`http://localhost:3000/api/hub/${path.join('/')}`),
    arrayBuffer: async () => new ArrayBuffer(0),
  };
}

async function chiama(method: string, path: string[], cookie?: string) {
  const handlers = require('@/app/api/hub/[...path]/route');
  return handlers[method](richiesta(method, path, cookie), { params: Promise.resolve({ path }) });
}

function authInoltrata(): string | undefined {
  const init = (global.fetch as jest.Mock).mock.calls[0]?.[1];
  return init?.headers?.authorization;
}

describe('hub proxy — il confine', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    process.env.HUB_URL = 'http://hub.local';
    process.env.HUB_TOKEN = 'token-tecnico';
    delete process.env.REMOTE_BRIDGE_URL;
    global.fetch = jest.fn().mockResolvedValue(UPSTREAM_OK) as never;
  });

  afterEach(() => {
    delete process.env.HUB_URL;
    delete process.env.REMOTE_BRIDGE_URL;
    delete process.env.HUB_TOKEN;
  });

  test('una lettura passa', async () => {
    const res = await chiama('GET', ['devices'], 'jwt-romeo');
    expect(res.status).toBe(200);
    expect(authInoltrata()).toBe('Bearer jwt-romeo');
  });

  test.each([
    ['POST',   ['users']],
    ['PUT',    ['users', 'u1']],
    ['DELETE', ['users', 'u1']],
    ['DELETE', ['onboarding', 'session', 'tok']],
    ['PATCH',  ['projects', 'default', 'location']],
    ['POST',   ['wireguard', 'regenerate-qr']],
    ['PATCH',  ['rooms', 'default', 'cucina']],
    ['PATCH',  ['devices', '2-ep1']],
    ['DELETE', ['projects', 'default', 'devices', '2-ep1']], // ritirare: lo decide l'Hub chi può
    ['POST',   ['zwave', 'smartstart']],
    ['POST',   ['zwave', 'exclusion', 'start']],           // togliere un device dalla rete
    ['POST',   ['zwave', 'exclusion', 'stop']],
    ['POST',   ['rooms', 'default']],
    ['PATCH',  ['notifications', 'default', 'n1', 'dismiss']],
    ['POST',   ['security', 'state']],                 // il modo della casa: l'allarme
  ])('%s %j passa, con la persona', async (method, path) => {
    const res = await chiama(method, path as string[], 'jwt-romeo');
    expect(res.status).toBe(200);
    expect(authInoltrata()).toBe('Bearer jwt-romeo');
  });

  test.each([
    ['POST',  ['devices', '2-ep1', 'command']],
    ['POST',  ['command']],
    ['PATCH', ['devices', '2-ep1', 'command']],
    ['PUT',   ['projects', 'default', 'mode']],
    ['PUT',   ['user-prefs', 'home-layout']],
    ['DELETE',['rooms', 'default', 'cucina']],
    ['DELETE',['devices', '2-ep1']],                    // la risorsa device non si cancella così
    ['DELETE',['projects', 'default', 'devices']],      // né tutti insieme
    ['POST',  ['zwave', 'reset']],                      // cancella la rete Z-Wave
    ['POST',  ['zwave', 'node', '4', 'config']],
    ['POST',  ['zwave', 'exclusion', 'start', 'x']],
  ])('%s %j NON passa: 405 e niente arriva all\'Hub', async (method, path) => {
    const res = await chiama(method, path as string[], 'jwt-romeo');
    expect(res.status).toBe(405);
    await expect(res.json()).resolves.toMatchObject({ error: { code: 'HUB_PROXY_READ_ONLY' } });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('una scrittura senza la persona NON prende il token tecnico', async () => {
    await chiama('POST', ['users']);
    expect(authInoltrata()).toBeUndefined();
  });

  test('il login passa senza nessun token', async () => {
    const res = await chiama('POST', ['auth', 'login']);
    expect(res.status).toBe(200);
    expect(authInoltrata()).toBeUndefined();
  });

  test('una lettura senza la persona usa ancora il token tecnico', async () => {
    await chiama('GET', ['health']);
    expect(authInoltrata()).toBe('Bearer token-tecnico');
  });
});
