jest.mock('next/server', () => ({
  NextResponse: {
    json(body: unknown, init?: { status?: number }) {
      return {
        status: init?.status ?? 200,
        async json() {
          return body;
        },
      };
    },
  },
}));

describe('scenarios upstream boundary', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
  });

  test('GET /api/scenarios returns canonical UPSTREAM_UNAVAILABLE when Brain is down', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed')) as never;
    const { GET } = require('@/app/api/scenarios/route');

    const response = await GET({
      headers: { get: (key: string) => (key.toLowerCase() === 'authorization' ? 'Bearer token' : null) },
      nextUrl: new URL('http://localhost:3000/api/scenarios'),
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      success: false,
      data: null,
      error: {
        code: 'UPSTREAM_UNAVAILABLE',
        message: 'Brain non raggiungibile',
        source: 'web-scenarios-proxy',
      },
    });
  });

  test('POST /api/scenarios/from-text returns canonical UPSTREAM_UNAVAILABLE when Brain is down', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed')) as never;
    const { POST } = require('@/app/api/scenarios/from-text/route');

    const response = await POST({
      headers: { get: (key: string) => (key.toLowerCase() === 'authorization' ? 'Bearer token' : null) },
      nextUrl: new URL('http://localhost:3000/api/scenarios/from-text'),
      json: async () => ({ text: 'alle 22 chiudi le tapparelle zona notte' }),
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      success: false,
      data: null,
      error: {
        code: 'UPSTREAM_UNAVAILABLE',
        message: 'Brain non raggiungibile',
        source: 'web-scenarios-proxy',
      },
    });
  });
});
