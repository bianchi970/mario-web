import { contattoDelBrowser, contattoVecchio, leggiContattoSos, salvaContattoSos } from './contatto-sos';

// Il contatto SOS è della casa (7/11/2026): si legge dall'Hub, nel browser
// resta solo la copia per quando l'Hub non risponde, e il vecchio salvataggio
// locale resta finché qualcuno non lo salva nella casa.

const MAMMA = { name: 'Mamma', number: '+39 333 765 4321' };

function rispondi(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body }) as unknown as typeof fetch;
}

describe('contatto SOS della casa', () => {
  const fetchOriginale = global.fetch;
  beforeEach(() => { localStorage.clear(); jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { global.fetch = fetchOriginale; jest.restoreAllMocks(); });

  it('SOS-W01 si legge dall\'Hub, e il browser ne tiene la copia', async () => {
    rispondi(200, { ok: true, contatto: MAMMA });
    await expect(leggiContattoSos('default')).resolves.toEqual({ contatto: MAMMA, daCopia: false });
    expect(contattoDelBrowser()).toEqual(MAMMA);
  });

  it('SOS-W02 l\'Hub non risponde: l\'ultima copia, dichiarata come tale', async () => {
    rispondi(200, { ok: true, contatto: MAMMA });
    await leggiContattoSos('default');
    global.fetch = jest.fn().mockRejectedValue(new Error('rete')) as unknown as typeof fetch;
    await expect(leggiContattoSos('default')).resolves.toEqual({ contatto: MAMMA, daCopia: true });
  });

  it('SOS-W03 la casa senza contatto non cancella il vecchio del browser', async () => {
    localStorage.setItem('mario_emergency_contact', JSON.stringify(MAMMA));
    rispondi(200, { ok: true, contatto: null });
    await expect(leggiContattoSos('default')).resolves.toEqual({ contatto: null, daCopia: false });
    expect(contattoVecchio()).toEqual(MAMMA);
  });

  it('SOS-W04 salvato nella casa: il vecchio del browser si toglie', async () => {
    localStorage.setItem('mario_emergency_contact', JSON.stringify(MAMMA));
    rispondi(200, { ok: true, contatto: MAMMA });
    await expect(salvaContattoSos('default', { name: 'Mamma', number: MAMMA.number })).resolves.toEqual(MAMMA);
    expect(contattoVecchio()).toBeNull();
    expect(contattoDelBrowser()).toEqual(MAMMA);
  });

  it('SOS-W05 un no dell\'Hub (403) non tocca niente nel browser', async () => {
    localStorage.setItem('mario_emergency_contact', JSON.stringify(MAMMA));
    rispondi(403, { ok: false, error: 'forbidden' });
    await expect(salvaContattoSos('default', { name: 'X', number: '112' })).rejects.toMatchObject({ status: 403 });
    expect(contattoVecchio()).toEqual(MAMMA);
  });
});
