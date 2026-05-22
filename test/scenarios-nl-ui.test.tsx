import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ScenariosPage from '@/app/scenarios/page';
import { ProjectProvider } from '@/context/ProjectContext';

jest.mock('@/components/layout/TopBar', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

const fetchMock = jest.fn();

// Mock vuoti per le chiamate iniziali di automazioni e devices (via fetchAPI che controlla res.ok)
const autoMock  = { ok: true, status: 200, json: async () => ({ automations: [] }) };
const devsMock  = { ok: true, status: 200, json: async () => ({ devices: [] }) };

describe('scenarios NL UI', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    localStorage.setItem('mario_project_id', 'test-project');
  });

  test('creates scenario from clear NL input', async () => {
    fetchMock
      // mount: listScenarios, listScenarioAudit, listAutomations, listDevices
      .mockResolvedValueOnce({ json: async () => ({ success: true, data: [] }) })
      .mockResolvedValueOnce({ json: async () => [] })
      .mockResolvedValueOnce(autoMock)
      .mockResolvedValueOnce(devsMock)
      // user action: createScenarioFromText
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          status: 'created',
          data: {
            name: 'Chiudi le tapparelle zona notte alle 22:00',
            trigger: { type: 'schedule', cron: '0 22 * * *' },
            conditions: [],
            outcome: { type: 'intent', intent: 'chiudi le tapparelle zona notte' },
          },
        }),
      })
      // refresh dopo create
      .mockResolvedValueOnce({ json: async () => ({ success: true, data: [] }) })
      .mockResolvedValueOnce({ json: async () => [] });

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    fireEvent.change(screen.getByPlaceholderText('Scrivi lo scenario...'), {
      target: { value: 'alle 22 chiudi le tapparelle zona notte' },
    });

    fireEvent.click(screen.getByText('Crea scenario'));

    await waitFor(() => {
      expect(screen.getByText(/Scenario creato:/i)).toBeInTheDocument();
    });

    // calls[4] = createScenarioFromText (dopo scenarios[0], audit[1], automations[2], devices[3])
    const body = JSON.parse(fetchMock.mock.calls[4][1].body as string);
    expect(body.actions).toBeUndefined();
    expect(body.targets).toBeUndefined();
    expect(body.text).toBe('alle 22 chiudi le tapparelle zona notte');
  });

  test('shows needs_confirmation and does not save immediately', async () => {
    fetchMock
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

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    fireEvent.change(screen.getByPlaceholderText('Scrivi lo scenario...'), {
      target: { value: 'chiudi le tapparelle zona notte' },
    });

    fireEvent.click(screen.getByText('Crea scenario'));

    await waitFor(() => {
      expect(screen.getByText('Conferma richiesta')).toBeInTheDocument();
    });

    expect(screen.getByText('Conferma e crea')).toBeDisabled();
    // 4 mount + 1 user = 5
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  test('confirmation completes missing time and creates scenario', async () => {
    fetchMock
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
      })
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          status: 'created',
          data: {
            name: 'Chiudi le tapparelle zona notte alle 22:00',
            trigger: { type: 'schedule', cron: '0 22 * * *' },
            conditions: [],
            outcome: { type: 'intent', intent: 'chiudi le tapparelle zona notte' },
          },
        }),
      })
      .mockResolvedValueOnce({ json: async () => ({ success: true, data: [] }) })
      .mockResolvedValueOnce({ json: async () => [] });

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    fireEvent.change(screen.getByPlaceholderText('Scrivi lo scenario...'), {
      target: { value: 'chiudi le tapparelle zona notte' },
    });

    fireEvent.click(screen.getByText('Crea scenario'));

    await waitFor(() => {
      expect(screen.getByText('Conferma richiesta')).toBeInTheDocument();
    });

    expect(screen.getByText('Conferma e crea')).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Orario'), {
      target: { value: '22:00' },
    });

    expect(screen.getByText('Conferma e crea')).not.toBeDisabled();
    fireEvent.click(screen.getByText('Conferma e crea'));

    await waitFor(() => {
      expect(screen.getByText(/Scenario creato:/i)).toBeInTheDocument();
    });

    // calls[5] = confirm retry (dopo scenarios[0], audit[1], auto[2], devs[3], needs_conf[4])
    const retryBody = JSON.parse(fetchMock.mock.calls[5][1].body as string);
    expect(retryBody.text).toContain('alle 22:00');
  });

  test('renders audit items from backend with readable reason labels', async () => {
    fetchMock
      .mockResolvedValueOnce({ json: async () => ({ success: true, data: [] }) })
      .mockResolvedValueOnce({
        json: async () => [
          {
            scenario_id: 'night_close',
            scenario_name: 'Night close',
            status: 'blocked',
            reason: 'policy_forbidden_action',
            executed_at: '2026-04-11T22:00:00Z',
          },
        ],
      })
      .mockResolvedValueOnce(autoMock)
      .mockResolvedValueOnce(devsMock);

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    await waitFor(() => {
      expect(screen.getByText('Night close')).toBeInTheDocument();
      expect(screen.getByText('Bloccato')).toBeInTheDocument();
      expect(screen.getByText('Bloccato da policy')).toBeInTheDocument();
    });
  });

  test('shows italian auth required message', async () => {
    fetchMock
      .mockResolvedValueOnce({ json: async () => ({ success: true, data: [] }) })
      .mockResolvedValueOnce({ json: async () => [] })
      .mockResolvedValueOnce(autoMock)
      .mockResolvedValueOnce(devsMock)
      .mockResolvedValueOnce({
        json: async () => ({
          success: false,
          status: 'error',
          error: 'AUTH_REQUIRED',
        }),
      });

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
