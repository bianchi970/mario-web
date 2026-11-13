import { getDevice } from './devices';

// 13/11/2026, Romeo: la scheda del sensore d'acqua si apriva vuota — niente
// nome, niente stanza, «Offline», «Invalid Date». L'Hub risponde
// `{ success, data: { device } }` (la forma vera, letta da `GET /devices/:id`),
// e `getDevice` passava l'involucro alla pagina come se fosse il device. Il test
// della pagina simulava `getDevice` e non se ne poteva accorgere.

const VERO = {
  success: true,
  data: {
    device: {
      id: '0xf044d3fffef7d3b6', device_id: '0xf044d3fffef7d3b6', project_id: 'default',
      name: 'Sensore allagamento d3b6', type: 'sensor', protocol: 'zigbee', room_id: 'r-cucina',
      online: true, state: { flood: false }, created_at: '2026-11-13 12:58:01',
    },
    meta: {},
  },
  error: null,
};

function rispondi(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body }) as unknown as typeof fetch;
}

describe('getDevice', () => {
  const fetchOriginale = global.fetch;
  beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { global.fetch = fetchOriginale; jest.restoreAllMocks(); });

  it('DV-01 dalla risposta vera dell\'Hub esce il device, non l\'involucro', async () => {
    rispondi(200, VERO);
    const d = await getDevice('0xf044d3fffef7d3b6');
    expect(d?.id).toBe('0xf044d3fffef7d3b6');
    expect(d?.name).toBe('Sensore allagamento d3b6');
    expect(d?.room_id).toBe('r-cucina');
    expect(d?.online).toBe(true);
  });

  it('DV-02 un device che non c\'è è null', async () => {
    rispondi(404, { success: false, data: null, error: { code: 'NOT_FOUND' } });
    await expect(getDevice('nessuno')).resolves.toBeNull();
  });
});
