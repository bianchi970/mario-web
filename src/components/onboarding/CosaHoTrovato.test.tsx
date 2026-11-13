/**
 * CosaHoTrovato — all'associazione MARIO dice cosa ha capito, e chiede il resto.
 *
 * Romeo, 13/11/2026: «MARIO non conosce i dispositivi quando li assimila: deve
 * sapere cosa è un dispositivo quando lo associa». La PWA mostrava «✓ Dispositivo
 * trovato» e l'id (`0xf044d3fffef7d3b6`), poi un test ON/OFF anche per un sensore
 * d'acqua. Ciò che il device dichiara si DICE; ciò che non può sapere (cosa
 * comanda un relè) si CHIEDE; il nome lo dà chi abita.
 *
 *   CT-01  un sensore: cosa è, cosa sa dire; nessuna domanda «cosa comanda»; mai l'id
 *   CT-02  un relè senza funzione: «Cosa comanda?» e la risposta va all'Hub
 *   CT-03  il nome detto va all'Hub; chi non comanda niente non va al test
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CosaHoTrovato from '@/components/onboarding/CosaHoTrovato';

const SENSORE = {
  id: '0xf044d3fffef7d3b6', name: 'Sensore allagamento d3b6', type: 'sensor', protocol: 'zigbee',
  metadata: { brand: 'sonoff', electrical_function: 'sensore_allagamento' },
  capabilities: [
    { key: 'battery_read', label: 'Batteria', actions: [], letture: ['battery'] },
    { key: 'flood_detect', label: 'Allagamento', actions: [], letture: ['flood'] },
    { key: 'signal_read', label: 'Segnale', actions: [], letture: ['signal'] },
  ],
  capacita: { azioni: {}, letture: {} },
};
const RELE = {
  id: '2-ep2', name: 'Dispositivo Corridoio', type: 'switch_relay', protocol: 'zwave',
  metadata: { brand: 'Shelly Europe Ltd.', electrical_function: null },
  capabilities: [{ key: 'on_off', label: 'Accensione', actions: ['turn_on', 'turn_off'], letture: [] }],
  capacita: { azioni: { turn_on: {}, turn_off: {} }, letture: {} },
};
const FUNZIONI = [{ id: 'luce', label: 'Luce' }, { id: 'presa', label: 'Presa' }, { id: 'sensore_allagamento', label: 'Sensore allagamento' }];

let patch: Array<{ url: string; body: Record<string, unknown> }> = [];
function hub(device: unknown) {
  patch = [];
  global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (init?.method === 'PATCH') {
      patch.push({ url, body: JSON.parse(String(init.body)) });
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ success: true, data: {} }) });
    }
    if (url.includes('/api/hub/funzioni')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ success: true, data: { funzioni: FUNZIONI } }) });
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ success: true, data: device }) });
  }) as jest.Mock;
}

describe('CosaHoTrovato', () => {
  it('CT-01 un sensore: dice cosa è e cosa sa dire, non chiede cosa comanda, non mostra l\'id', async () => {
    hub(SENSORE);
    render(<CosaHoTrovato projectId="default" deviceId={SENSORE.id} onDone={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/Sensore allagamento/)).toBeInTheDocument());
    expect(screen.getByText(/sonoff/i)).toBeInTheDocument();
    expect(screen.getByText(/Allagamento/)).toBeInTheDocument();
    expect(screen.queryByText(/Segnale/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Cosa comanda?')).not.toBeInTheDocument();
    expect(screen.queryByText(/0xf044d3fffef7d3b6/)).not.toBeInTheDocument();
  });

  it('CT-02 un relè senza funzione: chiede cosa comanda e lo dice all\'Hub', async () => {
    hub(RELE);
    const onDone = jest.fn();
    render(<CosaHoTrovato projectId="default" deviceId={RELE.id} onDone={onDone} />);
    const scelta = await screen.findByLabelText('Cosa comanda?');
    fireEvent.change(scelta, { target: { value: 'luce' } });
    fireEvent.click(screen.getByRole('button', { name: /Avanti/ }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(patch[0]?.url).toBe('/api/hub/devices/2-ep2');
    expect(patch[0]?.body).toMatchObject({ electrical_function: 'luce', project_id: 'default' });
    expect(onDone.mock.calls[0][0]).toMatchObject({ comandabile: true });
  });

  it('CT-03 il nome detto va all\'Hub; un sensore non va al test', async () => {
    hub(SENSORE);
    const onDone = jest.fn();
    render(<CosaHoTrovato projectId="default" deviceId={SENSORE.id} onDone={onDone} />);
    const nome = await screen.findByLabelText('Come lo chiami?');
    expect(nome).toHaveValue('Sensore allagamento d3b6');
    fireEvent.change(nome, { target: { value: 'Sensore acqua depuratore' } });
    fireEvent.click(screen.getByRole('button', { name: /Avanti/ }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(patch[0]?.body).toMatchObject({ name: 'Sensore acqua depuratore' });
    expect(onDone.mock.calls[0][0]).toMatchObject({ comandabile: false, name: 'Sensore acqua depuratore' });
  });
});
