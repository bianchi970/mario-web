/**
 * @jest-environment node
 *
 * route.test.ts — stato del gateway, dal VPS: l'Hub dal relay, mai localhost.
 */

const mockFetch = jest.fn();
global.fetch = mockFetch as typeof global.fetch;

describe('GET /api/gateway/status — modalità remota', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let GET: any;

  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch as typeof global.fetch;
    mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith('/relay') && JSON.parse(String(init.body)).path === '/api/hub/health') {
        return { ok: true, status: 200, json: async () => ({ status: 'ok' }) };
      }
      if (url.endsWith('/status')) return { ok: true, status: 200, json: async () => ({ agent_connected: true }) };
      return { ok: false, status: 502, text: async () => '', json: async () => ({}) };
    });
    process.env.REMOTE_BRIDGE_URL  = 'http://test-bridge:7002';
    process.env.BRIDGE_RELAY_TOKEN = 'relay-secret';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    GET = require('@/app/api/gateway/status/route').GET;
  });

  afterEach(() => {
    delete process.env.REMOTE_BRIDGE_URL;
    delete process.env.BRIDGE_RELAY_TOKEN;
  });

  it('hub e bridge veri, e nessuna richiesta a localhost', async () => {
    const body = await (await GET()).json();
    expect(body).toMatchObject({ mode: 'remote', hub: true, bridge: true });
    const urls = mockFetch.mock.calls.map((c) => String(c[0]));
    expect(urls.every((u) => u.startsWith('http://test-bridge:7002/'))).toBe(true);
  });
});
