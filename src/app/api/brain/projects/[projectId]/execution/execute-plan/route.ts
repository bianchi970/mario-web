/**
 * B89 — Proxy: POST /api/brain/projects/:projectId/execution/execute-plan
 *
 * Local:  BRAIN_URL/projects/:id/execution/execute-plan
 * Bridge: /api/hub/brain/projects/:id/execution/execute-plan (via relay)
 */
import { NextRequest, NextResponse } from 'next/server';

const BRAIN_URL          = process.env.BRAIN_URL          || 'http://localhost:4000';
const BRAIN_TOKEN        = process.env.BRAIN_TOKEN        || '';
const REMOTE_BRIDGE_URL  = process.env.REMOTE_BRIDGE_URL  || '';
const BRIDGE_RELAY_TOKEN = process.env.BRIDGE_RELAY_TOKEN || '';
const HUB_TOKEN          = process.env.HUB_TOKEN          || '';
const HUB_ID             = process.env.HUB_ID             || '';

type RouteContext = { params: { projectId: string } };

function unavailable() {
  return NextResponse.json({ error: 'Brain non raggiungibile' }, { status: 502 });
}

async function proxyLocal(projectId: string, body: unknown): Promise<Response> {
  const res = await fetch(
    `${BRAIN_URL}/projects/${encodeURIComponent(projectId)}/execution/execute-plan`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization:  `Bearer ${BRAIN_TOKEN}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    },
  );
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
  });
}

async function proxyBridge(projectId: string, body: unknown): Promise<Response> {
  const relayPayload: Record<string, unknown> = {
    method: 'POST',
    path:   `/api/hub/brain/projects/${encodeURIComponent(projectId)}/execution/execute-plan`,
    headers: {
      'content-type': 'application/json',
      authorization:  HUB_TOKEN ? `Bearer ${HUB_TOKEN}` : '',
    },
    body: JSON.stringify(body),
  };
  if (HUB_ID) relayPayload.hub_id = HUB_ID;

  const res = await fetch(`${REMOTE_BRIDGE_URL}/relay`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${BRIDGE_RELAY_TOKEN}`,
    },
    body:   JSON.stringify(relayPayload),
    signal: AbortSignal.timeout(18_000),
  });
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
  });
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const body = await req.json().catch(() => ({}));
    if (REMOTE_BRIDGE_URL) return await proxyBridge(context.params.projectId, body);
    return await proxyLocal(context.params.projectId, body);
  } catch {
    return unavailable();
  }
}
