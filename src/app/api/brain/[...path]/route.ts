/**
 * api/brain/[...path]/route.ts — Proxy to mario-brain.
 * Uses BRAIN_URL + BRAIN_TOKEN from env.
 */

import { NextRequest, NextResponse } from 'next/server';

const BRAIN_URL   = process.env.BRAIN_URL   || 'http://localhost:4000';
const BRAIN_TOKEN = process.env.BRAIN_TOKEN || '';

function unavailable() {
  return NextResponse.json(
    { error: 'Brain non raggiungibile' },
    { status: 502 },
  );
}

function buildBrainUrl(path: string[], req: NextRequest): string {
  return `${BRAIN_URL}/api/brain/${path.join('/')}${req.nextUrl.search}`;
}

async function proxy(req: NextRequest, path: string[]): Promise<Response> {
  const body = ['GET', 'HEAD'].includes(req.method)
    ? undefined
    : Buffer.from(await req.arrayBuffer());

  // Forward the user JWT cookie as Bearer so Brain can authenticate
  const userToken = req.cookies.get('mario_hub_token')?.value || BRAIN_TOKEN;

  const upstreamRes = await fetch(buildBrainUrl(path, req), {
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

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  try { return await proxy(req, params.path); }
  catch { return unavailable(); }
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  try { return await proxy(req, params.path); }
  catch { return unavailable(); }
}
