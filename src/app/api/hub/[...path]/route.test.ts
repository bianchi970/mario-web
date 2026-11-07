/**
 * @jest-environment node
 *
 * route.test.ts — Hub proxy: con quale token si parla all'Hub.
 *
 * Il 7/11/2026, 16 minuti dopo il login, `app.homemario.com` dava 401 sui
 * device: il middleware rinnovava il token scaduto e lo metteva in
 * `x-mario-persona`, ma il proxy mandava all'Hub il cookie della richiesta,
 * ancora quello vecchio. Vale il token che il middleware ha verificato.
 */

import { NextRequest } from 'next/server';

const mockFetch = jest.fn();
global.fetch = mockFetch as typeof global.fetch;

function richiesta(): NextRequest {
  return new NextRequest('http://localhost/api/hub/projects/default/devices', {
    method: 'GET',
    headers: { cookie: 'mario_hub_token=scaduto', 'x-mario-persona': 'rinnovato' },
  });
}

const PARAMS = { params: Promise.resolve({ path: ['projects', 'default', 'devices'] }) };

describe('Hub proxy — il token della persona, non il cookie', () => {
  afterEach(() => {
    delete process.env.REMOTE_BRIDGE_URL;
    delete process.env.BRIDGE_RELAY_TOKEN;
    delete process.env.HUB_TOKEN;
  });

  it('TK-02 — dal ponte (VPS): manda il token rinnovato', async () => {
    process.env.REMOTE_BRIDGE_URL  = 'http://test-bridge:7002';
    process.env.BRIDGE_RELAY_TOKEN = 'relay-secret';
    process.env.HUB_TOKEN          = 'hub-static-token';
    mockFetch.mockReset().mockResolvedValue({
      status: 200, text: async () => '{"success":true}', headers: { get: () => 'application/json' },
    });
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GET } = require('@/app/api/hub/[...path]/route');

    await GET(richiesta(), PARAMS);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit & { body: string }];
    expect(url).toBe('http://test-bridge:7002/relay');
    const relay = JSON.parse(init.body) as { headers: { authorization: string } };
    expect(relay.headers.authorization).toBe('Bearer rinnovato');
  });

  it('TK-03 — in casa (Pi): manda il token rinnovato', async () => {
    process.env.HUB_TOKEN = 'hub-static-token';
    mockFetch.mockReset().mockResolvedValue(new Response('{"success":true}', {
      status: 200, headers: { 'content-type': 'application/json' },
    }));
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GET } = require('@/app/api/hub/[...path]/route');

    await GET(richiesta(), PARAMS);

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer rinnovato');
  });
});
