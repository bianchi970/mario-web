import { NextRequest, NextResponse } from 'next/server';

const BRAIN_URL = process.env.BRAIN_URL || 'http://localhost:4000';
const BRAIN_TOKEN = process.env.BRAIN_TOKEN || '';

function authHeaders(req: NextRequest): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const authorization = req.headers.get('authorization');
  if (authorization) {
    headers.authorization = authorization;
  } else if (BRAIN_TOKEN) {
    headers.authorization = `Bearer ${BRAIN_TOKEN}`;
  }
  return headers;
}

function upstreamUnavailable() {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: {
        code: 'UPSTREAM_UNAVAILABLE',
        message: 'Brain non raggiungibile',
        source: 'web-system-proxy',
      },
    },
    { status: 502 },
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  try {
    const upstream = await fetch(`${BRAIN_URL}/api/system/offline`, {
      method: 'POST',
      headers: authHeaders(req),
      body: JSON.stringify({ offline: body?.offline === true }),
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });

    const data = await upstream.json().catch(() => ({ offline: body?.offline === true }));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return upstreamUnavailable();
  }
}
