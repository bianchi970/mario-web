import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ScenariosPage from '@/app/scenarios/page';
import { ProjectProvider } from '@/context/ProjectContext';
import { routerFetch, json } from './helpers/fetch-router';

jest.mock('@/components/layout/TopBar', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

/**
 * I mock erano POSIZIONALI: quattro `mockResolvedValueOnce` in sequenza per il
 * montaggio, poi la risposta all'azione dell'utente. Quando la pagina ha
 * iniziato a leggere anche `/scenes`, tutti gli indici sono slittati di uno e
 * le cinque prove sono fallite insieme — il test segnalava sé stesso, non una
 * regressione del prodotto.
 *
 * Ora le risposte si dichiarano per URL: quante chiamate faccia la pagina al
 * montaggio è un suo dettaglio, non un vincolo del test.
 */

/** Risposte comuni al montaggio della pagina. */
const montaggio = (audit: unknown = []) => ([
  [/\/api\/scenarios\/audit/, json(audit)],
  [/\/api\/scenarios(?!\/)/,  json({ success: true, data: [] })],
  [/\/scenes/,                json({ success: true, data: [] })],
  [/\/automations/,           json({ automations: [] })],
  [/\/devices/,               json({ devices: [] })],
] as Parameters<typeof routerFetch>[0]);

type MockRouter = ReturnType<typeof routerFetch> & {
  corpoVerso: (p: RegExp) => Record<string, unknown> | null;
};

function installa(rotte: Parameters<typeof routerFetch>[0]): MockRouter {
  const mock = routerFetch(rotte) as MockRouter;
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

describe('scenarios NL UI', () => {
  beforeEach(() => {
    localStorage.setItem('mario_project_id', 'test-project');
  });

  test('creates scenario from clear NL input', async () => {
    const fetchMock = installa([
      [/\/api\/scenarios\/from-text/, json({
        success: true,
        status: 'created',
        data: {
          name: 'Chiudi le tapparelle zona notte alle 22:00',
          trigger: { type: 'schedule', cron: '0 22 * * *' },
          conditions: [],
          outcome: { type: 'intent', intent: 'chiudi le tapparelle zona notte' },
        },
      })],
      ...montaggio(),
    ]);

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    fireEvent.change(screen.getByPlaceholderText('Scrivi lo scenario...'), {
      target: { value: 'alle 22 chiudi le tapparelle zona notte' },
    });
    fireEvent.click(screen.getByText('Crea scenario'));

    await waitFor(() => {
      expect(screen.getByText(/Scenario creato:/i)).toBeInTheDocument();
    });

    // Il corpo si cerca per destinazione, non per indice di chiamata.
    const body = fetchMock.corpoVerso(/\/api\/scenarios\/from-text/)!;
    expect(body.actions).toBeUndefined();
    expect(body.targets).toBeUndefined();
    expect(body.text).toBe('alle 22 chiudi le tapparelle zona notte');
  });

  test('shows needs_confirmation and does not save immediately', async () => {
    const fetchMock = installa([
      [/\/api\/scenarios\/from-text/, json({ success: false, status: 'needs_confirmation', missing: ['trigger_time'] })],
      ...montaggio(),
    ]);

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    fireEvent.change(screen.getByPlaceholderText('Scrivi lo scenario...'), {
      target: { value: 'chiudi le tapparelle zona notte' },
    });
    fireEvent.click(screen.getByText('Crea scenario'));

    await waitFor(() => {
      expect(screen.getByText('Conferma richiesta')).toBeInTheDocument();
    });

    expect(screen.getByText('Conferma e crea')).toBeDisabled();
    // Il punto è che NON si salva finché manca un dato: una sola richiesta di
    // creazione, non un conteggio totale di chiamate della pagina.
    expect((fetchMock as unknown as { conteggioVerso: (p: RegExp) => number })
      .conteggioVerso(/\/api\/scenarios\/from-text/)).toBe(1);
  });

  test('confirmation completes missing time and creates scenario', async () => {
    let primaRichiesta = true;
    const fetchMock = installa([
      [/\/api\/scenarios\/from-text/, () => {
        if (primaRichiesta) {
          primaRichiesta = false;
          return json({ success: false, status: 'needs_confirmation', missing: ['trigger_time'] });
        }
        return json({
          success: true,
          status: 'created',
          data: {
            name: 'Chiudi le tapparelle zona notte alle 22:00',
            trigger: { type: 'schedule', cron: '0 22 * * *' },
            conditions: [],
            outcome: { type: 'intent', intent: 'chiudi le tapparelle zona notte' },
          },
        });
      }],
      ...montaggio(),
    ]);

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    fireEvent.change(screen.getByPlaceholderText('Scrivi lo scenario...'), {
      target: { value: 'chiudi le tapparelle zona notte' },
    });
    fireEvent.click(screen.getByText('Crea scenario'));

    await waitFor(() => {
      expect(screen.getByText('Conferma richiesta')).toBeInTheDocument();
    });

    expect(screen.getByText('Conferma e crea')).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Orario'), { target: { value: '22:00' } });

    expect(screen.getByText('Conferma e crea')).not.toBeDisabled();
    fireEvent.click(screen.getByText('Conferma e crea'));

    await waitFor(() => {
      expect(screen.getByText(/Scenario creato:/i)).toBeInTheDocument();
    });

    // L'orario mancante deve essere confluito nel testo inviato al secondo giro.
    const chiamate = (fetchMock as unknown as { chiamate: Array<{ url: string; init?: RequestInit }> }).chiamate;
    const richieste = chiamate.filter((c) => /\/api\/scenarios\/from-text/.test(c.url));
    expect(richieste).toHaveLength(2);
    expect(JSON.parse(richieste[1].init!.body as string).text).toContain('alle 22:00');
  });

  test('renders audit items from backend with readable reason labels', async () => {
    installa(montaggio([
      {
        scenario_id: 'night_close',
        scenario_name: 'Night close',
        status: 'blocked',
        reason: 'policy_forbidden_action',
        executed_at: '2026-04-11T22:00:00Z',
      },
    ]));

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    await waitFor(() => {
      expect(screen.getByText('Night close')).toBeInTheDocument();
      expect(screen.getByText('Bloccato')).toBeInTheDocument();
      expect(screen.getByText('Bloccato da policy')).toBeInTheDocument();
    });
  });

  test('shows italian auth required message', async () => {
    installa([
      [/\/api\/scenarios\/from-text/, json({ success: false, status: 'error', error: 'AUTH_REQUIRED' })],
      ...montaggio(),
    ]);

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    fireEvent.change(screen.getByPlaceholderText('Scrivi lo scenario...'), {
      target: { value: 'alle 22 chiudi le tapparelle zona notte' },
    });
    fireEvent.click(screen.getByText('Crea scenario'));

    await waitFor(() => {
      expect(screen.getByText('Autenticazione richiesta.')).toBeInTheDocument();
    });
  });
});
