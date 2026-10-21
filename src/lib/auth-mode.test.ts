/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

// Il difetto del 20/10/2026: sul Pi la variabile non c'era e la PWA dava il
// catalogo a chiunque. Qui il default deve essere CHIUSO.
describe('login attivo per default', () => {
  const prima = process.env.REMOTE_AUTH_MODE;
  afterEach(() => {
    if (prima === undefined) delete process.env.REMOTE_AUTH_MODE;
    else process.env.REMOTE_AUTH_MODE = prima;
    jest.resetModules();
  });

  it('senza variabile, e con valori qualunque, il login è attivo', async () => {
    const { authAttiva } = await import('./auth-mode');
    delete process.env.REMOTE_AUTH_MODE;
    expect(authAttiva()).toBe(true);
    for (const v of ['true', '', '0', 'no', 'off', 'False']) {
      process.env.REMOTE_AUTH_MODE = v;
      expect(authAttiva()).toBe(true);
    }
    process.env.REMOTE_AUTH_MODE = 'false';
    expect(authAttiva()).toBe(false);
  });

  it('senza cookie, /api/hub e /api/brain rispondono 401 e le pagine mandano al login', async () => {
    delete process.env.REMOTE_AUTH_MODE;
    const { middleware } = await import('../middleware');
    for (const p of ['/api/hub/projects/default/devices', '/api/hub/automations/default/x/run', '/api/brain/think']) {
      const res = await middleware(new NextRequest(`https://casa.local${p}`));
      expect(res.status).toBe(401);
    }
    const pagina = await middleware(new NextRequest('https://casa.local/devices'));
    expect(pagina.status).toBe(307);
    expect(pagina.headers.get('location')).toContain('/login');
    const login = await middleware(new NextRequest('https://casa.local/login'));
    expect(login.status).toBe(200);
  });
});

// 21/10/2026: l'identità della persona arriva fino al Brain. Il middleware la
// mette in `x-mario-persona` sulla richiesta inoltrata — il token appena
// verificato — e scarta quella che un client avesse scritto da sé.
describe('la persona viaggia verso il Brain, e solo quella verificata', () => {
  const crypto = require('node:crypto');
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const firma = (payload: object, segreto: string) => {
    const testa = b64({ alg: 'HS256', typ: 'JWT' });
    const corpo = b64(payload);
    const sig = crypto.createHmac('sha256', segreto).update(`${testa}.${corpo}`).digest('base64url');
    return `${testa}.${corpo}.${sig}`;
  };
  const prima = process.env.JWT_SECRET;
  afterEach(() => {
    if (prima === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = prima;
    jest.resetModules();
  });

  it('con un login valido la richiesta inoltrata porta il SUO token, non quello del client', async () => {
    process.env.JWT_SECRET = 'segreto-hub-di-prova';
    delete process.env.REMOTE_AUTH_MODE;
    const { middleware } = await import('../middleware');
    const token = firma({ sub: 7, username: 'romeo', role: 'admin', exp: Math.floor(Date.now() / 1000) + 600 }, 'segreto-hub-di-prova');
    const req = new NextRequest('https://casa.local/api/brain/think', {
      headers: { cookie: `mario_hub_token=${token}`, 'x-mario-persona': 'falso' },
    });
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-request-x-mario-persona')).toBe(token);
  });

  it('su una rotta pubblica una persona scritta dal client non passa', async () => {
    process.env.JWT_SECRET = 'segreto-hub-di-prova';
    delete process.env.REMOTE_AUTH_MODE;
    const { middleware } = await import('../middleware');
    const res = await middleware(new NextRequest('https://casa.local/api/brain/status', { headers: { 'x-mario-persona': 'falso' } }));
    expect(res.headers.get('x-middleware-request-x-mario-persona')).toBeNull();
  });
});
