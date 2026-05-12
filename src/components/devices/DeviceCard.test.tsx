import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DeviceCard from '@/components/devices/DeviceCard';
import { InstallerModeProvider } from '@/context/InstallerModeContext';
import { ProjectProvider } from '@/context/ProjectContext';
import { OfflineModeProvider } from '@/components/layout/OfflineModeProvider';
import type { Device, Room } from '@/lib/hub-types';

const device: Device = {
  id: 'dev-switch-1',
  project_id: 'proj-1',
  name: 'Luce Soggiorno',
  type: 'switch_relay',
  protocol: 'zwave',
  capabilities: [],
  state: {},
  online: true,
  room_id: null,
  created_at: '2026-05-12T10:00:00Z',
};

const rooms: Room[] = [
  { id: 'room-1', project_id: 'proj-1', name: 'Soggiorno', created_at: '2026-01-01T00:00:00Z' },
  { id: 'room-2', project_id: 'proj-1', name: 'Cucina',    created_at: '2026-01-01T00:00:00Z' },
];

function renderCard(installerMode = false, roomList = rooms) {
  if (installerMode) {
    window.localStorage.setItem('mario_installer_mode', 'true');
  }
  return render(
    <ProjectProvider>
      <InstallerModeProvider>
        <OfflineModeProvider>
          <DeviceCard device={device} rooms={roomList} />
        </OfflineModeProvider>
      </InstallerModeProvider>
    </ProjectProvider>,
  );
}

describe('DeviceCard — room assignment', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('mario_project_id', 'proj-1');
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      if (String(input) === '/api/system/status') {
        return Promise.resolve({ ok: true, json: async () => ({ offline: false }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: { device_id: 'dev-switch-1', room_id: 'room-1' } }),
      });
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.resetAllMocks();
    window.localStorage.clear();
  });

  it('non mostra il select stanza in modalità cliente', () => {
    renderCard(false);
    expect(screen.queryByLabelText('Assegna stanza')).not.toBeInTheDocument();
  });

  it('mostra il select stanza in modalità installatore', () => {
    renderCard(true);
    expect(screen.getByLabelText('Assegna stanza')).toBeInTheDocument();
    expect(screen.getByText('Soggiorno')).toBeInTheDocument();
    expect(screen.getByText('Cucina')).toBeInTheDocument();
  });

  it('non mostra il select se rooms è vuoto anche in installer mode', () => {
    renderCard(true, []);
    expect(screen.queryByLabelText('Assegna stanza')).not.toBeInTheDocument();
  });

  it('chiama PATCH /api/hub/devices/:id al cambio stanza', async () => {
    renderCard(true);

    fireEvent.change(screen.getByLabelText('Assegna stanza'), { target: { value: 'room-1' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/hub/devices/dev-switch-1',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    const patchCall = (global.fetch as jest.Mock).mock.calls.find(
      (call) => String(call[0]) === '/api/hub/devices/dev-switch-1',
    );
    const body = JSON.parse(patchCall![1].body as string);
    expect(body.room_id).toBe('room-1');
    expect(body.project_id).toBe('proj-1');
  });
});
