/**
 * api/hub/[...path]/route.ts - Catch-all proxy to mario-hub.
 *
 * Modalità locale (default):
 *   Chiama HUB_URL direttamente (LAN Pi).
 *
 * Modalità remota (REMOTE_BRIDGE_URL impostato):
 *   Invia la richiesta al mario-remote-bridge via HTTP relay,
 *   che la inoltra al Pi via WebSocket outbound.
 *   Il Pi chiama mario-hub localmente e risponde.
 *
 * SSE passthrough: se Accept: text/event-stream, streamma il body hub.
 */

import { NextRequest, NextResponse } from 'next/server';

const HUB_URL           = process.env.HUB_URL            || 'http://localhost:4001';
const HUB_TOKEN         = process.env.HUB_TOKEN          || '';
const REMOTE_BRIDGE_URL = process.env.REMOTE_BRIDGE_URL  || '';
const BRIDGE_RELAY_TOKEN = process.env.BRIDGE_RELAY_TOKEN || '';

// ── Helpers ────────────────────────────────────────────────────────────────

function upstreamUnavailableResponse() {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: {
        code: 'UPSTREAM_UNAVAILABLE',
        message: 'Hub non raggiungibile',
        source: 'web-proxy',
      },
    },
    { status: 502 },
  );
}

function bridgeUnavailableResponse() {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: {
        code: 'BRIDGE_UNAVAILABLE',
        message: 'Pi non raggiungibile (bridge disconnesso)',
        source: 'remote-bridge',
      },
    },
    { status: 503 },
  );
}

function buildHubUrl(path: string[], req: NextRequest): string {
  return `${HUB_URL}/api/hub/${path.join('/')}${req.nextUrl.search}`;
}

function hubHeaders(
  incoming: Headers,
  authMode: 'server' | 'passthrough' | 'none' = 'server',
): HeadersInit {
  const out: Record<string, string> = {};
  const ct = incoming.get('content-type');
  if (ct) out['content-type'] = ct;

  const accept = incoming.get('accept');
  if (accept) out.accept = accept;

  const incomingAuthorization = incoming.get('authorization');
  if (authMode === 'passthrough' && incomingAuthorization) {
    out.authorization = incomingAuthorization;
  } else if (authMode === 'server' && HUB_TOKEN) {
    out.authorization = `Bearer ${HUB_TOKEN}`;
  }

  return out;
}

// ── Modalità locale ────────────────────────────────────────────────────────

async function fetchHub(
  req: NextRequest,
  path: string[],
  authMode: 'server' | 'passthrough' | 'none',
  body: BodyInit | undefined,
): Promise<Response> {
  return fetch(buildHubUrl(path, req), {
    method: req.method,
    headers: hubHeaders(req.headers, authMode),
    body,
    // @ts-expect-error duplex è necessario per streaming body
    duplex: 'half',
  });
}

async function proxyLocal(req: NextRequest, path: string[]): Promise<Response> {
  const isSSE = req.headers.get('accept') === 'text/event-stream';
  const hasIncomingAuth = !!req.headers.get('authorization');

  const firstAuthMode = hasIncomingAuth ? 'passthrough' : 'server';
  const body = ['GET', 'HEAD'].includes(req.method)
    ? undefined
    : Buffer.from(await req.arrayBuffer());

  let upstreamRes = await fetchHub(req, path, firstAuthMode, body);

  if (!hasIncomingAuth && HUB_TOKEN && (upstreamRes.status === 401 || upstreamRes.status === 403)) {
    upstreamRes = await fetchHub(req, path, 'none', body);
  }

  if (isSSE && upstreamRes.body) {
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  const responseBody = await upstreamRes.text();
  return new NextResponse(responseBody, {
    status: upstreamRes.status,
    headers: {
      'Content-Type': upstreamRes.headers.get('content-type') || 'application/json',
    },
  });
}

// ── Modalità remota (bridge) ───────────────────────────────────────────────

async function proxyBridge(req: NextRequest, path: string[]): Promise<Response> {
  const hubPath = `/api/hub/${path.join('/')}${req.nextUrl.search}`;

  const bodyText = ['GET', 'HEAD'].includes(req.method)
    ? null
    : await req.text();

  const relayPayload = {
    method:  req.method,
    path:    hubPath,
    headers: {
      'content-type':  req.headers.get('content-type')  || 'application/json',
      'authorization': HUB_TOKEN ? `Bearer ${HUB_TOKEN}` : '',
    },
    body: bodyText,
  };

  const relayRes = await fetch(`${REMOTE_BRIDGE_URL}/relay`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${BRIDGE_RELAY_TOKEN}`,
    },
    body:   JSON.stringify(relayPayload),
    signal: AbortSignal.timeout(12_000),
  });

  if (relayRes.status === 503) return bridgeUnavailableResponse();

  const responseBody = await relayRes.text();
  return new NextResponse(responseBody, {
    status:  relayRes.status,
    headers: {
      'Content-Type': relayRes.headers.get('content-type') || 'application/json',
    },
  });
}

// ── Dispatcher ─────────────────────────────────────────────────────────────

async function proxyRequest(req: NextRequest, path: string[]): Promise<Response> {
  if (REMOTE_BRIDGE_URL) {
    return proxyBridge(req, path);
  }
  return proxyLocal(req, path);
}

// ── Route handlers ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  try { return await proxyRequest(req, params.path); }
  catch { return REMOTE_BRIDGE_URL ? bridgeUnavailableResponse() : upstreamUnavailableResponse(); }
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  try { return await proxyRequest(req, params.path); }
  catch { return REMOTE_BRIDGE_URL ? bridgeUnavailableResponse() : upstreamUnavailableResponse(); }
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  try { return await proxyRequest(req, params.path); }
  catch { return REMOTE_BRIDGE_URL ? bridgeUnavailableResponse() : upstreamUnavailableResponse(); }
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  try { return await proxyRequest(req, params.path); }
  catch { return REMOTE_BRIDGE_URL ? bridgeUnavailableResponse() : upstreamUnavailableResponse(); }
}
