import { NextRequest, NextResponse } from 'next/server';

const BRAIN_URL          = process.env.BRAIN_URL          || 'http://localhost:4000';
const BRAIN_TOKEN        = process.env.BRAIN_TOKEN        || '';
const REMOTE_BRIDGE_URL  = process.env.REMOTE_BRIDGE_URL  || '';
const BRIDGE_RELAY_TOKEN = process.env.BRIDGE_RELAY_TOKEN || '';
const HUB_TOKEN          = process.env.HUB_TOKEN          || '';
const HUB_ID             = process.env.HUB_ID             || '';

type RouteContext = { params: Promise<{ projectId: string; sceneId: string }> };

function unavailable() {
  return NextResponse.json({ error: 'Brain non raggiungibile' }, { status: 502 });
}

async function proxyLocal(req: NextRequest, projectId: string, sceneId: string): Promise<Response> {
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text();
  const upstream = await fetch(
    `${BRAIN_URL}/projects/${encodeURIComponent(projectId)}/scenes/${encodeURIComponent(sceneId)}`,
    {
      method: req.method,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${BRAIN_TOKEN}`,
      },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    },
  );
  const data = await upstream.json().catch(() => null);
  return NextResponse.json(data, { status: upstream.status });
}

async function proxyBridge(req: NextRequest, projectId: string, sceneId: string): Promise<Response> {
  const bodyText = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text();
  const relayPayload: Record<string, unknown> = {
    method: req.method,
    path: `/api/hub/brain/projects/${encodeURIComponent(projectId)}/scenes/${encodeURIComponent(sceneId)}`,
    headers: { 'content-type': 'application/json', authorization: HUB_TOKEN ? `Bearer ${HUB_TOKEN}` : '' },
    body: bodyText,
  };
  if (HUB_ID) relayPayload.hub_id = HUB_ID;
  const upstream = await fetch(`${REMOTE_BRIDGE_URL}/relay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BRIDGE_RELAY_TOKEN}` },
    body: JSON.stringify(relayPayload),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await upstream.json().catch(() => null);
  return NextResponse.json(data, { status: upstream.status });
}

async function handle(req: NextRequest, ctx: RouteContext): Promise<Response> {
  const { projectId, sceneId } = await ctx.params;
  try {
    return REMOTE_BRIDGE_URL
      ? proxyBridge(req, projectId, sceneId)
      : proxyLocal(req, projectId, sceneId);
  } catch {
    return unavailable();
  }
}

export const GET    = handle;
export const PATCH  = handle;
export const DELETE = handle;
