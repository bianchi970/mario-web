import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CommandButton from '@/components/devices/CommandButton';
import { OfflineModeProvider } from '@/components/layout/OfflineModeProvider';
import { ProjectProvider } from '@/context/ProjectContext';

describe('CommandButton offline mode', () => {
  const device = {
    id: 'dev-light-1',
    name: 'Kitchen Light',
    type: 'light',
    online: false,
  } as const;

  beforeEach(() => {
    window.localStorage.setItem('mario_project_id', 'default');
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
    window.localStorage.clear();
  });

  it('blocks live commands when offline mode is enabled', async () => {
    (global.fetch as jest.Mock).mockImplementation((input: RequestInfo | URL) => {
      if (String(input) === '/api/system/status') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ offline: true }),
        });
      }
      return Promise.resolve({ ok: true });
    });

    render(
      <ProjectProvider>
        <OfflineModeProvider>
          <CommandButton device={device as never} />
        </OfflineModeProvider>
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sistema offline' })).toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sistema offline' }));

    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(1);
  });

  it('dispatches the command when offline mode is disabled', async () => {
    (global.fetch as jest.Mock).mockImplementation((input: RequestInfo | URL) => {
      if (String(input) === '/api/system/status') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ offline: false }),
        });
      }
      return Promise.resolve({ ok: true });
    });

    render(
      <ProjectProvider>
        <OfflineModeProvider>
          <CommandButton device={device as never} />
        </OfflineModeProvider>
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'On' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'On' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/hub/devices/dev-light-1/command',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ project_id: 'default', action: 'turn_on', params: {} }),
        }),
      );
    });
  });

  it('shows structured hub error messages to the user', async () => {
    (global.fetch as jest.Mock).mockImplementation((input: RequestInfo | URL) => {
      if (String(input) === '/api/system/status') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ offline: false }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'DEVICE_NOT_FOUND',
            message: 'Device non trovato',
          },
        }),
      });
    });

    render(
      <ProjectProvider>
        <OfflineModeProvider>
          <CommandButton device={device as never} />
        </OfflineModeProvider>
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'On' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'On' }));

    await waitFor(() => {
      expect(screen.getByText('Device non trovato')).toBeInTheDocument();
    });
  });

  it('falls back to a generic communication error when the request throws', async () => {
    (global.fetch as jest.Mock).mockImplementation((input: RequestInfo | URL) => {
      if (String(input) === '/api/system/status') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ offline: false }),
        });
      }
      return Promise.reject(new Error('network down'));
    });

    render(
      <ProjectProvider>
        <OfflineModeProvider>
          <CommandButton device={device as never} />
        </OfflineModeProvider>
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'On' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'On' }));

    await waitFor(() => {
      expect(screen.getByText('Errore di comunicazione')).toBeInTheDocument();
    });
  });
});
