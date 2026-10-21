/**
 * «Fatto.» solo se è stato fatto (21/10/2026).
 *
 * La barra dei comandi scriveva «Fatto.» a ogni risposta 2xx, senza leggerla:
 * anche su un comando che l'Hub aveva solo simulato. Poi, la sera dello stesso
 * giorno: «eseguito» vuol dire che il comando è ARRIVATO al device, e «fatto»
 * lo dice soltanto la conferma del device (`conferma: 'device'`). Il prezzo se
 * questo torna rosso: la persona sente «fatto» su un relè che non si è mosso,
 * ed esce di casa.
 */
import { esitoDetto, esitoPiano, type ExecutionRun } from './ui-command';

describe('esitoDetto — la frase dell\'esito, in un posto solo', () => {
  it('eseguito e confermato dal device → «Fatto.»', () => {
    expect(esitoDetto({ status: 'executed', success: true, conferma: 'device' })).toEqual({ fatto: true, frase: 'Fatto.' });
  });

  it('⛔ eseguito ma senza conferma → «inviato», non «Fatto.»', () => {
    for (const conferma of ['nessuna', null, undefined] as const) {
      const e = esitoDetto({ status: 'executed', success: true, conferma });
      expect(e.fatto).toBe(false);
      expect(e.frase).toMatch(/non ha confermato/);
    }
  });

  it('in corso → lo sta facendo, non «Fatto.»', () => {
    const e = esitoDetto({ status: 'executed', success: true, conferma: 'in_corso' });
    expect(e.fatto).toBe(false);
    expect(e.frase).toMatch(/sta facendo/);
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

describe('esitoPiano — la fine di un piano, in un posto solo', () => {
  const passo = (status: string, result: unknown, error: string | null = null) => ({
    id: 'x', step_index: 0, device_id: null, device_ids: [], action: 'turn_on', description: null,
    status, dependency_type: 'parallel', depends_on: null, result, error, started_at: null, finished_at: null,
  });
  const piano = (status: string, steps: ReturnType<typeof passo>[]) => ({
    execution_id: 'e', project_id: 'default', status, steps_total: steps.length,
    steps_done: steps.filter((s) => s.status === 'succeeded').length,
    steps_failed: steps.filter((s) => s.status === 'failed').length,
    steps, created_at: '', updated_at: '',
  }) as unknown as ExecutionRun;

  it('tutti confermati dal device → «Fatto.»', () => {
    const e = esitoPiano(piano('succeeded', [passo('succeeded', [{ ok: true, conferma: 'device' }, { ok: true, conferma: 'device' }])]));
    expect(e).toEqual({ fatto: true, frase: 'Fatto.' });
  });

  it('⛔ uno senza conferma → «inviato», con quanti', () => {
    const e = esitoPiano(piano('succeeded', [passo('succeeded', [{ ok: true, conferma: 'device' }, { ok: true, conferma: 'nessuna' }])]));
    expect(e.fatto).toBe(false);
    expect(e.frase).toMatch(/non ha confermato/);
  });

  it('⛔ «riuscito» ma senza i risultati dei device → «non so», mai «Fatto.»', () => {
    const e = esitoPiano(piano('succeeded', [passo('succeeded', null)]));
    expect(e.fatto).toBe(false);
    expect(e.frase).not.toBe('Fatto.');
  });

  it('un passo fallito dice PERCHÉ, con le parole di MARIO', () => {
    const e = esitoPiano(piano('failed', [passo('failed', [{ ok: false }], 'Sensore Soggiorno è un sensore: posso leggerlo, non comandarlo.')]));
    expect(e.fatto).toBe(false);
    expect(e.frase).toMatch(/posso leggerlo, non comandarlo/);
  });
});
