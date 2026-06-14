import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SettingsClient from '@/app/settings/SettingsClient';
import CommandButton from '@/components/devices/CommandButton';
import { OfflineModeProvider } from '@/components/layout/OfflineModeProvider';
import { ProjectProvider } from '@/context/ProjectContext';
import { InstallerModeProvider } from '@/context/InstallerModeContext';

describe('Settings offline mode wiring', () => {
  const device = {
    id: 'dev-cover-1',
    name: 'Garage Cover',
    type: 'cover',
    online: true,
  } as const;

  beforeEach(() => {
    window.localStorage.setItem('mario_project_id', 'default');
    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/system/status') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ offline: false }),
        });
      }
      if (url === '/api/system/offline') {
        const body = init?.body ? JSON.parse(String(init.body)) : { offline: false };
        return Promise.resolve({
          ok: true,
          json: async () => ({ offline: body.offline === true }),
        });
      }
      if (url === '/api/hub/health') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: 'ok' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ status: 'ok' }),
      });
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.resetAllMocks();
    window.localStorage.clear();
  });

  function renderSettings() {
    return render(
      <ProjectProvider>
        <InstallerModeProvider>
          <OfflineModeProvider>
            <SettingsClient
              adapters={[]}
              system={null}
              adaptersAvailable={false}
              systemAvailable={false}
              hubDisplayUrl="http://localhost:4001"
            />
          </OfflineModeProvider>
        </InstallerModeProvider>
      </ProjectProvider>,
    );
  }

  function getActionButtons() {
    return screen.getAllByRole('button').filter(
      (button) => button.textContent !== 'Check' && button.textContent !== 'Esci',
    );
  }

  it('mostra il toggle modalità installatore e lo persiste in localStorage', async () => {
    renderSettings();

    const toggle = await screen.findByLabelText('Modalità installatore');
    expect(toggle).not.toBeChecked();
    expect(window.localStorage.getItem('mario_installer_mode')).toBeNull();

    fireEvent.click(toggle);

    expect(toggle).toBeChecked();
    expect(window.localStorage.getItem('mario_installer_mode')).toBe('true');

    fireEvent.click(toggle);

    expect(toggle).not.toBeChecked();
    expect(window.localStorage.getItem('mario_installer_mode')).toBeNull();
  });

  it('mostra selettore modalità impianto e chiama PUT al cambio', async () => {
    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/system/status') {
        return Promise.resolve({ ok: true, json: async () => ({ offline: false }) });
      }
      if (url === '/api/hub/projects/default/mode') {
        if (!init?.method || init.method === 'GET') {
          return Promise.resolve({ ok: true, json: async () => ({ project_id: 'default', mode: 'home' }) });
        }
        if (init.method === 'PUT') {
          return Promise.resolve({ ok: true, json: async () => ({ project_id: 'default', mode: 'night' }) });
        }
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }) as jest.Mock;

    render(
      <ProjectProvider>
        <InstallerModeProvider>
          <OfflineModeProvider>
            <SettingsClient
              adapters={[]}
              system={null}
              adaptersAvailable={false}
              systemAvailable={true}
              hubDisplayUrl="http://localhost:4001"
            />
          </OfflineModeProvider>
        </InstallerModeProvider>
      </ProjectProvider>,
    );

    await screen.findByText('Casa');
    expect(screen.getByRole('button', { name: 'Casa' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Notte' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/hub/projects/default/mode',
        expect.objectContaining({ method: 'PUT' }),
      );
    });
  });

  it('toggles the real command flow on and off from the global setting', async () => {
    render(
      <ProjectProvider>
        <OfflineModeProvider>
          <SettingsClient
            adapters={[]}
            system={null}
            adaptersAvailable={false}
            systemAvailable={false}
            hubDisplayUrl="http://localhost:4001"
          />
          <CommandButton device={device as never} />
        </OfflineModeProvider>
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Stato offline di sistema')).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
    });

    fireEvent.click(getActionButtons()[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/hub/devices/dev-cover-1/command',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    const callsBeforeOffline = (global.fetch as jest.Mock).mock.calls.filter((call) =>
      String(call[0]).includes('/api/hub/devices/dev-cover-1/command'),
    ).length;

    fireEvent.click(screen.getByLabelText('Stato offline di sistema'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sistema offline' })).toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sistema offline' }));

    const callsWhileOffline = (global.fetch as jest.Mock).mock.calls.filter((call) =>
      String(call[0]).includes('/api/hub/devices/dev-cover-1/command'),
    ).length;
    expect(callsWhileOffline).toBe(callsBeforeOffline);

    fireEvent.click(screen.getByLabelText('Stato offline di sistema'));

    await waitFor(() => {
      expect(getActionButtons()).toHaveLength(2);
    });

    fireEvent.click(getActionButtons()[0]);

    await waitFor(() => {
      const callsAfterOnline = (global.fetch as jest.Mock).mock.calls.filter((call) =>
        String(call[0]).includes('/api/hub/devices/dev-cover-1/command'),
      ).length;
      expect(callsAfterOnline).toBeGreaterThan(callsBeforeOffline);
    });
  });
});
