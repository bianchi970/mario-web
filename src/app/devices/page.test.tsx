import { render, screen, waitFor } from '@testing-library/react';
import DevicesPage from '@/app/devices/page';
import { useProjectId } from '@/hooks/useProjectId';
import { listDevices } from '@/lib/api/devices';
import { listRooms } from '@/lib/api/rooms';

jest.mock('@/components/layout/TopBar', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock('@/components/devices/DeviceList', () => ({
  __esModule: true,
  default: ({ devices }: { devices: Array<{ name: string }> }) => (
    <div>{devices.map((device) => device.name).join(', ')}</div>
  ),
}));

jest.mock('@/hooks/useProjectId', () => ({
  useProjectId: jest.fn(),
}));

jest.mock('@/lib/api/devices', () => ({
  listDevices: jest.fn(),
}));

jest.mock('@/lib/api/rooms', () => ({
  listRooms: jest.fn(),
}));

const mockedUseProjectId = useProjectId as jest.MockedFunction<typeof useProjectId>;
const mockedListDevices = listDevices as jest.MockedFunction<typeof listDevices>;
const mockedListRooms = listRooms as jest.MockedFunction<typeof listRooms>;

describe('DevicesPage data flow', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    mockedListRooms.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads devices when projectId is present', async () => {
    mockedUseProjectId.mockReturnValue('proj-1');
    mockedListDevices.mockResolvedValue([
      {
        id: 'dev-1',
        project_id: 'proj-1',
        name: 'Luce cucina',
        type: 'light',
        protocol: 'zigbee',
        capabilities: [],
        state: {},
        online: true,
        created_at: '2026-04-12T10:00:00Z',
      },
    ] as never);

    render(<DevicesPage />);

    await waitFor(() => {
      expect(screen.getByText('Luce cucina')).toBeInTheDocument();
    });

    expect(mockedListDevices).toHaveBeenCalledTimes(1);
    expect(mockedListDevices.mock.calls[0][0]).toBe('proj-1');
  });

  it('blocks the UI when projectId is missing', () => {
    mockedUseProjectId.mockReturnValue(undefined);

    render(<DevicesPage />);

    expect(screen.getByText('Seleziona un progetto.')).toBeInTheDocument();
    expect(mockedListDevices).not.toHaveBeenCalled();
  });

  it('shows hub unavailable when the hub proxy fails', async () => {
    mockedUseProjectId.mockReturnValue('proj-1');
    mockedListDevices.mockRejectedValue(new Error('HUB_UNAVAILABLE'));

    render(<DevicesPage />);

    await waitFor(() => {
      expect(screen.getByText('Hub non disponibile')).toBeInTheDocument();
    });
  });
});
