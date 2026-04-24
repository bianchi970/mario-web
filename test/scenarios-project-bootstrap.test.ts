if (!(global as { Request?: unknown }).Request) {
  (global as { Request?: unknown }).Request = class Request {};
}

if (!(global as { Response?: unknown }).Response) {
  (global as { Response?: unknown }).Response = class Response {};
}

if (!(global as { Headers?: unknown }).Headers) {
  (global as { Headers?: unknown }).Headers = class Headers {};
}

const {
  AUTH_FORBIDDEN,
  AUTH_REQUIRED,
  NO_ACTIVE_PROJECT,
  PROJECT_NOT_FOUND,
  UPSTREAM_UNAVAILABLE,
  requireScenarioAuthorization,
  resolveScenarioProjectId,
  scenarioProxyErrorStatus,
  scenarioAuthHeaders,
} = require('@/app/api/scenarios/_project-bootstrap');

function makeRequest(url = 'http://localhost:3000/api/scenarios') {
  return {
    headers: {
      get: (_key: string) => null,
    },
    nextUrl: new URL(url),
  } as never;
}

describe('scenarios project bootstrap', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.BRAIN_TOKEN = 'test-brain-token';
  });

  afterEach(() => {
    delete process.env.BRAIN_TOKEN;
  });

  test('returns first project when no explicit project is provided', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'proj-1', name: 'Demo project' }],
    }) as never;

    await expect(resolveScenarioProjectId(makeRequest(), null)).resolves.toBe('proj-1');
  });

  test('throws NO_ACTIVE_PROJECT when there are no projects', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }) as never;

    await expect(resolveScenarioProjectId(makeRequest(), null)).rejects.toThrow(NO_ACTIVE_PROJECT);
  });

  test('keeps explicit valid project', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'proj-2' }),
    }) as never;

    await expect(resolveScenarioProjectId(makeRequest(), 'proj-2')).resolves.toBe('proj-2');
  });

  test('throws PROJECT_NOT_FOUND for explicit invalid project', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'project not found' }),
    }) as never;

    await expect(resolveScenarioProjectId(makeRequest(), 'missing-project')).rejects.toThrow(PROJECT_NOT_FOUND);
  });

  test('throws AUTH_REQUIRED when BRAIN_TOKEN is not set', () => {
    delete process.env.BRAIN_TOKEN;
    expect(() => requireScenarioAuthorization(makeRequest())).toThrow(AUTH_REQUIRED);
  });

  test('scenarioAuthHeaders uses server-side BRAIN_TOKEN', () => {
    expect(scenarioAuthHeaders(makeRequest())).toEqual({
      accept: 'application/json',
      authorization: 'Bearer test-brain-token',
    });
  });

  test('throws AUTH_REQUIRED when project lookup is unauthorized upstream', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'missing token' }),
    }) as never;

    await expect(resolveScenarioProjectId(makeRequest(), null)).rejects.toThrow(AUTH_REQUIRED);
  });

  test('throws AUTH_FORBIDDEN when explicit project lookup is forbidden', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'forbidden' }),
    }) as never;

    await expect(resolveScenarioProjectId(makeRequest(), 'proj-3')).rejects.toThrow(AUTH_FORBIDDEN);
  });

  test('throws UPSTREAM_UNAVAILABLE when project bootstrap fetch fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed')) as never;

    await expect(resolveScenarioProjectId(makeRequest(), null)).rejects.toThrow(UPSTREAM_UNAVAILABLE);
  });

  test('maps UPSTREAM_UNAVAILABLE to 502', () => {
    expect(scenarioProxyErrorStatus(UPSTREAM_UNAVAILABLE)).toBe(502);
  });
});
