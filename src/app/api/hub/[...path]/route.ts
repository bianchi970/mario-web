/**
 * api/hub/[...path]/route.ts — Catch-all proxy to mario-hub.
 *
 * All client-side requests go to /api/hub/... (same origin, no CORS).
 * This route adds Authorization: Bearer HUB_TOKEN and forwards to the real hub.
 * HUB_TOKEN stays server-side, never exposed to the browser.
 *
 * SSE passthrough: if Accept: text/event-stream, streams the hub response body.
 */

import { NextRequest, NextResponse } from 'next/server';

const HUB_URL   = process.env.HUB_URL   || 'http://localhost:4001';
const HUB_TOKEN = process.env.HUB_TOKEN || '';

function buildHubUrl(path: string[], req: NextRequest): string {
  const joined = path.join('/');
  const search = req.nextUrl.search;
  return `${HUB_URL}/api/hub/${joined}${search}`;
}

function hubHeaders(incoming: Headers): HeadersInit {
  const out: Record<string, string> = {};
  // Forward content-type for POST/PATCH
  const ct = incoming.get('content-type');
  if (ct) out['content-type'] = ct;
  // Accept forwarded for SSE
  const accept = incoming.get('accept');
  if (accept) out['accept'] = accept;
  // Inject hub token
  if (HUB_TOKEN) out['authorization'] = `Bearer ${HUB_TOKEN}`;
  return out;
}

async function proxyRequest(req: NextRequest, path: string[]): Promise<Response> {
  const targetUrl = buildHubUrl(path, req);
  const isSSE = req.headers.get('accept') === 'text/event-stream';

  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : req.body;

  const upstreamRes = await fetch(targetUrl, {
    method:  req.method,
    headers: hubHeaders(req.headers),
    body,
    // Required for streaming body in Next.js
    // @ts-expect-error — duplex is valid for streaming but not in all TS types
    duplex: 'half',
  });

  if (isSSE && upstreamRes.body) {
    // Stream SSE directly without buffering
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  // Normal response — forward as-is
  const responseBody = await upstreamRes.text();
  return new NextResponse(responseBody, {
    status:  upstreamRes.status,
    headers: { 'Content-Type': upstreamRes.headers.get('content-type') || 'application/json' },
  });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  try { return await proxyRequest(req, params.path); }
  catch (err) { return NextResponse.json({ error: String(err) }, { status: 502 }); }
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  try { return await proxyRequest(req, params.path); }
  catch (err) { return NextResponse.json({ error: String(err) }, { status: 502 }); }
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  try { return await proxyRequest(req, params.path); }
  catch (err) { return NextResponse.json({ error: String(err) }, { status: 502 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  try { return await proxyRequest(req, params.path); }
  catch (err) { return NextResponse.json({ error: String(err) }, { status: 502 }); }
}
