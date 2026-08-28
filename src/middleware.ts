/**
 * middleware.ts — Auth guard per MARIO Web in modalità online.
 *
 * Attivo SOLO se REMOTE_AUTH_MODE=true.
 * In locale (Pi): variabile non impostata → passa tutto, zero overhead.
 *
 * Cookie: mario_hub_token   = JWT access token (15min) firmato dal Hub
 *         mario_hub_refresh = refresh token opaco (30d), usato per rotazione
 *
 * Flusso su JWT scaduto:
 *   1. Verifica JWT → scaduto ma firma valida → tryRefresh()
 *   2. tryRefresh chiama Hub /api/hub/auth/refresh via bridge/diretto
 *   3. Se OK → imposta nuovi cookie e continua la richiesta originale
 *   4. Se fallisce → redirect /login?expired=1 (pagine) o 401 (API)
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const REMOTE_AUTH_MODE = process.env.REMOTE_AUTH_MODE === 'true';
const JWT_SECRET       = process.env.JWT_SECRET ?? '';
const IS_PROD          = process.env.NODE_ENV === 'production';

// Route pubbliche anche in online mode
const PUBLIC_PREFIXES = [
  '/login',
  '/api/auth/',
  '/api/hub/auth/',
  '/api/gateway/status',
  '/api/brain/status',
  '/_next/',
  '/favicon.ico',
  '/mario-ca.crt',
  '/manifest',
  '/sw.js',
  '/icons/',
  '/screenshots/',
  '/apple-touch-icon',
  '/.well-known/',
  '/logo-mario.png',
];

export async function middleware(request: NextRequest) {
  if (!REMOTE_AUTH_MODE) return NextResponse.next();

  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('mario_hub_token')?.value ?? '';
  if (token && JWT_SECRET) {
    const { valid, mustChange, expired } = await verifyJWT(token, JWT_SECRET);

    if (valid) {
      if (mustChange && !pathname.startsWith('/change-password')) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'must_change_password' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/change-password', request.url));
      }
      return NextResponse.next();
    }

    if (expired) {
      // JWT scaduto → prova a refreshare
      const refreshed = await tryRefresh(request);
      if (refreshed) {
        const response = NextResponse.next();
        response.cookies.set('mario_hub_token', refreshed.newToken, {
          httpOnly: true,
          sameSite: 'lax',
          secure:   IS_PROD,
          maxAge:   60 * 60,
          path:     '/',
        });
        response.cookies.set('mario_hub_refresh', refreshed.newRefresh, {
          httpOnly: true,
          sameSite: 'lax',
          secure:   IS_PROD,
          maxAge:   30 * 24 * 60 * 60,
          path:     '/',
        });
        return response;
      }
      // Refresh fallito → sessione scaduta
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'token_expired' }, { status: 401 });
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('expired', '1');
      return NextResponse.redirect(loginUrl);
    }
  }

  // Token assente o firma non valida
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

// ── Auto-refresh ──────────────────────────────────────────────────────────────

async function tryRefresh(
  request: NextRequest
): Promise<{ newToken: string; newRefresh: string } | null> {
  const refreshToken = request.cookies.get('mario_hub_refresh')?.value;
  if (!refreshToken) return null;

  const HUB_URL     = process.env.HUB_URL            || 'http://localhost:4001';
  const BRIDGE_URL  = process.env.REMOTE_BRIDGE_URL  || '';
  const BRIDGE_TOK  = process.env.BRIDGE_RELAY_TOKEN || '';

  try {
    let res: Response;
    if (BRIDGE_URL) {
      res = await fetch(`${BRIDGE_URL}/relay`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${BRIDGE_TOK}`,
        },
        body: JSON.stringify({
          method:  'POST',
          path:    '/api/hub/auth/refresh',
          headers: { 'content-type': 'application/json' },
          body:    JSON.stringify({ refresh_token: refreshToken }),
        }),
        signal: AbortSignal.timeout(3000),
      });
    } else {
      res = await fetch(`${HUB_URL}/api/hub/auth/refresh`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refresh_token: refreshToken }),
        signal:  AbortSignal.timeout(3000),
      });
    }

    if (!res.ok) return null;
    const data = await res.json() as {
      success: boolean;
      data?: { access_token?: string; refresh_token?: string };
    };
    const newToken   = data.data?.access_token;
    const newRefresh = data.data?.refresh_token;
    if (!data.success || !newToken || !newRefresh) return null;
    return { newToken, newRefresh };
  } catch {
    return null;
  }
}

// ── JWT HS256 verify (Web Crypto API — Edge runtime) ─────────────────────────

async function verifyJWT(
  token: string,
  secret: string
): Promise<{ valid: boolean; mustChange: boolean; expired: boolean }> {
  const FAIL = { valid: false, mustChange: false, expired: false };
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return FAIL;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const sigInput = encoder.encode(`${parts[0]}.${parts[1]}`);
    const sigBytes = base64urlDecode(parts[2]);
    const ok       = await crypto.subtle.verify('HMAC', key, sigBytes, sigInput);
    if (!ok) return FAIL;  // firma non valida → non provare refresh

    const payload = JSON.parse(
      new TextDecoder().decode(base64urlDecode(parts[1]))
    ) as { exp?: number; must_change_password?: boolean };

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      // Firma valida ma token scaduto → candidato per refresh
      return { valid: false, mustChange: false, expired: true };
    }

    return { valid: true, mustChange: payload.must_change_password === true, expired: false };
  } catch {
    return FAIL;
  }
}

function base64urlDecode(b64url: string): ArrayBuffer {
  const b64  = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad  = b64.length % 4 === 0 ? 0 : 4 - (b64.length % 4);
  const raw  = atob(b64 + '='.repeat(pad));
  const buf  = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer as ArrayBuffer;
}

// ── Matcher ──────────────────────────────────────────────────────────────────

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
