/**
 * @jest-environment node
 *
 * «Chi sono io», in casa e fuori.
 *
 * Il 7/11/2026, da app.homemario.com con un login appena fatto, /api/auth/me
 * rispondeva `{ id: null }`: la rotta chiedeva a HUB_URL, che sul VPS è
 * localhost, dove l'Hub non c'è. Fuori casa la PWA non sapeva mai chi fossi.
 * La strada (diretta o ponte) la sceglie `hub-client`, una volta sola.
 */

import { NextRequest } from 'next/server';

const ROMEO = { id: 'u-1', username: 'romeo', role: 'admin', project_id: null };

function richiesta(): NextRequest {
  return new NextRequest('https://casa.local/api/auth/me', {
    headers: { cookie: 'mario_hub_token=tok-romeo' },
  });
}

describe('/api/auth/me', () => {
  const fetchOriginale = global.fetch;
  afterEach(() => {
    global.fetch = fetchOriginale;
    delete process.env.REMOTE_BRIDGE_URL;
    delete process.env.BRIDGE_RELAY_TOKEN;
    delete process.env.HUB_TOKEN;
    jest.resetModules();
  });

  it('ME-01 — dal VPS chiede all\'Hub dal ponte, con il token della persona', async () => {
    process.env.REMOTE_BRIDGE_URL  = 'http://test-bridge:7002';
    process.env.BRIDGE_RELAY_TOKEN = 'relay-secret';
    process.env.HUB_TOKEN          = 'hub-static-token';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({ success: true, data: ROMEO, error: null }),
    });
    global.fetch = fetchMock as typeof fetch;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GET } = require('@/app/api/auth/me/route');

    const res = await GET(richiesta());

    expect(await res.json()).toEqual(ROMEO);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { body: string }];
    expect(url).toBe('http://test-bridge:7002/relay');
    const relay = JSON.parse(init.body) as { path: string; headers: Record<string, string> };
    expect(relay.path).toBe('/api/hub/auth/me');
    expect(relay.headers.Authorization).toBe('Bearer tok-romeo');
  });

  it('ME-02 — in casa chiede all\'Hub direttamente, con il token della persona', async () => {
    process.env.HUB_TOKEN = 'hub-static-token';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({ success: true, data: ROMEO, error: null }),
    });
    global.fetch = fetchMock as typeof fetch;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GET } = require('@/app/api/auth/me/route');

    const res = await GET(richiesta());

    expect(await res.json()).toEqual(ROMEO);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:4001/api/hub/auth/me');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-romeo');
  });

  it('ME-03 — se l\'Hub dice di no, nessuno (mai il token tecnico)', async () => {
    process.env.REMOTE_BRIDGE_URL = 'http://test-bridge:7002';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false, status: 401, text: async () => 'no',
    }) as typeof fetch;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GET } = require('@/app/api/auth/me/route');

    const res = await GET(richiesta());

    expect(await res.json()).toEqual({ id: null, username: null, role: null, project_id: null });
  });
});
