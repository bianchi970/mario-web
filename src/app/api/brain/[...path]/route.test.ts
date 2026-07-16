/**
 * @jest-environment node
 *
 * route.test.ts — Brain proxy: inoltro Authorization
 *
 * Test 16: il cookie mario_hub_token è inoltrato come Bearer
 *          nella richiesta relay verso il bridge.
 * Test 17: senza cookie il relay risponde 401 e lo status è propagato.
 *
 * Uso jest.resetModules() + require() in beforeEach perché REMOTE_BRIDGE_URL
 * è letto a livello di modulo in route.ts e deve essere impostato prima del require.
 */

import { NextRequest } from 'next/server';

const mockFetch = jest.fn();
global.fetch = mockFetch as typeof global.fetch;

describe('Brain proxy route — inoltro Bearer token', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let POST: any;

  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch as typeof global.fetch;

    process.env.REMOTE_BRIDGE_URL  = 'http://test-bridge:7002';
    process.env.BRIDGE_RELAY_TOKEN = 'relay-secret';
    process.env.HUB_TOKEN          = 'hub-static-token';
    process.env.HUB_ID             = '';

    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    POST = require('@/app/api/brain/[...path]/route').POST;
  });

  afterEach(() => {
    delete process.env.REMOTE_BRIDGE_URL;
    delete process.env.BRIDGE_RELAY_TOKEN;
    delete process.env.HUB_TOKEN;
    delete process.env.HUB_ID;
  });

  // ── 16 — Cookie → Bearer nel relay ─────────────────────────────────────────

  it('16 — forwarda cookie mario_hub_token come Bearer nella richiesta relay', async () => {
    const USER_TOKEN = 'user-jwt-test-token-abc123';
    mockFetch.mockResolvedValue({
      status: 200,
      text: async () => '{"success":true}',
      headers: { get: () => 'application/json' },
    });

    const req = new NextRequest('http://localhost/api/brain/voice/transcribe', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `mario_hub_token=${USER_TOKEN}`,
      },
      body: JSON.stringify({ audio_base64: 'dGVzdA==', mime: 'audio/webm', lang: 'it' }),
    });

    await POST(req, { params: Promise.resolve({ path: ['voice', 'transcribe'] }) });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit & { body: string }];
    expect(url).toBe('http://test-bridge:7002/relay');

    const relay = JSON.parse(init.body) as { path: string; headers: { authorization: string } };
    expect(relay.path).toContain('voice/transcribe');
    expect(relay.headers.authorization).toBe(`Bearer ${USER_TOKEN}`);
  });

  // ── 17 — Nessun cookie → 401 propagato ─────────────────────────────────────

  it('17 — propaga 401 quando relay risponde 401 (nessun cookie utente)', async () => {
    mockFetch.mockResolvedValue({
      status: 401,
      text: async () => '{"error":"unauthorized"}',
      headers: { get: () => 'application/json' },
    });

    const req = new NextRequest('http://localhost/api/brain/voice/transcribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ audio_base64: 'dGVzdA==', mime: 'audio/webm', lang: 'it' }),
    });

    const res = await POST(req, { params: Promise.resolve({ path: ['voice', 'transcribe'] }) });
    expect(res.status).toBe(401);
  });
});
