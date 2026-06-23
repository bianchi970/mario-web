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

describe('hub proxy read-only boundary', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    process.env.HUB_URL = 'http://hub.local';
    delete process.env.REMOTE_BRIDGE_URL;
    delete process.env.HUB_TOKEN;
  });

  afterEach(() => {
    delete process.env.HUB_URL;
    delete process.env.REMOTE_BRIDGE_URL;
    delete process.env.HUB_TOKEN;
  });

  test('GET /api/hub/[...path] still proxies read requests', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      {
        status: 200,
        body: null,
        headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
        text: async () => JSON.stringify({ devices: [] }),
      },
    ) as never;

    const { GET } = require('@/app/api/hub/[...path]/route');

    const response = await GET(
      {
        method: 'GET',
        headers: { get: () => null },
        cookies: { get: () => undefined },
        nextUrl: new URL('http://localhost:3000/api/hub/devices?projectId=default'),
      },
      { params: { path: ['devices'] } },
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'http://hub.local/api/hub/devices?projectId=default',
      expect.objectContaining({
        method: 'GET',
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ devices: [] });
  });

  test.each(['POST', 'PUT', 'PATCH', 'DELETE'])('%s /api/hub/[...path] is rejected with HUB_PROXY_READ_ONLY', async (method) => {
    const handlers = require('@/app/api/hub/[...path]/route');
    const response = await handlers[method](
      {
        method,
        headers: { get: () => null },
        cookies: { get: () => undefined },
        nextUrl: new URL('http://localhost:3000/api/hub/devices/device-1/command'),
      },
      { params: { path: ['devices', 'device-1', 'command'] } },
    );

    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toEqual({
      success: false,
      data: null,
      error: {
        code: 'HUB_PROXY_READ_ONLY',
        message: 'Il proxy Hub consente solo richieste di lettura',
        source: 'web-hub-proxy',
      },
    });
  });
});
