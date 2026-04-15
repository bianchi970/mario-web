import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ScenariosPage from '@/app/scenarios/page';
import { ProjectProvider } from '@/context/ProjectContext';

jest.mock('@/components/layout/TopBar', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

const fetchMock = jest.fn();

describe('scenarios NL UI', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    localStorage.setItem('mario_project_id', 'test-project');
  });

  test('creates scenario from clear NL input', async () => {
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      })
      .mockResolvedValueOnce({
        json: async () => [],
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
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      })
      .mockResolvedValueOnce({
        json: async () => [],
      });

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    fireEvent.change(screen.getByPlaceholderText('Scrivi lo scenario...'), {
      target: { value: 'alle 22 chiudi le tapparelle zona notte' },
    });

    fireEvent.click(screen.getByText('Crea scenario'));

    await waitFor(() => {
      expect(screen.getByText(/Scenario creato:/i)).toBeInTheDocument();
    });

    const body = JSON.parse(fetchMock.mock.calls[2][1].body as string);
    expect(body.actions).toBeUndefined();
    expect(body.targets).toBeUndefined();
    expect(body.text).toBe('alle 22 chiudi le tapparelle zona notte');
  });

  test('shows needs_confirmation and does not save immediately', async () => {
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      })
      .mockResolvedValueOnce({
        json: async () => [],
      })
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
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test('confirmation completes missing time and creates scenario', async () => {
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      })
      .mockResolvedValueOnce({
        json: async () => [],
      })
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
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      })
      .mockResolvedValueOnce({
        json: async () => [],
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

    fireEvent.change(screen.getByLabelText('Orario'), {
      target: { value: '22:00' },
    });

    expect(screen.getByText('Conferma e crea')).not.toBeDisabled();
    fireEvent.click(screen.getByText('Conferma e crea'));

    await waitFor(() => {
      expect(screen.getByText(/Scenario creato:/i)).toBeInTheDocument();
    });

    const retryBody = JSON.parse(fetchMock.mock.calls[3][1].body as string);
    expect(retryBody.text).toContain('alle 22:00');
  });

  test('renders audit items from backend with readable reason labels', async () => {
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      })
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
      });

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    await waitFor(() => {
      expect(screen.getByText('Night close')).toBeInTheDocument();
      expect(screen.getByText('Bloccato')).toBeInTheDocument();
      expect(screen.getByText('Bloccato da policy')).toBeInTheDocument();
    });
  });

  test('shows italian auth required message', async () => {
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      })
      .mockResolvedValueOnce({
        json: async () => [],
      })
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
