/**
 * api/hub/[...path]/route.ts - Catch-all proxy to mario-hub.
 *
 * All client-side requests go to /api/hub/... (same origin, no CORS).
 * This route can forward browser auth when present, otherwise it can use
 * the server-side HUB_TOKEN. If that token is rejected, it retries once
 * without Authorization so local dev-mode Hub can surface real business errors.
 *
 * SSE passthrough: if Accept: text/event-stream, streams the hub response body.
 */

import { NextRequest, NextResponse } from 'next/server';

const HUB_URL = process.env.HUB_URL || 'http://localhost:4001';
const HUB_TOKEN = process.env.HUB_TOKEN || '';

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

function buildHubUrl(path: string[], req: NextRequest): string {
  const joined = path.join('/');
  const search = req.nextUrl.search;
  return `${HUB_URL}/api/hub/${joined}${search}`;
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

async function fetchHub(
  req: NextRequest,
  path: string[],
  authMode: 'server' | 'passthrough' | 'none',
  body: BodyInit | undefined,
): Promise<Response> {
  const targetUrl = buildHubUrl(path, req);

  return fetch(targetUrl, {
    method: req.method,
    headers: hubHeaders(req.headers, authMode),
    body,
    // Required for streaming body in Next.js
    // @ts-expect-error duplex is valid for streaming but not in all TS types
    duplex: 'half',
  });
}

async function proxyRequest(req: NextRequest, path: string[]): Promise<Response> {
  const isSSE = req.headers.get('accept') === 'text/event-stream';
  const hasIncomingAuth = !!req.headers.get('authorization');

  const firstAuthMode = hasIncomingAuth ? 'passthrough' : 'server';
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.from(await req.arrayBuffer());

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

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    return await proxyRequest(req, params.path);
  } catch {
    return upstreamUnavailableResponse();
  }
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    return await proxyRequest(req, params.path);
  } catch {
    return upstreamUnavailableResponse();
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    return await proxyRequest(req, params.path);
  } catch {
    return upstreamUnavailableResponse();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    return await proxyRequest(req, params.path);
  } catch {
    return upstreamUnavailableResponse();
  }
}
