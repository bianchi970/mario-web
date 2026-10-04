/**
 * house-state.test.ts — lo stato casa non mostra mai il gergo della macchina
 *
 * Nato da un difetto visto sullo schermo, non da un test: il 2026-10-04 la
 * dashboard diceva **«Dispositivo Z-Wave 4ep1: batteria 0%»** — il nome che
 * MARIO si era dato da solo (tipo + protocollo + nodo), al posto di
 * «Riscaldamento Studio», che e il nome che gli ha dato chi abita.
 *
 * Il dedup per nodo fisico era gia corretto: la batteria e una sola e gli
 * endpoint la ripetono. Sbagliava **quale nome** usare, perche prendeva il
 * primo device dell'elenco invece della radice.
 */
import { computeHouseState } from './house-state';

// La casa vera, nella forma in cui la PWA la riceve dall'Hub (4/10).
// L'ordine e quello del catalogo: gli endpoint arrivano PRIMA della radice,
// ed e esattamente la condizione che faceva sbagliare.
const CASA = [
  { id: '4-ep1', name: 'Dispositivo Z-Wave 4ep1', type: 'generic',    online: true, state: { battery: 0 } },
  { id: '4-ep2', name: 'Sensore Z-Wave 4ep2',     type: 'sensor',     online: true, state: { battery: 0, temperature: 24.8 } },
  { id: '4',     name: 'Riscaldamento Studio',    type: 'thermostat', online: true, state: { battery: 0, temperature: 24.8 } },
  { id: '2-ep1', name: 'Luce Cucina',             type: 'switch',     online: true, state: { on: false } },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
] as any;

describe('computeHouseState — batterie', () => {
  it('HS-01 conta UNA batteria per nodo fisico, non una per endpoint', () => {
    expect(computeHouseState(CASA).batteryWarnings).toBe(1);
  });

  it('HS-02 nomina la radice, mai l\'endpoint col nome da macchina', () => {
    const a = computeHouseState(CASA).alerts.find((x) => x.type.startsWith('battery'));
    expect(a?.label).toBe('Riscaldamento Studio: batteria 0%');
    expect(a?.label).not.toMatch(/Z-Wave|ep\d/);
  });

  it('HS-03 batteria a 0 e critica, non solo bassa', () => {
    const a = computeHouseState(CASA).alerts.find((x) => x.type.startsWith('battery'));
    expect(a?.type).toBe('battery_critical');
  });

  it('HS-04 ROVESCIO: senza la radice nell\'elenco, usa il device che ha e non rompe', () => {
    const soloEndpoint = [CASA[0]];
    const s = computeHouseState(soloEndpoint);
    expect(s.batteryWarnings).toBe(1);
    expect(s.alerts[0].label).toContain('Dispositivo Z-Wave 4ep1');
  });
});
