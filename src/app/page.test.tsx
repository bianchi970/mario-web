import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/page';
import {
  getDefaultProjectId,
  getDevices,
  getEvents,
  getRooms,
  getSystem,
} from '@/lib/hub-client';

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

jest.mock('@/lib/hub-client', () => ({
  getDefaultProjectId: jest.fn(),
  getDevices: jest.fn(),
  getEvents: jest.fn(),
  getRooms: jest.fn(),
  getSystem: jest.fn(),
}));

const mockedGetDefaultProjectId = getDefaultProjectId as jest.MockedFunction<typeof getDefaultProjectId>;
const mockedGetDevices = getDevices as jest.MockedFunction<typeof getDevices>;
const mockedGetEvents = getEvents as jest.MockedFunction<typeof getEvents>;
const mockedGetRooms = getRooms as jest.MockedFunction<typeof getRooms>;
const mockedGetSystem = getSystem as jest.MockedFunction<typeof getSystem>;

describe('Dashboard device inventory flow', () => {
  beforeEach(() => {
    mockedGetDefaultProjectId.mockReturnValue('default');
    mockedGetSystem.mockResolvedValue({
      hostname: 'hub-pc',
      platform: 'win32',
      arch: 'x64',
      uptime_s: 120,
      memory_mb: 1024,
      adapters: 2,
      active_adapters: 1,
      default_project_id: 'default',
    });
    mockedGetRooms.mockResolvedValue({ rooms: [] });
    mockedGetEvents.mockResolvedValue({ events: [] });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders the device inventory when devices resolve', async () => {
    mockedGetDevices.mockResolvedValue({
      project_id: 'default',
      devices: [
        {
          id: 'dev-1',
          name: 'Kitchen Light',
          protocol: 'zigbee',
          online: true,
        } as never,
      ],
    });

    render(await DashboardPage());

    expect(screen.getByText('Devices')).toBeInTheDocument();
    expect(screen.getByText('Kitchen Light')).toBeInTheDocument();
    expect(screen.queryByText('Device inventory not reachable.')).not.toBeInTheDocument();
  });

  it('shows the offline inventory state only when device loading fails', async () => {
    mockedGetDevices.mockRejectedValue(new Error('devices failed'));

    render(await DashboardPage());

    expect(screen.getByText('Device inventory not reachable.')).toBeInTheDocument();
  });
});
