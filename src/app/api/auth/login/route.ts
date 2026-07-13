import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/login
 *
 * Delega l'autenticazione al Hub. Il Hub è l'unica autorità su credenziali e ruoli.
 * Salva due cookie httpOnly:
 *   - mario_hub_token   : access token (15min JWT)
 *   - mario_hub_refresh : refresh token (30d opaque)
 *
 * Attivo solo se REMOTE_AUTH_MODE=true.
 */

const HUB_URL            = process.env.HUB_URL            || 'http://localhost:4001';
const REMOTE_BRIDGE_URL  = process.env.REMOTE_BRIDGE_URL  || '';
const BRIDGE_RELAY_TOKEN = process.env.BRIDGE_RELAY_TOKEN || '';
const IS_PROD = process.env.NODE_ENV === 'production';

type HubLoginData = {
  success: boolean;
  data: {
    access_token?: string;
    token?: string;          // alias backward compat
    refresh_token?: string;
    role?: string;
    username?: string;
    project_id?: string | null;
    must_change_password?: boolean;
  };
};

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

  let hubData: HubLoginData['data'];
  try {
    let hubRes: Response;
    if (REMOTE_BRIDGE_URL) {
      hubRes = await fetch(`${REMOTE_BRIDGE_URL}/relay`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${BRIDGE_RELAY_TOKEN}`,
        },
        body: JSON.stringify({
          method:  'POST',
          path:    '/api/hub/auth/login',
          headers: { 'content-type': 'application/json' },
          body:    JSON.stringify({ username, password }),
        }),
        signal: AbortSignal.timeout(8000),
      });
    } else {
      hubRes = await fetch(`${HUB_URL}/api/hub/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
        signal:  AbortSignal.timeout(5000),
      });
    }

    if (!hubRes.ok) {
      const isAuthError = hubRes.status === 401 || hubRes.status === 400;
      return NextResponse.json(
        { error: isAuthError ? 'invalid_credentials' : 'hub_error' },
        { status: isAuthError ? 401 : 502 },
      );
    }

    const parsed = await hubRes.json() as HubLoginData;
    hubData = parsed.data;
    const accessToken = hubData?.access_token ?? hubData?.token;
    if (!accessToken) {
      return NextResponse.json({ error: 'hub_error' }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: 'hub_unreachable' }, { status: 502 });
  }

  const accessToken   = hubData.access_token ?? hubData.token ?? '';
  const refreshToken  = hubData.refresh_token ?? '';

  const res = NextResponse.json({ ok: true });

  // Access token — durata cookie 1h (il JWT stesso scade prima in 15m)
  res.cookies.set('mario_hub_token', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure:   IS_PROD,
    maxAge:   60 * 60,
    path:     '/',
  });

  // Refresh token — durata cookie 30 giorni
  if (refreshToken) {
    res.cookies.set('mario_hub_refresh', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure:   IS_PROD,
      maxAge:   30 * 24 * 60 * 60,
      path:     '/',
    });
  }

  return res;
}
