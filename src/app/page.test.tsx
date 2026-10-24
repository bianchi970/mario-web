import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '@/app/page';
import { useProjectId } from '@/hooks/useProjectId';
import { listDevices } from '@/lib/api/devices';
import { listRooms } from '@/lib/api/rooms';
import { ApiClientError, fetchAPI } from '@/lib/api/client';
import { useInstallerMode } from '@/context/InstallerModeContext';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/context/InstallerModeContext', () => ({
  useInstallerMode: jest.fn(() => ({ installerMode: false, setInstallerMode: jest.fn() })),
}));

jest.mock('@/components/layout/TopBar', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock('@/components/notifications/NotificationCenter', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/hooks/useProjectId', () => ({
  useProjectId: jest.fn(),
}));

jest.mock('@/context/ProjectContext', () => ({
  useProject: () => ({ setProjectId: jest.fn() }),
}));

jest.mock('@/lib/api/devices', () => ({
  listDevices: jest.fn(),
}));

jest.mock('@/lib/api/rooms', () => ({
  listRooms: jest.fn(),
}));

jest.mock('@/lib/api/client', () => ({
  ApiClientError: class ApiClientError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  fetchAPI: jest.fn(),
}));

const mockedUseProjectId = useProjectId as jest.MockedFunction<typeof useProjectId>;
const mockedUseInstallerMode = useInstallerMode as jest.MockedFunction<typeof useInstallerMode>;
const mockedListDevices = listDevices as jest.MockedFunction<typeof listDevices>;
const mockedListRooms = listRooms as jest.MockedFunction<typeof listRooms>;
const mockedFetchAPI = fetchAPI as jest.MockedFunction<typeof fetchAPI>;

describe('Dashboard device inventory flow', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedUseProjectId.mockReturnValue('proj-1');
    mockedUseInstallerMode.mockReturnValue({ installerMode: false, setInstallerMode: jest.fn() });
    mockedFetchAPI.mockResolvedValue({
      hostname: 'hub-pc',
      platform: 'win32',
      arch: 'x64',
      uptime_s: 120,
      memory_mb: 1024,
      adapters: 2,
      active_adapters: 1,
    });
    mockedListRooms.mockResolvedValue([]);
  });

  it('renders the house state section when devices resolve', async () => {
    mockedListDevices.mockResolvedValue([
      {
        id: 'dev-1',
        project_id: 'proj-1',
        name: 'FGMS-001',
        protocol: 'zwave',
        online: true,
        state: { temperature: 22.4, lux: 180, motion: false },
      } as never,
    ]);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Stato Casa')).toBeInTheDocument();
    });
  });

  it('hides project banner for normal user when projectId is missing', () => {
    mockedUseProjectId.mockReturnValue(undefined);

    render(<DashboardPage />);

    expect(screen.queryByText('Seleziona un progetto.')).not.toBeInTheDocument();
    expect(mockedListDevices).not.toHaveBeenCalled();
  });

  it('shows home unavailable when inventory loading fails', async () => {
    mockedListDevices.mockRejectedValue(new ApiClientError('hub error', 502));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Casa non raggiungibile')).toBeInTheDocument();
    });
  });

  // Fino al 24/10/2026 «Ieri» leggeva gli ultimi 500 eventi del device '3',
  // scritto nel codice: 500 eventi coprivano 9 ore, e ieri non arrivava mai.
  it('«Ieri» legge le letture di ogni sensore nel giorno di ieri, senza un device scritto nel codice', async () => {
    mockedListDevices.mockResolvedValue([
      { id: 'dev-1', project_id: 'proj-1', name: 'Sensore', protocol: 'zwave', online: true, state: {} } as never,
    ]);
    mockedFetchAPI.mockImplementation(async (url: string) => {
      if (url.includes('sensor.temperature.changed')) {
        return { events: [
          { payload: { sensor_key: 'temperature', sensor_value: 23.9 } },
          { payload: { sensor_key: 'temperature', sensor_value: 24.4 } },
        ] } as never;
      }
      if (url.includes('sensor.lux.changed')) {
        return { events: [{ payload: { sensor_key: 'lux', sensor_value: 155 } }] } as never;
      }
      return {} as never;
    });

    render(<DashboardPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ieri' }));

    await waitFor(() => {
      expect(screen.getByText('23.9–24.4°')).toBeInTheDocument();
    });
    expect(screen.getByText('155')).toBeInTheDocument();

    const storici = mockedFetchAPI.mock.calls.map(([u]) => String(u)).filter((u) => u.includes('/history/'));
    expect(storici).toHaveLength(2);
    for (const u of storici) {
      expect(u).toMatch(/^\/api\/hub\/history\/proj-1\?event_type=sensor\.(temperature|lux)\.changed&from=.+&to=.+/);
      expect(u).not.toContain('/device/');
    }
  });

  it('«Ieri» con lo storico illeggibile lo dice, non mostra «nessun dato»', async () => {
    mockedListDevices.mockResolvedValue([]);
    mockedFetchAPI.mockImplementation(async (url: string) => {
      if (url.includes('/history/')) throw new ApiClientError('hub error', 502);
      return {} as never;
    });

    render(<DashboardPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ieri' }));

    await waitFor(() => {
      expect(screen.getByText('Non riesco a leggere lo storico di ieri.')).toBeInTheDocument();
    });
  });
});
