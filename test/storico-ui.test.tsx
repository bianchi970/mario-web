/**
 * HUB V1, punto 4 — lo STORICO dei comandi (22/10/2026, decisione di Romeo)
 *
 * Uno solo: il registro del Brain (`command_outbox`), letto da
 * `/api/brain/projects/:id/actions/storico`. Prima la pagina mostrava i
 * conteggi dei tipi di evento dell'Hub: numeri, non cosa è successo.
 */
import { render, screen, waitFor } from '@testing-library/react';
import StoricoPage from '@/app/storico/page';

jest.mock('@/hooks/useProjectId', () => ({ useProjectId: () => 'default' }));
jest.mock('@/components/layout/TopBar', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/dashboard/DeviceHistoryChart', () => ({ __esModule: true, default: () => null }));

const fetchMock = jest.fn();
const risposta = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });

const comandi = [
  { command_id: 'c3', device_id: 'x', device_name: null, action: 'turn_on', detto: 'accendere un dispositivo',
    state: 'failed', conferma: null, origine: null, error: 'rifiutato', created_at: '2026-10-22 18:00:00', chiuso_at: null },
  { command_id: 'c2', device_id: '2-ep1', device_name: 'Luce Cucina', action: 'turn_on', detto: 'acceso Luce Cucina',
    state: 'acked', conferma: 'device', origine: 'romeo', error: null, created_at: '2026-10-22 12:44:54', chiuso_at: '2026-10-22 12:44:55' },
];

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

function rispondi(storico: () => unknown) {
  fetchMock.mockImplementation(async (url: string) => {
    if (String(url).includes('/actions/storico')) return storico();
    return risposta({ ok: true, hours: 24, history: [] });
  });
}

test('SU-01 legge lo storico dal registro del Brain, non i conteggi dell\'Hub', async () => {
  rispondi(() => risposta({ project_id: 'default', count: 2, comandi }));
  render(<StoricoPage />);
  await screen.findByText('Acceso Luce Cucina');
  const urls = fetchMock.mock.calls.map(([u]) => String(u));
  expect(urls.some((u) => u.startsWith('/api/brain/projects/default/actions/storico'))).toBe(true);
  expect(urls.some((u) => u.includes('/history/') && u.includes('/summary'))).toBe(false);
});

test('SU-02 ogni comando dice com\'è finito, quanto ne sa il device e chi l\'ha chiesto', async () => {
  rispondi(() => risposta({ project_id: 'default', count: 2, comandi }));
  render(<StoricoPage />);
  const riga = (await screen.findByText('Acceso Luce Cucina')).closest('li') as HTMLElement;
  expect(riga.textContent).toContain('eseguito');
  expect(riga.textContent).toContain('confermato dal dispositivo');
  expect(riga.textContent).toContain('chiesto da romeo');
});

test('SU-03 un comando fallito si dice fallito, e senza un id', async () => {
  rispondi(() => risposta({ project_id: 'default', count: 2, comandi }));
  render(<StoricoPage />);
  const riga = (await screen.findByText('Accendere un dispositivo')).closest('li') as HTMLElement;
  expect(riga.textContent).toContain('non riuscito');
  expect(riga.textContent).not.toContain('eseguito');
  expect(screen.getByLabelText('Storico dei comandi').textContent).not.toMatch(/2-ep1|\bx\b/);
});

test('SU-04 se lo storico non si legge, lo dice: non è «nessun comando»', async () => {
  rispondi(() => risposta({ error: 'Brain non raggiungibile' }, 502));
  render(<StoricoPage />);
  await waitFor(() => expect(screen.getByText('Non riesco a leggere lo storico dei comandi.')).toBeTruthy());
  expect(screen.queryByText('Nessun comando registrato.')).toBeNull();
});
