import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const AUTH_PASSWORD = process.env.REMOTE_AUTH_PASSWORD ?? '';
const AUTH_SECRET   = process.env.AUTH_SECRET ?? '';
const IS_PROD       = process.env.NODE_ENV === 'production';

export async function POST(req: NextRequest) {
  if (process.env.REMOTE_AUTH_MODE !== 'true') {
    return NextResponse.json({ error: 'auth_disabled' }, { status: 404 });
  }
  if (!AUTH_PASSWORD || !AUTH_SECRET) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (body.password !== AUTH_PASSWORD) {
    // Ritardo costante per evitare timing attack
    await new Promise((r) => setTimeout(r, 300));
    return NextResponse.json({ error: 'wrong_password' }, { status: 401 });
  }

  const token = createToken(AUTH_SECRET);
  const maxAge = 30 * 24 * 60 * 60; // 30 giorni in secondi

  const res = NextResponse.json({ ok: true });
  res.cookies.set('mario_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure:   IS_PROD,
    maxAge,
    path: '/',
  });
  return res;
}

function createToken(secret: string): string {
  const ts  = Date.now().toString();
  const mac = crypto.createHmac('sha256', secret).update(ts).digest('hex');
  return `${ts}:${mac}`;
}
