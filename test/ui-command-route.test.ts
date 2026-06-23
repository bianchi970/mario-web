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

describe('web ui-command route', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    process.env.BRAIN_URL = 'http://brain.local';
    process.env.BRAIN_TOKEN = 'brain-token';
    delete process.env.REMOTE_BRIDGE_URL;
    delete process.env.HUB_TOKEN;
  });

  afterEach(() => {
    delete process.env.BRAIN_URL;
    delete process.env.BRAIN_TOKEN;
    delete process.env.REMOTE_BRIDGE_URL;
    delete process.env.HUB_TOKEN;
  });

  test('POST /api/brain/projects/[projectId]/actions/ui-command forwards only the minimal safe payload', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      {
        ok: true,
        status: 202,
        json: async () => ({ status: 'accepted', success: true }),
      },
    ) as never;

    const { POST } = require('@/app/api/brain/projects/[projectId]/actions/ui-command/route');

    const response = await POST(
      {
        json: async () => ({
          device_id: 'device-1',
          action: 'turn_on',
          params: { brightness: 80 },
          commands: [{ device_id: 'unsafe', command: 'turn_off' }],
          hub_request: { raw: true },
          dispatchable: true,
          requires_confirmation: true,
          execution_plan: [{ raw: true }],
          confirmation_reply: 'yes',
        }),
      },
      { params: { projectId: 'default' } },
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'http://brain.local/projects/default/actions/ui-command',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer brain-token',
        }),
        body: JSON.stringify({
          device_id: 'device-1',
          action: 'turn_on',
          params: { brightness: 80 },
        }),
      }),
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      status: 'accepted',
      success: true,
    });
  });

  test('POST /api/brain/projects/[projectId]/actions/ui-command returns a safe error envelope', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      {
        ok: false,
        status: 404,
        json: async () => ({ status: 'blocked', error: { code: 'DEVICE_NOT_FOUND', message: 'Device non trovato' } }),
      },
    ) as never;

    const { POST } = require('@/app/api/brain/projects/[projectId]/actions/ui-command/route');

    const response = await POST(
      {
        json: async () => ({
          device_id: 'missing-device',
          action: 'turn_on',
        }),
      },
      { params: { projectId: 'default' } },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      status: 'blocked',
      error: {
        code: 'DEVICE_NOT_FOUND',
        message: 'Device non trovato',
      },
    });
  });
});
