import { dataDellHub, daQuanto, giornoLeggibile, quandoLeggibile, vistoDaQuanto } from './ora';

// L'allagamento delle 19:38 del 13/11/2026 diceva «18:38» nelle notifiche.
// Il fuso del test è quello di casa (`jest.config`: TZ Europe/Rome).

describe('l\'ora dell\'Hub', () => {
  it('OR-01 «2026-11-13 18:38:19» dell\'Hub è 19:38 in Italia', () => {
    expect(quandoLeggibile('2026-11-13 18:38:19')).toBe('13/11, 19:38');
  });
  it('OR-02 un istante col fuso dichiarato si rispetta', () => {
    expect(quandoLeggibile('2026-11-13T18:38:19.000Z')).toBe('13/11, 19:38');
    expect(dataDellHub('2026-11-13T19:38:19+01:00')?.toISOString()).toBe('2026-11-13T18:38:19.000Z');
  });
  it('OR-03 ciò che non si legge non diventa «Invalid Date»', () => {
    expect(giornoLeggibile(undefined)).toBe('');
    expect(giornoLeggibile('boh')).toBe('');
    expect(daQuanto(null)).toBeNull();
  });
});

describe('visto da quanto', () => {
  it('OR-04 un\'ora dell\'Hub di 5 minuti fa è «5m fa», non «1h fa»', () => {
    const cinqueMinutiFa = new Date(Date.now() - 5 * 60_000).toISOString().replace('T', ' ').slice(0, 19);
    expect(vistoDaQuanto(cinqueMinutiFa)).toBe('5m fa');
  });
});
