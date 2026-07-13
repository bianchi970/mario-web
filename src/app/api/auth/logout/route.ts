import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 *
 * Chiama Hub /auth/logout (revoca tutti i refresh token dell'utente),
 * poi svuota i cookie locali mario_hub_token e mario_hub_refresh.
 */

const HUB_URL            = process.env.HUB_URL            || 'http://localhost:4001';
const REMOTE_BRIDGE_URL  = process.env.REMOTE_BRIDGE_URL  || '';
const BRIDGE_RELAY_TOKEN = process.env.BRIDGE_RELAY_TOKEN || '';

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get('mario_hub_token')?.value;

  // Chiama Hub logout (best-effort, non blocca se fallisce)
  if (accessToken && process.env.REMOTE_AUTH_MODE === 'true') {
    try {
      if (REMOTE_BRIDGE_URL) {
        await fetch(`${REMOTE_BRIDGE_URL}/relay`, {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${BRIDGE_RELAY_TOKEN}`,
          },
          body: JSON.stringify({
            method:  'POST',
            path:    '/api/hub/auth/logout',
            headers: {
              'content-type':  'application/json',
              'authorization': `Bearer ${accessToken}`,
            },
            body: '{}',
          }),
          signal: AbortSignal.timeout(3000),
        });
      } else {
        await fetch(`${HUB_URL}/api/hub/auth/logout`, {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          signal: AbortSignal.timeout(3000),
        });
      }
    } catch { /* best-effort */ }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('mario_hub_token',   '', { maxAge: 0, path: '/' });
  res.cookies.set('mario_hub_refresh', '', { maxAge: 0, path: '/' });
  return res;
}
