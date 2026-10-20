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
