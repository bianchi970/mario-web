import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ScenariosPage from '@/app/scenarios/page';
import { ProjectProvider } from '@/context/ProjectContext';

jest.mock('@/components/layout/TopBar', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

describe('scenarios management ui', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    localStorage.setItem('mario_project_id', 'test-project');
  });

  test('renders scenario list from backend', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [
            {
              id: 'night_close',
              name: 'Night close',
              enabled: true,
              trigger: { cron: '0 22 * * *' },
              conditions: [],
              outcome: { type: 'intent', intent: 'chiudi le tapparelle' },
              updated_at: '2026-04-11T21:00:00Z',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        json: async () => [],
      });

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    await waitFor(() => {
      expect(screen.getByText('Night close')).toBeInTheDocument();
      expect(screen.getByText('Attivo')).toBeInTheDocument();
    });
  });

  test('shows explicit error when there is no active project', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          success: false,
          data: [],
          error: 'NO_ACTIVE_PROJECT',
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          success: false,
          status: 'error',
          error: 'NO_ACTIVE_PROJECT',
        }),
      });

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    await waitFor(() => {
      expect(screen.getByText('Nessun progetto attivo disponibile.')).toBeInTheDocument();
    });
  });

  test('toggles scenario and refreshes list', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [
            {
              id: 'night_close',
              name: 'Night close',
              enabled: true,
              trigger: { cron: '0 22 * * *' },
              conditions: [],
              outcome: { type: 'intent', intent: 'chiudi le tapparelle' },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        json: async () => [],
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [
            {
              id: 'night_close',
              name: 'Night close',
              enabled: false,
              trigger: { cron: '0 22 * * *' },
              conditions: [],
              outcome: { type: 'intent', intent: 'chiudi le tapparelle' },
            },
          ],
        }),
      });

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    await waitFor(() => {
      expect(screen.getByText('Disabilita')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Disabilita'));

    await waitFor(() => {
      expect(screen.getByText('Disattivo')).toBeInTheDocument();
    });
  });

  test('deletes scenario and refreshes list', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [
            {
              id: 'night_close',
              name: 'Night close',
              enabled: true,
              trigger: { cron: '0 22 * * *' },
              conditions: [],
              outcome: { type: 'intent', intent: 'chiudi le tapparelle' },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        json: async () => [],
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [],
        }),
      })
      .mockResolvedValueOnce({
        json: async () => [],
      });

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    await waitFor(() => {
      expect(screen.getByText('Elimina')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Elimina'));

    await waitFor(() => {
      expect(screen.getByText('Nessuno scenario salvato.')).toBeInTheDocument();
    });
  });
});
