import { NextRequest, NextResponse } from 'next/server';
import {
  requireScenarioAuthorization,
  resolveScenarioProjectId,
  scenarioAuthHeaders,
  scenarioProxyErrorStatus,
  scenarioUpstreamUnavailableResponse,
  toScenarioProxyError,
} from './_project-bootstrap';

const BRAIN_URL = process.env.BRAIN_URL || 'http://localhost:4000';
const FORBIDDEN_FIELDS = ['actions', 'targets', 'protocol', 'vendor', 'adapter', 'driver'];

function assertNoRawPayload(payload: Record<string, unknown>) {
  for (const field of FORBIDDEN_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      throw new Error(`legacy_raw_scenarios_removed:${field}`);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    requireScenarioAuthorization(req);
    const body = await req.json().catch(() => ({}));
    assertNoRawPayload(body);
    const projectId = await resolveScenarioProjectId(req, body.projectId || null);

    let upstream;
    try {
      upstream = await fetch(`${BRAIN_URL}/projects/${encodeURIComponent(projectId)}/automations`, {
        method: 'POST',
        headers: scenarioAuthHeaders(req, true),
        body: JSON.stringify(body),
        cache: 'no-store',
      });
    } catch (error) {
      return scenarioUpstreamUnavailableResponse();
    }

    const data = await upstream
      .json()
      .catch(() => ({ success: false, status: 'error', error: 'invalid_json' }));

    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    const message = toScenarioProxyError(error).message;
    return NextResponse.json(
      { success: false, status: 'error', error: message },
      { status: message.startsWith('legacy_raw_scenarios_removed:') ? 400 : scenarioProxyErrorStatus(message) },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    requireScenarioAuthorization(req);
    const projectId = await resolveScenarioProjectId(req, req.nextUrl.searchParams.get('projectId'));

    let upstream;
    try {
      upstream = await fetch(`${BRAIN_URL}/projects/${encodeURIComponent(projectId)}/automations`, {
        method: 'GET',
        headers: scenarioAuthHeaders(req),
        cache: 'no-store',
      });
    } catch (error) {
      return scenarioUpstreamUnavailableResponse();
    }

    const data = await upstream.json().catch(() => []);
    const items = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

    return NextResponse.json(
      {
        success: upstream.ok,
        data: items,
        error: upstream.ok ? null : 'scenario_list_failed',
      },
      { status: upstream.status },
    );
  } catch (error) {
    const message = toScenarioProxyError(error).message;
    if (message === 'UPSTREAM_UNAVAILABLE') {
      return scenarioUpstreamUnavailableResponse();
    }
    return NextResponse.json(
      { success: false, data: [], error: message },
      { status: scenarioProxyErrorStatus(message) },
    );
  }
}
