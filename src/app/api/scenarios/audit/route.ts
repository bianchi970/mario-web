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

type Automation = {
  id: string;
  name?: string;
};

type AuditRow = {
  automation_id: string;
  result?: 'triggered' | 'skipped' | 'blocked' | 'executed';
  error?: string | null;
  ts?: string | null;
};

export async function GET(req: NextRequest) {
  try {
    requireScenarioAuthorization(req);
    const projectId = await resolveScenarioProjectId(req, req.nextUrl.searchParams.get('projectId'));
    const headers = scenarioAuthHeaders(req);

    let logRes;
    let listRes;
    try {
      [logRes, listRes] = await Promise.all([
        fetch(`${BRAIN_URL}/projects/${encodeURIComponent(projectId)}/automations/log`, {
          method: 'GET',
          headers,
          cache: 'no-store',
        }),
        fetch(`${BRAIN_URL}/projects/${encodeURIComponent(projectId)}/automations`, {
          method: 'GET',
          headers,
          cache: 'no-store',
        }),
      ]);
    } catch (error) {
      return scenarioUpstreamUnavailableResponse();
    }

    const [logRows, automations] = await Promise.all([
      logRes.json().catch(() => []),
      listRes.json().catch(() => []),
    ]);

    const nameById = new Map(
      (Array.isArray(automations) ? automations : []).map((item: Automation) => [item.id, item.name || item.id]),
    );

    const items = (Array.isArray(logRows) ? logRows : []).map((item: AuditRow) => ({
      scenario_id: item.automation_id,
      scenario_name: nameById.get(item.automation_id),
      status: item.result || 'blocked',
      reason: item.error || null,
      executed_at: item.ts || null,
    }));

    return NextResponse.json(items, { status: logRes.ok ? 200 : logRes.status });
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
