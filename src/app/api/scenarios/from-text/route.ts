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

export async function POST(req: NextRequest) {
  try {
    requireScenarioAuthorization(req);
    const body = await req.json().catch(() => ({}));
    const projectId = await resolveScenarioProjectId(req, body.projectId || null);

    let upstream;
    try {
      upstream = await fetch(
        `${BRAIN_URL}/projects/${encodeURIComponent(projectId)}/automations/from-text`,
        {
          method: 'POST',
          headers: scenarioAuthHeaders(req, true),
          body: JSON.stringify({ text: body.text || '' }),
          cache: 'no-store',
        },
      );
    } catch (error) {
      return scenarioUpstreamUnavailableResponse();
    }

    const data = await upstream.json().catch(() => ({
      success: false,
      status: 'error',
      error: 'invalid_json',
    }));

    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    const message = toScenarioProxyError(error).message;
    if (message === 'UPSTREAM_UNAVAILABLE') {
      return scenarioUpstreamUnavailableResponse();
    }
    return NextResponse.json(
      { success: false, status: 'error', error: message },
      { status: scenarioProxyErrorStatus(message) },
    );
  }
}
