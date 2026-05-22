import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ScenariosPage from '@/app/scenarios/page';
import { ProjectProvider } from '@/context/ProjectContext';

jest.mock('@/components/layout/TopBar', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

// Mock vuoti per automazioni e devices (via fetchAPI che controlla res.ok)
const autoMock = { ok: true, status: 200, json: async () => ({ automations: [] }) };
const devsMock = { ok: true, status: 200, json: async () => ({ devices: [] }) };

describe('scenarios ux runtime', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    localStorage.setItem('mario_project_id', 'test-project');
  });

  test('clear phrase creates scenario and resets the form', async () => {
    const fetchMock = jest
      .fn()
      // mount: listScenarios, listScenarioAudit, listAutomations, listDevices
      .mockResolvedValueOnce({ json: async () => ({ success: true, data: [] }) })
      .mockResolvedValueOnce({ json: async () => [] })
      .mockResolvedValueOnce(autoMock)
      .mockResolvedValueOnce(devsMock)
      // user action
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          status: 'created',
          data: {
            name: 'Chiudi tapparelle zona notte alle 22:00',
            trigger: { type: 'schedule', cron: '0 22 * * *' },
            conditions: [],
            outcome: { type: 'intent', intent: 'chiudi le tapparelle zona notte' },
          },
        }),
      })
      .mockResolvedValueOnce({ json: async () => ({ success: true, data: [] }) })
      .mockResolvedValueOnce({ json: async () => [] });

    global.fetch = fetchMock as unknown as typeof fetch;

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
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ json: async () => ({ success: true, data: [] }) })
      .mockResolvedValueOnce({ json: async () => [] })
      .mockResolvedValueOnce(autoMock)
      .mockResolvedValueOnce(devsMock)
      .mockResolvedValueOnce({
        json: async () => ({
          success: false,
          status: 'needs_confirmation',
          missing: ['trigger_time'],
        }),
      });

    global.fetch = fetchMock as unknown as typeof fetch;

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
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ json: async () => ({ success: true, data: [] }) })
      .mockResolvedValueOnce({ json: async () => [] })
      .mockResolvedValueOnce(autoMock)
      .mockResolvedValueOnce(devsMock)
      .mockResolvedValueOnce({
        json: async () => ({
          success: false,
          status: 'needs_confirmation',
          missing: ['trigger_time', 'outcome_text'],
        }),
      });

    global.fetch = fetchMock as unknown as typeof fetch;

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
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ json: async () => ({ success: true, data: [] }) })
      .mockResolvedValueOnce({
        json: async () => [
          {
            scenario_id: 'older',
            scenario_name: 'Older scenario',
            status: 'executed',
            reason: null,
            executed_at: '2026-04-11T20:00:00Z',
          },
          {
            scenario_id: 'newer',
            scenario_name: 'Newer scenario',
            status: 'blocked',
            reason: 'condition_false',
            executed_at: '2026-04-11T22:00:00Z',
          },
          {
            scenario_id: 'middle',
            scenario_name: 'Middle scenario',
            status: 'skipped',
            reason: null,
            executed_at: '2026-04-11T21:00:00Z',
          },
        ],
      })
      .mockResolvedValueOnce(autoMock)
      .mockResolvedValueOnce(devsMock);

    global.fetch = fetchMock as unknown as typeof fetch;

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
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ json: async () => ({ success: true, data: [] }) })
      .mockResolvedValueOnce({
        json: async () => [
          {
            scenario_id: 'policy',
            scenario_name: 'Policy scenario',
            status: 'blocked',
            reason: 'policy_forbidden_action',
            executed_at: '2026-04-11T22:00:00Z',
          },
        ],
      })
      .mockResolvedValueOnce(autoMock)
      .mockResolvedValueOnce(devsMock);

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    await waitFor(() => {
      expect(screen.getByText('Bloccato da policy')).toBeInTheDocument();
    });
  });
});
