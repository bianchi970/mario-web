/**
 * middleware.ts — Auth guard per MARIO Web in modalità online.
 *
 * Attivo SOLO se REMOTE_AUTH_MODE=true.
 * In locale (Pi): variabile non impostata → passa tutto, zero overhead.
 *
 * Cookie: mario_session=<timestamp>:<hmac-sha256>
 * Scadenza: 30 giorni.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const REMOTE_AUTH_MODE = process.env.REMOTE_AUTH_MODE === 'true';
const AUTH_SECRET      = process.env.AUTH_SECRET ?? '';

// Route pubbliche anche in online mode
const PUBLIC_PREFIXES = [
  '/login',
  '/api/auth/',
  '/api/gateway/status',
  '/_next/',
  '/favicon.ico',
  '/mario-ca.crt',
];

export async function middleware(request: NextRequest) {
  // Modalità locale: passa tutto
  if (!REMOTE_AUTH_MODE) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Route pubbliche
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Verifica sessione
  const token = request.cookies.get('mario_session')?.value ?? '';
  if (token && AUTH_SECRET && await verifyToken(token, AUTH_SECRET)) {
    return NextResponse.next();
  }

  // Chiamate API private → 401 JSON (non redirect)
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Pagine → redirect a /login
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

// ── HMAC verify (Web Crypto API — Edge runtime) ─────────────────────────────

async function verifyToken(token: string, secret: string): Promise<boolean> {
  try {
    const sep = token.lastIndexOf(':');
    if (sep < 1) return false;

    const tsStr = token.slice(0, sep);
    const mac   = token.slice(sep + 1);
    const ts    = parseInt(tsStr, 10);

    if (isNaN(ts)) return false;
    // 30 giorni in ms
    if (Date.now() - ts > 30 * 24 * 60 * 60 * 1000) return false;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const sigBytes = hexToBytes(mac);
    return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(tsStr));
  } catch {
    return false;
  }
}

function hexToBytes(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer as ArrayBuffer;
}

// ── Matcher: tutto tranne _next/static ─────────────────────────────────────

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
