/**
 * scritture.test.ts — ciò che la PWA chiede all'Hub, il proxy lo lascia passare
 *
 * 13/11/2026, Romeo: «non posso eliminare le stanze». Il pulsante c'era
 * (RoomCard, RC-04), l'Hub lo permetteva all'admin, ma il proxy non aveva
 * `DELETE rooms/:p/:r` nell'elenco: 405, e la PWA diceva «l'Hub ha detto di no».
 * Il test della card simulava la risposta e non passava di qui.
 *
 *   SC-01  eliminare una stanza passa
 *   SC-02  togliere un device da una stanza passa
 *   SC-03  ciò che non c'è di proposito resta chiuso
 */
import { scritturaConsentita } from '@/lib/scritture';

const p = (s: string) => s.split('/');

describe('le scritture che passano', () => {
  test('SC-01 eliminare una stanza', () => {
    expect(scritturaConsentita('DELETE', p('rooms/default/5a0ad57e'))).toBe(true);
    expect(scritturaConsentita('PATCH', p('rooms/default/5a0ad57e'))).toBe(true);
  });

  test('SC-02 mettere e togliere un device da una stanza', () => {
    expect(scritturaConsentita('POST', p('rooms/default/r1/devices/0xf044'))).toBe(true);
    expect(scritturaConsentita('DELETE', p('rooms/default/r1/devices/0xf044'))).toBe(true);
  });

  test('SC-03 comandi, modo del progetto e reset Z-Wave restano chiusi', () => {
    expect(scritturaConsentita('POST', p('devices/matter-1/command'))).toBe(false);
    expect(scritturaConsentita('PATCH', p('projects/default/mode'))).toBe(false);
    expect(scritturaConsentita('POST', p('zwave/reset'))).toBe(false);
    expect(scritturaConsentita('DELETE', p('rooms/default'))).toBe(false);
  });
});
