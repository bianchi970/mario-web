/**
 * «Fatto.» solo se è stato fatto (21/10/2026).
 *
 * La barra dei comandi scriveva «Fatto.» a ogni risposta 2xx, senza leggerla:
 * anche su un comando che l'Hub aveva solo simulato. Il prezzo se questo torna
 * rosso: la persona sente «fatto» su un relè che non si è mosso, ed esce di casa.
 */
import { esitoDetto } from './ui-command';

describe('esitoDetto — la frase dell\'esito, in un posto solo', () => {
  it('eseguito dall\'Hub → «Fatto.»', () => {
    expect(esitoDetto({ status: 'executed', success: true })).toEqual({ fatto: true, frase: 'Fatto.' });
  });

  it('simulato → non è fatto, e lo dice', () => {
    const e = esitoDetto({ status: 'simulated', success: true });
    expect(e.fatto).toBe(false);
    expect(e.frase).toMatch(/simulato/i);
  });

  it('nessun esito → «non so», mai «Fatto.»', () => {
    for (const r of [undefined, null, {}, { success: true }]) {
      const e = esitoDetto(r as never);
      expect(e.fatto).toBe(false);
      expect(e.frase).not.toBe('Fatto.');
    }
  });
});
