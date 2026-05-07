import { NextRequest, NextResponse } from 'next/server';
import {
  requireScenarioAuthorization,
  resolveScenarioProjectId,
  scenarioAuthHeaders,
  scenarioProxyErrorStatus,
  scenarioUpstreamUnavailableResponse,
  toScenarioProxyError,
} from '../_project-bootstrap';

const BRAIN_URL = process.env.BRAIN_URL || 'http://localhost:4000';

export async function PATCH(
  req: NextRequest,
  context: { params: { scenarioId: string } }
) {
  try {
    requireScenarioAuthorization(req);
    const { scenarioId } = context.params;
    const projectId = await resolveScenarioProjectId(req, req.nextUrl.searchParams.get('projectId'));
    const body = await req.json().catch(() => ({}));

    let upstream;
    try {
      upstream = await fetch(
        `${BRAIN_URL}/projects/${encodeURIComponent(projectId)}/automations/${encodeURIComponent(scenarioId)}`,
        {
          method: 'PATCH',
          headers: scenarioAuthHeaders(req, true),
          body: JSON.stringify({ enabled: body?.enabled }),
          signal: AbortSignal.timeout(3000),
        },
      );
    } catch (error) {
      return scenarioUpstreamUnavailableResponse();
    }

    const data = await upstream.json().catch(() => ({
      success: false,
      error: 'invalid_json',
    }));

    return NextResponse.json(
      {
        success: upstream.ok,
        error: upstream.ok ? null : data?.error || 'scenario_update_failed',
      },
      { status: upstream.status },
    );
  } catch (error) {
    const message = toScenarioProxyError(error).message;
    if (message === 'UPSTREAM_UNAVAILABLE') {
      return scenarioUpstreamUnavailableResponse();
    }
    return NextResponse.json(
      { success: false, error: message },
      { status: scenarioProxyErrorStatus(message) },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: { scenarioId: string } }
) {
  try {
    requireScenarioAuthorization(req);
    const { scenarioId } = context.params;
    const projectId = await resolveScenarioProjectId(req, req.nextUrl.searchParams.get('projectId'));

    let upstream;
    try {
      upstream = await fetch(
        `${BRAIN_URL}/projects/${encodeURIComponent(projectId)}/automations/${encodeURIComponent(scenarioId)}`,
        {
          method: 'DELETE',
          headers: scenarioAuthHeaders(req),
          signal: AbortSignal.timeout(3000),
        },
      );
    } catch (error) {
      return scenarioUpstreamUnavailableResponse();
    }

    let data = null;
    if (upstream.status !== 204) {
      data = await upstream.json().catch(() => ({
        success: false,
        error: 'invalid_json',
      }));
    }

    return NextResponse.json(
      {
        success: upstream.ok,
        error: upstream.ok ? null : data?.error || 'scenario_delete_failed',
      },
      { status: upstream.ok ? 200 : upstream.status },
    );
  } catch (error) {
    const message = toScenarioProxyError(error).message;
    if (message === 'UPSTREAM_UNAVAILABLE') {
      return scenarioUpstreamUnavailableResponse();
    }
    return NextResponse.json(
      { success: false, error: message },
      { status: scenarioProxyErrorStatus(message) },
    );
  }
}
