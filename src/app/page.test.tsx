import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '@/app/page';
import { useProjectId } from '@/hooks/useProjectId';
import { listDevices } from '@/lib/api/devices';
import { listRooms } from '@/lib/api/rooms';
import { ApiClientError, fetchAPI } from '@/lib/api/client';

jest.mock('@/components/layout/TopBar', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock('@/components/dashboard/StatsRow', () => ({
  __esModule: true,
  default: () => <div>stats-row</div>,
}));

jest.mock('@/components/dashboard/EventFeed', () => ({
  __esModule: true,
  default: () => <div>event-feed</div>,
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
const mockedListDevices = listDevices as jest.MockedFunction<typeof listDevices>;
const mockedListRooms = listRooms as jest.MockedFunction<typeof listRooms>;
const mockedFetchAPI = fetchAPI as jest.MockedFunction<typeof fetchAPI>;

describe('Dashboard device inventory flow', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedUseProjectId.mockReturnValue('proj-1');
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

  it('renders the device inventory when devices resolve', async () => {
    mockedListDevices.mockResolvedValue([
      {
        id: 'dev-1',
        project_id: 'proj-1',
        name: 'Kitchen Light',
        protocol: 'zigbee',
        online: true,
      } as never,
    ]);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Kitchen Light')).toBeInTheDocument();
    });
  });

  it('blocks the dashboard when projectId is missing', () => {
    mockedUseProjectId.mockReturnValue(undefined);

    render(<DashboardPage />);

    expect(screen.getByText('Seleziona un progetto.')).toBeInTheDocument();
    expect(mockedListDevices).not.toHaveBeenCalled();
  });

  it('shows hub unavailable when inventory loading fails', async () => {
    mockedListDevices.mockRejectedValue(new ApiClientError('hub error', 502));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Hub non disponibile')).toBeInTheDocument();
    });
  });
});
