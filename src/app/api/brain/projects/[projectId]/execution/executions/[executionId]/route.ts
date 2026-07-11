/**
 * B89 — Proxy: GET /api/brain/projects/:projectId/execution/executions/:executionId
 *
 * Local:  BRAIN_URL/projects/:id/execution/executions/:executionId
 * Bridge: /api/hub/brain/projects/:id/execution/executions/:executionId (via relay)
 */
import { NextRequest, NextResponse } from 'next/server';

const BRAIN_URL          = process.env.BRAIN_URL          || 'http://localhost:4000';
const BRAIN_TOKEN        = process.env.BRAIN_TOKEN        || '';
const REMOTE_BRIDGE_URL  = process.env.REMOTE_BRIDGE_URL  || '';
const BRIDGE_RELAY_TOKEN = process.env.BRIDGE_RELAY_TOKEN || '';
const HUB_TOKEN          = process.env.HUB_TOKEN          || '';
const HUB_ID             = process.env.HUB_ID             || '';

type RouteContext = { params: { projectId: string; executionId: string } };

function unavailable() {
  return NextResponse.json({ error: 'Brain non raggiungibile' }, { status: 502 });
}

async function proxyLocal(projectId: string, executionId: string): Promise<Response> {
  const res = await fetch(
    `${BRAIN_URL}/projects/${encodeURIComponent(projectId)}/execution/executions/${encodeURIComponent(executionId)}`,
    {
      method: 'GET',
      headers: { authorization: `Bearer ${BRAIN_TOKEN}` },
      signal: AbortSignal.timeout(10_000),
    },
  );
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
  });
}

async function proxyBridge(projectId: string, executionId: string): Promise<Response> {
  const relayPayload: Record<string, unknown> = {
    method: 'GET',
    path:   `/api/hub/brain/projects/${encodeURIComponent(projectId)}/execution/executions/${encodeURIComponent(executionId)}`,
    headers: {
      authorization: HUB_TOKEN ? `Bearer ${HUB_TOKEN}` : '',
    },
  };
  if (HUB_ID) relayPayload.hub_id = HUB_ID;

  const res = await fetch(`${REMOTE_BRIDGE_URL}/relay`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${BRIDGE_RELAY_TOKEN}`,
    },
    body:   JSON.stringify(relayPayload),
    signal: AbortSignal.timeout(12_000),
  });
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
  });
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { projectId, executionId } = context.params;
    if (REMOTE_BRIDGE_URL) return await proxyBridge(projectId, executionId);
    return await proxyLocal(projectId, executionId);
  } catch {
    return unavailable();
  }
}
