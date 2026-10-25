import { render, screen, waitFor, act } from '@testing-library/react';
import { OfflineModeProvider, useOfflineMode } from '@/components/layout/OfflineModeProvider';

// Due difetti misurati il 25/10/2026 dalla PWA sul VPS: un 502 si leggeva come
// «Disattivo», e un cambio che il Brain non aveva fatto si mostrava come fatto.

function Sonda() {
  const { offlineMode, offlineModeLoading, offlineModeUnknown, setOfflineMode } = useOfflineMode();
  return (
    <div>
      <span data-testid="stato">
        {offlineModeLoading ? 'carica' : offlineModeUnknown ? 'ignoto' : offlineMode ? 'offline' : 'online'}
      </span>
      <button onClick={() => setOfflineMode(true)}>spegni</button>
    </div>
  );
}

const risposta = (status: number, body: unknown) =>
  Promise.resolve({ ok: status < 400, status, json: async () => body } as Response);

const BRAIN_GIU = { success: false, error: { code: 'UPSTREAM_UNAVAILABLE' } };

describe('OfflineModeProvider', () => {
  afterEach(() => jest.restoreAllMocks());

  it('legge e scrive dal proxy del Brain, la stessa strada da casa e da fuori', async () => {
    const chiamate: string[] = [];
    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      chiamate.push(`${init?.method || 'GET'} ${String(input)}`);
      return risposta(200, { offline: init?.method === 'POST' });
    }) as jest.Mock;

    render(<OfflineModeProvider><Sonda /></OfflineModeProvider>);
    await waitFor(() => expect(screen.getByTestId('stato').textContent).toBe('online'));
    act(() => screen.getByText('spegni').click());
    await waitFor(() => expect(screen.getByTestId('stato').textContent).toBe('offline'));

    expect(chiamate).toEqual(['GET /api/brain/system/status', 'POST /api/brain/system/offline']);
  });

  it('un 502 in lettura non è «online»: è «non lo so»', async () => {
    global.fetch = jest.fn(() => risposta(502, BRAIN_GIU)) as jest.Mock;

    render(<OfflineModeProvider><Sonda /></OfflineModeProvider>);
    await waitFor(() => expect(screen.getByTestId('stato').textContent).toBe('ignoto'));
  });

  it('un cambio non fatto non si mostra come fatto', async () => {
    global.fetch = jest.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      init?.method === 'POST' ? risposta(502, BRAIN_GIU) : risposta(200, { offline: false }),
    ) as jest.Mock;

    render(<OfflineModeProvider><Sonda /></OfflineModeProvider>);
    await waitFor(() => expect(screen.getByTestId('stato').textContent).toBe('online'));
    act(() => screen.getByText('spegni').click());
    await waitFor(() => expect(screen.getByTestId('stato').textContent).toBe('ignoto'));
  });
});
