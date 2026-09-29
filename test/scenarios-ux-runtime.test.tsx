import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ScenariosPage from '@/app/scenarios/page';
import { ProjectProvider } from '@/context/ProjectContext';
import { routerFetch, json } from './helpers/fetch-router';

jest.mock('@/components/layout/TopBar', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

/**
 * Risposte instradate per URL invece che per posizione.
 *
 * I mock erano quattro `mockResolvedValueOnce` in sequenza per il montaggio,
 * poi la risposta all'azione dell'utente. Quando la pagina ha iniziato a
 * leggere anche `/scenes`, ogni indice è slittato di uno e le cinque prove
 * sono fallite insieme: il test stava segnalando la propria fragilità, non
 * una regressione del prodotto.
 */

/** Rotte del montaggio; l'audit lo decide ogni prova. */
const montaggio = (audit: unknown = []) => ([
  [/\/api\/scenarios\/audit/, json(audit)],
  [/\/api\/scenarios/,        json({ success: true, data: [] })],
  [/\/scenes/,                json({ success: true, data: [] })],
  [/\/automations/,           json({ automations: [] })],
  [/\/devices/,               json({ devices: [] })],
] as Parameters<typeof routerFetch>[0]);

function installa(rotte: Parameters<typeof routerFetch>[0]) {
  const mock = routerFetch(rotte);
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

describe('scenarios ux runtime', () => {
  beforeEach(() => {
    localStorage.setItem('mario_project_id', 'test-project');
  });

  test('clear phrase creates scenario and resets the form', async () => {
    installa([
      [/\/api\/scenarios\/from-text/, json({
        success: true,
        status: 'created',
        data: {
          name: 'Chiudi tapparelle zona notte alle 22:00',
          trigger: { type: 'schedule', cron: '0 22 * * *' },
          conditions: [],
          outcome: { type: 'intent', intent: 'chiudi le tapparelle zona notte' },
        },
      })],
      ...montaggio(),
    ]);

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    const textarea = screen.getByPlaceholderText('Scrivi lo scenario...') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'alle 22 chiudi le tapparelle zona notte' } });
    fireEvent.click(screen.getByText('Crea scenario'));

    await waitFor(() => {
      expect(screen.getByText('Scenario creato: Chiudi tapparelle zona notte alle 22:00')).toBeInTheDocument();
    });

    expect(textarea.value).toBe('');
  });

  test('ambiguous phrase shows confirmation panel with original text visible', async () => {
    installa([
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

    expect(screen.getByText('Testo originale')).toBeInTheDocument();
    const originalPanel = screen.getByText('Testo originale').closest('div');
    expect(within(originalPanel as HTMLElement).getByText('chiudi le tapparelle zona notte')).toBeInTheDocument();
    expect(screen.getByText(/Mancano: Orario\./)).toBeInTheDocument();
  });

  test('incomplete confirmation keeps button disabled', async () => {
    installa([
      [/\/api\/scenarios\/from-text/, json({ success: false, status: 'needs_confirmation', missing: ['trigger_time', 'outcome_text'] })],
      ...montaggio(),
    ]);

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    fireEvent.change(screen.getByPlaceholderText('Scrivi lo scenario...'), {
      target: { value: 'alle 22' },
    });
    fireEvent.click(screen.getByText('Crea scenario'));

    await waitFor(() => {
      expect(screen.getByText('Conferma richiesta')).toBeInTheDocument();
    });

    expect(screen.getByText('Conferma e crea')).toBeDisabled();
  });

  test('audit is ordered from most recent event', async () => {
    installa(montaggio([
      { scenario_id: 'older',  scenario_name: 'Older scenario',  status: 'executed', reason: null,              executed_at: '2026-04-11T20:00:00Z' },
      { scenario_id: 'newer',  scenario_name: 'Newer scenario',  status: 'blocked',  reason: 'condition_false', executed_at: '2026-04-11T22:00:00Z' },
      { scenario_id: 'middle', scenario_name: 'Middle scenario', status: 'skipped',  reason: null,              executed_at: '2026-04-11T21:00:00Z' },
    ]));

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    await waitFor(() => {
      expect(screen.getByText('Newer scenario')).toBeInTheDocument();
    });

    const rows = screen.getAllByRole('row');
    const bodyRows = rows.slice(1);
    expect(within(bodyRows[0]).getByText('Newer scenario')).toBeInTheDocument();
    expect(within(bodyRows[1]).getByText('Middle scenario')).toBeInTheDocument();
    expect(within(bodyRows[2]).getByText('Older scenario')).toBeInTheDocument();
    expect(within(bodyRows[0]).getByText('Bloccato')).toBeInTheDocument();
    expect(within(bodyRows[1]).getByText('Saltato')).toBeInTheDocument();
    expect(within(bodyRows[2]).getByText('Eseguito')).toBeInTheDocument();
  });

  test('policy forbidden reason is human readable', async () => {
    installa(montaggio([
      { scenario_id: 'policy', scenario_name: 'Policy scenario', status: 'blocked', reason: 'policy_forbidden_action', executed_at: '2026-04-11T22:00:00Z' },
    ]));

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    await waitFor(() => {
      expect(screen.getByText('Bloccato da policy')).toBeInTheDocument();
    });
  });
});
