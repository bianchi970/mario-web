/**
 * middleware.ts — Auth guard per MARIO Web in modalità online.
 *
 * Attivo SOLO se REMOTE_AUTH_MODE=true.
 * In locale (Pi): variabile non impostata → passa tutto, zero overhead.
 *
 * Cookie: mario_hub_token = JWT firmato dal Hub (HS256, JWT_SECRET).
 * Il Hub è l'unica autorità su credenziali e ruoli.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const REMOTE_AUTH_MODE = process.env.REMOTE_AUTH_MODE === 'true';
const JWT_SECRET       = process.env.JWT_SECRET ?? '';

// Route pubbliche anche in online mode
const PUBLIC_PREFIXES = [
  '/login',
  '/api/auth/',
  '/api/gateway/status',
  '/_next/',
  '/favicon.ico',
  '/mario-ca.crt',
  '/manifest',        // manifest.json / manifest.webmanifest
  '/sw.js',           // service worker
  '/icons/',          // icone PWA
  '/screenshots/',    // screenshot PWA
  '/apple-touch-icon',
];

export async function middleware(request: NextRequest) {
  // Modalità locale: passa tutto
  if (!REMOTE_AUTH_MODE) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Route pubbliche
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Verifica JWT Hub
  const token = request.cookies.get('mario_hub_token')?.value ?? '';
  if (token && JWT_SECRET) {
    const { valid, mustChange } = await verifyJWT(token, JWT_SECRET);
    if (valid) {
      // Deve cambiare password → blocca tutto tranne /change-password
      if (mustChange && !pathname.startsWith('/change-password')) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'must_change_password' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/change-password', request.url));
      }
      return NextResponse.next();
    }
  }

  // Chiamate API private → 401 JSON
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Pagine → redirect a /login
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

// ── JWT HS256 verify (Web Crypto API — Edge runtime) ─────────────────────────
// Il Hub firma con jsonwebtoken HS256. Verifichiamo senza librerie esterne.

async function verifyJWT(token: string, secret: string): Promise<{ valid: boolean; mustChange: boolean }> {
  const FAIL = { valid: false, mustChange: false };
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
    if (!ok) return FAIL;

    const payload = JSON.parse(
      new TextDecoder().decode(base64urlDecode(parts[1]))
    ) as { exp?: number; must_change_password?: boolean };
    if (payload.exp && payload.exp * 1000 < Date.now()) return FAIL;

    return { valid: true, mustChange: payload.must_change_password === true };
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
