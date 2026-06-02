import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/login
 *
 * Delega l'autenticazione al Hub. Il Hub è l'unica autorità su credenziali e ruoli.
 * Il JWT del Hub viene salvato in mario_hub_token (httpOnly).
 * Nessun HMAC locale — una sola identità.
 *
 * Attivo solo se REMOTE_AUTH_MODE=true.
 */

const HUB_URL = process.env.HUB_URL || 'http://localhost:4001';
const IS_PROD = process.env.NODE_ENV === 'production';

export async function POST(req: NextRequest) {
  if (process.env.REMOTE_AUTH_MODE !== 'true') {
    return NextResponse.json({ error: 'auth_disabled' }, { status: 404 });
  }

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { username, password } = body;
  if (!username || !password) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  let hubToken: string;
  try {
    const hubRes = await fetch(`${HUB_URL}/api/hub/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password }),
      signal:  AbortSignal.timeout(5000),
    });

    if (!hubRes.ok) {
      const isAuthError = hubRes.status === 401 || hubRes.status === 400;
      return NextResponse.json(
        { error: isAuthError ? 'invalid_credentials' : 'hub_error' },
        { status: isAuthError ? 401 : 502 },
      );
    }

    const data = await hubRes.json() as { success: boolean; data: { token: string } };
    hubToken = data.data?.token;
    if (!hubToken) {
      return NextResponse.json({ error: 'hub_error' }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: 'hub_unreachable' }, { status: 502 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('mario_hub_token', hubToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure:   IS_PROD,
    maxAge:   30 * 24 * 60 * 60, // 30 giorni
    path:     '/',
  });
  return res;
}
