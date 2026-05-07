import { NextRequest, NextResponse } from 'next/server';
import {
  requireScenarioAuthorization,
  resolveScenarioProjectId,
  scenarioAuthHeaders,
  scenarioProxyErrorStatus,
  scenarioUpstreamUnavailableResponse,
  toScenarioProxyError,
} from '../../_project-bootstrap';

const BRAIN_URL = process.env.BRAIN_URL || 'http://localhost:4000';

export async function POST(
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
        `${BRAIN_URL}/projects/${encodeURIComponent(projectId)}/automations/${encodeURIComponent(scenarioId)}/run`,
        {
          method: 'POST',
          headers: scenarioAuthHeaders(req),
          signal: AbortSignal.timeout(3000),
        },
      );
    } catch {
      return scenarioUpstreamUnavailableResponse();
    }

    const data = await upstream.json().catch(() => ({ status: 'error', error: 'invalid_json' }));
    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    const message = toScenarioProxyError(error).message;
    if (message === 'UPSTREAM_UNAVAILABLE') return scenarioUpstreamUnavailableResponse();
    return NextResponse.json({ status: 'error', error: message }, { status: scenarioProxyErrorStatus(message) });
  }
}
