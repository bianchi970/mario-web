/**
 * api/brain/[...path]/route.ts — Proxy to mario-brain.
 *
 * Local mode  (BRAIN_URL set, no REMOTE_BRIDGE_URL):
 *   Calls Brain directly via BRAIN_URL.
 *
 * Remote mode (REMOTE_BRIDGE_URL set):
 *   Routes through the Hub relay bridge → Hub → Hub brain proxy → Brain.
 *   Uses /api/hub/brain/* path so Hub forwards to Brain locally on the Pi.
 */

import { NextRequest, NextResponse } from 'next/server';

const BRAIN_URL          = process.env.BRAIN_URL          || 'http://localhost:4000';
const BRAIN_TOKEN        = process.env.BRAIN_TOKEN        || '';
const REMOTE_BRIDGE_URL  = process.env.REMOTE_BRIDGE_URL  || '';
const BRIDGE_RELAY_TOKEN = process.env.BRIDGE_RELAY_TOKEN || '';
const HUB_TOKEN          = process.env.HUB_TOKEN          || '';
const HUB_ID             = process.env.HUB_ID             || '';

function unavailable() {
  return NextResponse.json({ error: 'Brain non raggiungibile' }, { status: 502 });
}

async function proxyLocal(req: NextRequest, path: string[]): Promise<Response> {
  const body      = ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.from(await req.arrayBuffer());
  const userToken = req.cookies.get('mario_hub_token')?.value || BRAIN_TOKEN;

  const upstreamRes = await fetch(`${BRAIN_URL}/api/brain/${path.join('/')}${req.nextUrl.search}`, {
    method:  req.method,
    headers: {
      'content-type':  req.headers.get('content-type') || 'application/json',
      'authorization': `Bearer ${userToken}`,
    },
    body,
    // @ts-expect-error duplex required for streaming body
    duplex: 'half',
    signal: AbortSignal.timeout(15_000),
  });

  const responseBody = await upstreamRes.text();
  return new NextResponse(responseBody, {
    status:  upstreamRes.status,
    headers: { 'Content-Type': upstreamRes.headers.get('content-type') || 'application/json' },
  });
}

async function proxyBridge(req: NextRequest, path: string[]): Promise<Response> {
  // Route through bridge relay → Hub → Hub brain proxy (/brain/*) → Brain
  const hubPath  = `/api/hub/brain/${path.join('/')}${req.nextUrl.search}`;
  const bodyText = ['GET', 'HEAD'].includes(req.method) ? null : await req.text();
  const userToken = req.cookies.get('mario_hub_token')?.value || '';

  const relayPayload: Record<string, unknown> = {
    method:  req.method,
    path:    hubPath,
    headers: {
      'content-type':  req.headers.get('content-type') || 'application/json',
      'authorization': userToken ? `Bearer ${userToken}` : HUB_TOKEN ? `Bearer ${HUB_TOKEN}` : '',
    },
    body: bodyText,
  };
  if (HUB_ID) relayPayload.hub_id = HUB_ID;

  const relayRes = await fetch(`${REMOTE_BRIDGE_URL}/relay`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${BRIDGE_RELAY_TOKEN}`,
    },
    body:   JSON.stringify(relayPayload),
    signal: AbortSignal.timeout(18_000),
  });

  const responseBody = await relayRes.text();
  return new NextResponse(responseBody, {
    status:  relayRes.status,
    headers: { 'Content-Type': relayRes.headers.get('content-type') || 'application/json' },
  });
}

async function proxy(req: NextRequest, path: string[]): Promise<Response> {
  if (REMOTE_BRIDGE_URL) return proxyBridge(req, path);
  return proxyLocal(req, path);
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  try { return await proxy(req, params.path); }
  catch { return unavailable(); }
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  try { return await proxy(req, params.path); }
  catch { return unavailable(); }
}
