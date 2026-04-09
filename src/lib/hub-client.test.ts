import { getDevices, getRooms } from './hub-client';

describe('hub-client devices/rooms requests', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete (global as typeof global & { fetch?: typeof fetch }).fetch;
    }
    jest.resetAllMocks();
  });

  it('unwraps enveloped devices payloads and preserves project id from meta', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          devices: [{ id: 'dev-1', name: 'Lamp' }],
          meta: { project_id: 'pc-project' },
        },
        error: null,
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    await expect(getDevices('default')).resolves.toEqual({
      devices: [{ id: 'dev-1', name: 'Lamp' }],
      project_id: 'pc-project',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4001/api/hub/projects/default/devices',
      expect.objectContaining({
        cache: 'no-store',
      })
    );
  });

  it('supports flat rooms payloads from legacy wrappers', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        rooms: [{ id: 'room-1', name: 'Living' }],
      }),
    }) as typeof fetch;

    await expect(getRooms('default')).resolves.toEqual({
      rooms: [{ id: 'room-1', name: 'Living' }],
    });
  });
});
