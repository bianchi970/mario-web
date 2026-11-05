import { render, screen, waitFor } from '@testing-library/react';
import DevicePage from '@/app/devices/[id]/page';
import { getDevice } from '@/lib/api/devices';

// La scheda di un device con le capability COME LE MANDA L'HUB: oggetti con
// `key`, `label`, `actions` per quasi tutti, stringhe solo per qualcuno (il
// sensore gas). Fino al 5/11/2026 la scheda le disegnava come stringhe (`{c}`):
// con un oggetto React si ferma, e la scheda di un relè non si apriva.

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '2-ep1' }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/components/layout/TopBar', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));
jest.mock('@/components/devices/CommandButton', () => ({ __esModule: true, default: () => null }));
jest.mock('@/hooks/useProjectId', () => ({ useProjectId: () => 'default' }));
jest.mock('@/lib/api/devices', () => ({ getDevice: jest.fn() }));
jest.mock('@/lib/api/rooms', () => ({ listRooms: jest.fn().mockResolvedValue([]) }));
jest.mock('@/lib/api/client', () => ({ fetchAPI: jest.fn() }));

const mockedGetDevice = getDevice as jest.MockedFunction<typeof getDevice>;

describe('la scheda di un device', () => {
  it('mostra le capability che l\'Hub manda come oggetti, con il loro nome', async () => {
    mockedGetDevice.mockResolvedValue({
      id: '2-ep1', project_id: 'default', name: 'Luce Cucina', type: 'switch_relay', protocol: 'zwave',
      online: true, state: {}, created_at: '2026-10-01',
      capabilities: [{ key: 'on_off', label: 'On/Off', actions: [
        { key: 'turn_on', label: 'Accendi', type: 'command' }, { key: 'turn_off', label: 'Spegni', type: 'command' }] }],
    } as never);
    render(<DevicePage />);
    await waitFor(() => expect(screen.getByText('On/Off')).toBeInTheDocument());
  });

  it('e anche quelle che arrivano come parole', async () => {
    mockedGetDevice.mockResolvedValue({
      id: '2-ep1', project_id: 'default', name: 'Sensore Gas Caldaia', type: 'sensor', protocol: 'http',
      online: true, state: {}, created_at: '2026-10-01', capabilities: ['gas', 'sensor'],
    } as never);
    render(<DevicePage />);
    await waitFor(() => expect(screen.getByText('gas')).toBeInTheDocument());
  });
});
