// I tentativi di login si contano per persona (1/11/2026): la PWA arriva all'Hub
// sempre da 127.0.0.1, quindi gli dice l'IP che nginx le ha scritto (`X-Real-IP`)
// in `x-mario-ip` — in casa direttamente, da fuori dentro il ponte.
jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    cookies = { set: jest.fn() };
    constructor(public body?: unknown, init?: { status?: number }) { this.status = init?.status ?? 200; }
    static json(body: unknown, init?: { status?: number }) { return new MockNextResponse(body, init); }
  }
  return { NextResponse: MockNextResponse };
});
jest.mock('@/lib/auth-mode', () => ({ authAttiva: () => true }));

const richiesta = (ip?: string) => ({
  headers: new Headers(ip ? { 'x-real-ip': ip } : {}),
  json: async () => ({ username: 'romeo', password: 'x' }),
});
const risposta = { ok: true, json: async () => ({ success: true, data: { access_token: 't', refresh_token: 'r' } }) };

describe('login: l\'IP della persona arriva all\'Hub', () => {
  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn(async () => risposta) as unknown as typeof fetch;
  });

  it('in casa: x-mario-ip nella chiamata all\'Hub', async () => {
    delete process.env.REMOTE_BRIDGE_URL;
    const { POST } = await import('@/app/api/auth/login/route');
    await POST(richiesta('192.168.1.20') as never);
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers['x-mario-ip']).toBe('192.168.1.20');
  });

  it('da fuori: x-mario-ip dentro gli header che il ponte inoltra', async () => {
    process.env.REMOTE_BRIDGE_URL = 'http://ponte.local';
    const { POST } = await import('@/app/api/auth/login/route');
    await POST(richiesta('93.1.2.3') as never);
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(init.body).headers['x-mario-ip']).toBe('93.1.2.3');
    delete process.env.REMOTE_BRIDGE_URL;
  });

  it('troppi tentativi si dicono come tali (429), non come Hub irraggiungibile', async () => {
    delete process.env.REMOTE_BRIDGE_URL;
    global.fetch = jest.fn(async () => ({ ok: false, status: 429, json: async () => ({}) })) as unknown as typeof fetch;
    const { POST } = await import('@/app/api/auth/login/route');
    const r = await POST(richiesta('192.168.1.20') as never) as unknown as { status: number; body: { error: string } };
    expect(r.status).toBe(429);
    expect(r.body.error).toBe('too_many_attempts');
  });

  it('senza X-Real-IP non si inventa niente', async () => {
    delete process.env.REMOTE_BRIDGE_URL;
    const { POST } = await import('@/app/api/auth/login/route');
    await POST(richiesta() as never);
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers['x-mario-ip']).toBeUndefined();
  });
});
