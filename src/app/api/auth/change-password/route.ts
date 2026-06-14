import { NextRequest, NextResponse } from 'next/server';

/**
 * PATCH /api/auth/change-password
 *
 * Proxy verso Hub PATCH /api/hub/auth/change-password.
 * Richiede il cookie mario_hub_token (utente già autenticato).
 * Il Hub resetta must_change_password e restituisce un nuovo JWT.
 * Aggiorna il cookie con il nuovo token.
 */

const HUB_URL            = process.env.HUB_URL            || 'http://localhost:4001';
const REMOTE_BRIDGE_URL  = process.env.REMOTE_BRIDGE_URL  || '';
const BRIDGE_RELAY_TOKEN = process.env.BRIDGE_RELAY_TOKEN || '';
const IS_PROD = process.env.NODE_ENV === 'production';

export async function PATCH(req: NextRequest) {
  if (process.env.REMOTE_AUTH_MODE !== 'true') {
    return NextResponse.json({ error: 'auth_disabled' }, { status: 404 });
  }

  const hubToken = req.cookies.get('mario_hub_token')?.value ?? '';
  if (!hubToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { current_password?: string; new_password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { current_password, new_password } = body;
  if (!current_password || !new_password) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  let newToken: string;
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
          method:  'PATCH',
          path:    '/api/hub/auth/change-password',
          headers: {
            'content-type':  'application/json',
            'authorization': `Bearer ${hubToken}`,
          },
          body: JSON.stringify({ current_password, new_password }),
        }),
        signal: AbortSignal.timeout(8000),
      });
    } else {
      hubRes = await fetch(`${HUB_URL}/api/hub/auth/change-password`, {
        method:  'PATCH',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${hubToken}`,
        },
        body:   JSON.stringify({ current_password, new_password }),
        signal: AbortSignal.timeout(5000),
      });
    }

    if (!hubRes.ok) {
      const data = await hubRes.json().catch(() => ({})) as { error?: { code?: string } };
      const code = data?.error?.code ?? '';
      if (code === 'INVALID_CREDENTIALS') {
        return NextResponse.json({ error: 'wrong_current_password' }, { status: 401 });
      }
      if (code === 'WEAK_PASSWORD') {
        return NextResponse.json({ error: 'weak_password' }, { status: 400 });
      }
      return NextResponse.json({ error: 'hub_error' }, { status: 502 });
    }

    const data = await hubRes.json() as { success: boolean; data: { token: string } };
    newToken = data.data?.token;
    if (!newToken) {
      return NextResponse.json({ error: 'hub_error' }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: 'hub_unreachable' }, { status: 502 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('mario_hub_token', newToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure:   IS_PROD,
    maxAge:   30 * 24 * 60 * 60,
    path:     '/',
  });
  return res;
}
