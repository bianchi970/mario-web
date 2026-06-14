import { render, screen, waitFor } from '@testing-library/react';
import RoomsPage from '@/app/rooms/page';
import { useProjectId } from '@/hooks/useProjectId';
import { listRooms } from '@/lib/api/rooms';

jest.mock('@/components/layout/TopBar', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock('@/components/rooms/RoomGrid', () => ({
  __esModule: true,
  default: ({ rooms }: { rooms: Array<{ name: string }> }) => (
    <div>{rooms.map((room) => room.name).join(', ')}</div>
  ),
}));

jest.mock('@/hooks/useProjectId', () => ({
  useProjectId: jest.fn(),
}));

jest.mock('@/lib/api/rooms', () => ({
  listRooms: jest.fn(),
}));

const mockedUseProjectId = useProjectId as jest.MockedFunction<typeof useProjectId>;
const mockedListRooms = listRooms as jest.MockedFunction<typeof listRooms>;

describe('RoomsPage data flow', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('loads rooms when projectId is present', async () => {
    mockedUseProjectId.mockReturnValue('proj-1');
    mockedListRooms.mockResolvedValue([
      {
        id: 'room-1',
        project_id: 'proj-1',
        name: 'Cucina',
        created_at: '2026-04-12T10:00:00Z',
      },
    ] as never);

    render(<RoomsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cucina')).toBeInTheDocument();
    });

    expect(mockedListRooms).toHaveBeenCalledTimes(1);
    expect(mockedListRooms.mock.calls[0][0]).toBe('proj-1');
  });

  it('blocks the UI when projectId is missing', () => {
    mockedUseProjectId.mockReturnValue(undefined);

    render(<RoomsPage />);

    expect(screen.getByText('Impianto non configurato.')).toBeInTheDocument();
    expect(mockedListRooms).not.toHaveBeenCalled();
  });

  it('shows hub unavailable when the hub proxy fails', async () => {
    mockedUseProjectId.mockReturnValue('proj-1');
    mockedListRooms.mockRejectedValue(new Error('HUB_UNAVAILABLE'));

    render(<RoomsPage />);

    await waitFor(() => {
      expect(screen.getByText('Hub non disponibile')).toBeInTheDocument();
    });
  });
});
