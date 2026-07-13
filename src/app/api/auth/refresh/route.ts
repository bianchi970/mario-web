import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/refresh
 *
 * Legge il refresh token dal cookie mario_hub_refresh,
 * chiama Hub /api/hub/auth/refresh, e imposta i nuovi cookie.
 * In caso di fallimento svuota entrambi i cookie.
 */

const HUB_URL            = process.env.HUB_URL            || 'http://localhost:4001';
const REMOTE_BRIDGE_URL  = process.env.REMOTE_BRIDGE_URL  || '';
const BRIDGE_RELAY_TOKEN = process.env.BRIDGE_RELAY_TOKEN || '';
const IS_PROD = process.env.NODE_ENV === 'production';

export async function POST(req: NextRequest) {
  if (process.env.REMOTE_AUTH_MODE !== 'true') {
    return NextResponse.json({ error: 'auth_disabled' }, { status: 404 });
  }

  const refreshToken = req.cookies.get('mario_hub_refresh')?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'no_refresh_token' }, { status: 401 });
  }

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
          path:    '/api/hub/auth/refresh',
          headers: { 'content-type': 'application/json' },
          body:    JSON.stringify({ refresh_token: refreshToken }),
        }),
        signal: AbortSignal.timeout(5000),
      });
    } else {
      hubRes = await fetch(`${HUB_URL}/api/hub/auth/refresh`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refresh_token: refreshToken }),
        signal:  AbortSignal.timeout(5000),
      });
    }

    if (!hubRes.ok) {
      // Refresh fallito — svuota entrambi i cookie
      const res = NextResponse.json({ error: 'refresh_failed' }, { status: 401 });
      res.cookies.set('mario_hub_token',   '', { maxAge: 0, path: '/' });
      res.cookies.set('mario_hub_refresh', '', { maxAge: 0, path: '/' });
      return res;
    }

    const parsed = await hubRes.json() as {
      success: boolean;
      data?: { access_token?: string; refresh_token?: string };
    };
    const newAccess  = parsed.data?.access_token;
    const newRefresh = parsed.data?.refresh_token;
    if (!parsed.success || !newAccess) {
      return NextResponse.json({ error: 'refresh_failed' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set('mario_hub_token', newAccess, {
      httpOnly: true,
      sameSite: 'lax',
      secure:   IS_PROD,
      maxAge:   60 * 60,
      path:     '/',
    });
    if (newRefresh) {
      res.cookies.set('mario_hub_refresh', newRefresh, {
        httpOnly: true,
        sameSite: 'lax',
        secure:   IS_PROD,
        maxAge:   30 * 24 * 60 * 60,
        path:     '/',
      });
    }
    return res;
  } catch {
    return NextResponse.json({ error: 'hub_unreachable' }, { status: 502 });
  }
}
