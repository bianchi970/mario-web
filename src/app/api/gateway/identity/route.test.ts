/**
 * @jest-environment node
 *
 * route.test.ts — identità del gateway, dal VPS
 *
 * Il 25/10/2026: dal VPS questa rotta chiedeva Hub e Brain a localhost e
 * diceva sempre «non raggiungibile». Ora passa da `hub-client`, che in
 * modalità remota usa il relay del bridge — anche per il Brain, attraverso
 * il proxy dell'Hub (`/api/hub/brain/*`).
 */

const mockFetch = jest.fn();
global.fetch = mockFetch as typeof global.fetch;

const RISPOSTE: Record<string, unknown> = {
  '/api/hub/gateway/identity':    { gateway_id: 'mario-mario-67b513', name: 'MARIO mario', version: '1.0.0' },
  '/api/hub/health':              { status: 'ok', role: 'hub' },
  '/api/hub/brain/system/status': { offline: false },
  '/api/hub/adapters':            { adapters: [
    { adapter_id: 'protocol:zwave', status: 'registered' },
    { adapter_id: 'vendor:zwave-js', status: 'active' },
  ] },
};

describe('GET /api/gateway/identity — modalità remota', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let GET: any;

  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch as typeof global.fetch;
    mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
      const path = url.endsWith('/relay') ? JSON.parse(String(init.body)).path : null;
      if (!path || !(path in RISPOSTE)) return { ok: false, status: 502, text: async () => '', json: async () => ({}) };
      return { ok: true, status: 200, json: async () => RISPOSTE[path] };
    });
    process.env.REMOTE_BRIDGE_URL  = 'http://test-bridge:7002';
    process.env.BRIDGE_RELAY_TOKEN = 'relay-secret';
    process.env.HUB_TOKEN          = 'hub-static-token';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    GET = require('@/app/api/gateway/identity/route').GET;
  });

  afterEach(() => {
    delete process.env.REMOTE_BRIDGE_URL;
    delete process.env.BRIDGE_RELAY_TOKEN;
    delete process.env.HUB_TOKEN;
  });

  it('dal VPS Hub e Brain risultano raggiungibili, attraverso il relay', async () => {
    const body = await (await GET()).json();
    expect(body.hub).toBe('reachable');
    expect(body.brain).toBe('reachable');
    expect(body.z_wave).toBe('active');
    expect(body.gateway_id).toBe('mario-mario-67b513');
    expect(body.mode).toBe('remote');
  });

  it('nessuna richiesta va a localhost: tutto passa dal bridge', async () => {
    await GET();
    const urls = mockFetch.mock.calls.map((c) => String(c[0]));
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((u) => u === 'http://test-bridge:7002/relay')).toBe(true);
  });

  it('se il Brain non risponde lo dice, e il resto resta vero', async () => {
    delete RISPOSTE['/api/hub/brain/system/status'];
    const body = await (await GET()).json();
    expect(body.brain).toBe('unreachable');
    expect(body.hub).toBe('reachable');
  });
});
