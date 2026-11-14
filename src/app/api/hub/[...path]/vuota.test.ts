/**
 * @jest-environment node
 *
 * vuota.test.ts — un «fatto» senza corpo dell'Hub resta un «fatto».
 *
 * Il 14/11/2026 Romeo elimina la stanza «Depuratore Acqua»: l'Hub la cancella
 * e risponde 204, il proxy ricostruiva la risposta con un corpo "" — e una 204
 * con un corpo non si può costruire: eccezione, 500, e la PWA diceva «l'Hub ha
 * detto di no» per una stanza che non c'era più.
 */

import { NextRequest } from 'next/server';

const mockFetch = jest.fn();
global.fetch = mockFetch as typeof global.fetch;

const PARAMS = { params: Promise.resolve({ path: ['rooms', 'default', 'r1'] }) };

function elimina(): NextRequest {
  return new NextRequest('http://localhost/api/hub/rooms/default/r1', {
    method: 'DELETE',
    headers: { 'x-mario-persona': 'persona' },
  });
}

describe('Hub proxy — una 204 passa come 204', () => {
  afterEach(() => {
    delete process.env.REMOTE_BRIDGE_URL;
    delete process.env.BRIDGE_RELAY_TOKEN;
  });

  it('VU-01 — in casa (Pi): DELETE → 204 resta 204', async () => {
    mockFetch.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DELETE } = require('@/app/api/hub/[...path]/route');
    const res = await DELETE(elimina(), PARAMS);
    expect(res.status).toBe(204);
  });

  it('VU-02 — dal ponte (VPS): DELETE → 204 resta 204', async () => {
    process.env.REMOTE_BRIDGE_URL  = 'http://test-bridge:7002';
    process.env.BRIDGE_RELAY_TOKEN = 'relay-secret';
    mockFetch.mockReset().mockResolvedValue({
      status: 204, text: async () => '', headers: { get: () => null },
    });
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DELETE } = require('@/app/api/hub/[...path]/route');
    const res = await DELETE(elimina(), PARAMS);
    expect(res.status).toBe(204);
  });
});
