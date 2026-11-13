/**
 * RoomCard — la stanza si gestisce da dove la si guarda (13/11/2026).
 *
 * Romeo dal telefono: «non posso eliminare le stanze», «voglio che la stanza
 * possa raggruppare più dispositivi», «libertà di cambiare stanze, rinominare».
 * L'Hub lo permetteva all'amministratore; la PWA no: creare solo in modalità
 * installatore, eliminare e rinominare da nessuna parte, e la voce «Dispositivi»
 * nascosta sul telefono — dopo l'associazione un dispositivo non si toccava più.
 *
 *   RC-01  il nome di un dispositivo porta alla sua scheda (rinomina, stanza)
 *   RC-02  «Aggiungi dispositivo» sposta qui un dispositivo di un'altra stanza
 *   RC-03  la stanza si rinomina
 *   RC-04  la stanza si elimina, dopo una conferma che dice cosa succede
 *   RC-05  un «no» dell'Hub si dice, non si tace
 *   RC-06  un dispositivo si toglie dalla stanza
 *   RC-07  la stanza toccata nella Casa si apre da sola
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RoomCard from '@/components/rooms/RoomCard';
import type { Device, Room } from '@/lib/hub-types';

jest.mock('@/hooks/useProjectId', () => ({ useProjectId: () => 'proj-1' }));
jest.mock('@/components/devices/CommandButton', () => ({ __esModule: true, default: () => null }));

const cucina: Room = { id: 'room-cucina', project_id: 'proj-1', name: 'Cucina', created_at: '2026-01-01T00:00:00Z' };
const dev = (id: string, name: string, room_id: string | null): Device => ({
  id, project_id: 'proj-1', name, type: 'sensor', protocol: 'zigbee', capabilities: [], state: {}, online: true,
  room_id, created_at: '2026-11-13T10:00:00Z',
});
const sensore = dev('0xf044', 'Sensore allagamento d3b6', 'room-cucina');
const presa = dev('matter-1', 'Presa Studio', 'room-studio');

let chiamate: Array<{ url: string; method: string; body?: string }> = [];
function hub(risposte: Record<string, { status: number; body?: unknown }> = {}) {
  chiamate = [];
  global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method || 'GET';
    chiamate.push({ url, method, body: init?.body as string | undefined });
    const r = risposte[`${method} ${url}`];
    if (r) return Promise.resolve({ ok: r.status < 400, status: r.status, json: async () => r.body ?? {} });
    if (method === 'GET' && url.endsWith('/devices')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ devices: [sensore] }) });
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ room: { ...cucina, name: 'Cucina grande' } }) });
  }) as jest.Mock;
}

async function apri(props: Partial<React.ComponentProps<typeof RoomCard>> = {}) {
  render(<RoomCard room={cucina} devicesTotal={1} devicesOnline={1} allDevices={[sensore, presa]} {...props} />);
  fireEvent.click(screen.getByText('Cucina'));
  await waitFor(() => expect(screen.getByText('Sensore allagamento d3b6')).toBeInTheDocument());
}

describe('RoomCard — gestire la stanza', () => {
  afterEach(() => jest.restoreAllMocks());

  it('RC-01 il nome di un dispositivo porta alla sua scheda', async () => {
    hub();
    await apri();
    expect(screen.getByText('Sensore allagamento d3b6').closest('a')).toHaveAttribute('href', '/devices/0xf044');
  });

  it('RC-02 «Aggiungi dispositivo» porta qui un dispositivo di un\'altra stanza', async () => {
    hub();
    const onChanged = jest.fn();
    await apri({ onChanged });
    const scelta = screen.getByLabelText('Aggiungi dispositivo');
    // Si offrono solo quelli che non sono già qui.
    expect(screen.queryByRole('option', { name: /Sensore allagamento/ })).not.toBeInTheDocument();
    fireEvent.change(scelta, { target: { value: 'matter-1' } });
    await waitFor(() => expect(chiamate.some((c) => c.method === 'POST'
      && c.url === '/api/hub/rooms/proj-1/room-cucina/devices/matter-1')).toBe(true));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('RC-03 la stanza si rinomina', async () => {
    hub();
    const onChanged = jest.fn();
    await apri({ onChanged });
    fireEvent.click(screen.getByRole('button', { name: 'Rinomina' }));
    fireEvent.change(screen.getByLabelText('Nuovo nome della stanza'), { target: { value: 'Cucina grande' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
    await waitFor(() => {
      const p = chiamate.find((c) => c.method === 'PATCH');
      expect(p?.url).toBe('/api/hub/rooms/proj-1/room-cucina');
      expect(JSON.parse(p?.body || '{}')).toEqual({ name: 'Cucina grande' });
    });
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('RC-04 la stanza si elimina dopo una conferma che dice cosa succede', async () => {
    hub({ 'DELETE /api/hub/rooms/proj-1/room-cucina': { status: 204 } });
    const conferma = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const onChanged = jest.fn();
    await apri({ onChanged });
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
    expect(conferma.mock.calls[0][0]).toMatch(/Cucina/);
    expect(conferma.mock.calls[0][0]).toMatch(/restano/);
    await waitFor(() => expect(chiamate.some((c) => c.method === 'DELETE')).toBe(true));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('RC-04b senza conferma non elimina niente', async () => {
    hub();
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    await apri();
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
    expect(chiamate.some((c) => c.method === 'DELETE')).toBe(false);
  });

  it('RC-06 un dispositivo si toglie dalla stanza (resta nella casa, senza stanza)', async () => {
    hub({ 'DELETE /api/hub/rooms/proj-1/room-cucina/devices/0xf044': { status: 200 } });
    const onChanged = jest.fn();
    await apri({ onChanged });
    fireEvent.click(screen.getByRole('button', { name: 'Togli Sensore allagamento d3b6 dalla stanza' }));
    await waitFor(() => expect(chiamate.some((c) => c.method === 'DELETE'
      && c.url === '/api/hub/rooms/proj-1/room-cucina/devices/0xf044')).toBe(true));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('RC-07 una stanza scelta dalla Casa si apre da sola', async () => {
    hub();
    render(<RoomCard room={cucina} devicesTotal={1} devicesOnline={1} allDevices={[sensore]} aperta />);
    await waitFor(() => expect(screen.getByText('Sensore allagamento d3b6')).toBeInTheDocument());
  });

  it('RC-05 un «no» dell\'Hub si dice', async () => {
    hub({ 'DELETE /api/hub/rooms/proj-1/room-cucina': { status: 403, body: { error: 'forbidden' } } });
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    await apri();
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
    await waitFor(() => expect(screen.getByText(/Solo l'amministratore/)).toBeInTheDocument());
  });
});
