import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ScenariosPage from '@/app/scenarios/page';
import { ProjectProvider } from '@/context/ProjectContext';
import * as scenariosApi from '@/lib/api/scenarios';

jest.mock('@/components/layout/TopBar', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

describe('scenarios boundary regression', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    localStorage.setItem('mario_project_id', 'test-project');
  });

  test('legacy raw client helper is not available', () => {
    expect('createLegacyScenarioRaw' in scenariosApi).toBe(false);
  });

  test('client raw canonical payload is rejected before fetch', async () => {
    global.fetch = jest.fn();

    await expect(
      scenariosApi.createScenarioCanonical({
        name: 'Bad scenario',
        trigger: { type: 'schedule', at: '22:00' },
        conditions: [],
        outcome: { type: 'intent', intent: 'spegni le luci' },
        // @ts-expect-error regression guard
        actions: [{ id: 'light_1', action: 'off' }],
      }),
    ).rejects.toThrow('forbidden_client_payload:actions');

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('shows only missing fields and keeps confirm disabled until filled', async () => {
    const fetchMock = jest
      .fn()
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

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    fireEvent.change(screen.getByPlaceholderText('Scrivi lo scenario...'), {
      target: { value: 'chiudi le tapparelle zona notte' },
    });
    fireEvent.click(screen.getByText('Crea scenario'));

    await waitFor(() => {
      expect(screen.getByText('Conferma richiesta')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Orario')).toBeInTheDocument();
    expect(screen.queryByLabelText('Azione da eseguire')).not.toBeInTheDocument();
    expect(screen.getByText('Conferma e crea')).toBeDisabled();
  });

  test('refreshes audit on demand and updates the table', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      })
      .mockResolvedValueOnce({
        json: async () => [
          {
            scenario_id: 'night_close',
            scenario_name: 'Night close',
            status: 'blocked',
            reason: 'condition_false',
            executed_at: '2026-04-11T22:00:00Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        json: async () => [
          {
            scenario_id: 'night_open',
            scenario_name: 'Night open',
            status: 'executed',
            reason: null,
            executed_at: '2026-04-11T23:00:00Z',
          },
        ],
      });

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    await waitFor(() => {
      expect(screen.getByText('Night close')).toBeInTheDocument();
      expect(screen.getByText('Condizione non soddisfatta')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Aggiorna audit'));

    await waitFor(() => {
      expect(screen.getByText('Night open')).toBeInTheDocument();
      expect(screen.queryByText('Night close')).not.toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
