import { render, screen, waitFor } from '@testing-library/react';
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

jest.mock('@/lib/api/scenarios', () => ({
  listScenarios: jest.fn().mockResolvedValue([]),
  listScenarioAudit: jest.fn().mockResolvedValue([]),
  setScenarioEnabled: jest.fn().mockResolvedValue({ success: true }),
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
});
