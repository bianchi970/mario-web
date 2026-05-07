import { NextResponse, type NextRequest } from 'next/server';

const BRAIN_URL = process.env.BRAIN_URL || 'http://localhost:4000';

type ProjectRecord = {
  id: string;
};

export const NO_ACTIVE_PROJECT = 'NO_ACTIVE_PROJECT';
export const PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND';
export const AUTH_REQUIRED = 'AUTH_REQUIRED';
export const AUTH_FORBIDDEN = 'AUTH_FORBIDDEN';
export const PROJECT_LOOKUP_FAILED = 'PROJECT_LOOKUP_FAILED';
export const UPSTREAM_UNAVAILABLE = 'UPSTREAM_UNAVAILABLE';

export function requireScenarioAuthorization(_req: NextRequest): string {
  const token = process.env.BRAIN_TOKEN || '';
  if (!token) throw new Error(AUTH_REQUIRED);
  return `Bearer ${token}`;
}

export function scenarioAuthHeaders(_req: NextRequest, withJson = false): HeadersInit {
  const token = process.env.BRAIN_TOKEN || '';
  if (!token) throw new Error(AUTH_REQUIRED);
  return {
    accept: 'application/json',
    ...(withJson ? { 'content-type': 'application/json' } : {}),
    authorization: `Bearer ${token}`,
  };
}

function classifyBootstrapFailure(status: number): string {
  if (status === 401) return AUTH_REQUIRED;
  if (status === 403) return AUTH_FORBIDDEN;
  return PROJECT_LOOKUP_FAILED;
}

export function scenarioProxyErrorStatus(message: string): number {
  if (message === AUTH_REQUIRED) return 401;
  if (message === AUTH_FORBIDDEN) return 403;
  if (message === NO_ACTIVE_PROJECT || message === PROJECT_NOT_FOUND) return 400;
  return 502;
}

export function isScenarioUpstreamUnavailable(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof Error && error.message === 'fetch failed');
}

export function toScenarioProxyError(error: unknown): Error {
  if (isScenarioUpstreamUnavailable(error)) {
    return new Error(UPSTREAM_UNAVAILABLE);
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error('proxy_failed');
}

export function scenarioUpstreamUnavailableResponse() {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: {
        code: UPSTREAM_UNAVAILABLE,
        message: 'Brain non raggiungibile',
        source: 'web-scenarios-proxy',
      },
    },
    { status: 502 },
  );
}

async function listProjects(req: NextRequest): Promise<ProjectRecord[]> {
  let upstream;
  try {
    upstream = await fetch(`${BRAIN_URL}/projects`, {
      method: 'GET',
      headers: scenarioAuthHeaders(req),
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
  } catch (error) {
    throw toScenarioProxyError(error);
  }

  if (!upstream.ok) {
    throw new Error(classifyBootstrapFailure(upstream.status));
  }

  const data = await upstream.json().catch(() => []);
  return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
}

async function projectExists(req: NextRequest, projectId: string): Promise<boolean> {
  let upstream;
  try {
    upstream = await fetch(`${BRAIN_URL}/projects/${encodeURIComponent(projectId)}`, {
      method: 'GET',
      headers: scenarioAuthHeaders(req),
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
  } catch (error) {
    throw toScenarioProxyError(error);
  }

  if (!upstream.ok && upstream.status !== 404) {
    throw new Error(classifyBootstrapFailure(upstream.status));
  }

  return upstream.ok;
}

export async function resolveScenarioProjectId(
  req: NextRequest,
  explicitProjectId?: string | null,
): Promise<string> {
  const candidate = explicitProjectId?.trim();

  if (candidate) {
    if (await projectExists(req, candidate)) {
      return candidate;
    }
    throw new Error(PROJECT_NOT_FOUND);
  }

  const projects = await listProjects(req);
  const firstProject = projects.find((project) => typeof project?.id === 'string' && project.id.trim());

  if (!firstProject) {
    throw new Error(NO_ACTIVE_PROJECT);
  }

  return firstProject.id;
}
