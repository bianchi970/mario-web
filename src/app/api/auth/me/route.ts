import { NextRequest, NextResponse } from 'next/server';
import { authAttiva } from '@/lib/auth-mode';
import { getMe } from '@/lib/hub-client';

/**
 * GET /api/auth/me
 *
 * Legge l'utente reale dal Hub tramite il JWT in cookie.
 * Con il login spento (REMOTE_AUTH_MODE=false, solo sviluppo): restituisce ruolo admin sintetico
 * così che la UI di gestione utenti sia accessibile anche in locale.
 *
 * Il Hub rimane l'autorità — questo endpoint è solo un relay. La strada verso
 * l'Hub (diretta in casa, il ponte dal VPS) la sceglie `hub-client`: fino al
 * 7/11/2026 qui si chiedeva sempre a HUB_URL, e dal VPS la risposta era «nessuno».
 */

const NESSUNO = { id: null, username: null, role: null, project_id: null };

export async function GET(req: NextRequest) {
  // Login spento (solo sviluppo) → admin sintetico
  if (!authAttiva()) {
    return NextResponse.json({ id: 'local', username: 'local', role: 'admin', project_id: null });
  }

  const token = req.cookies.get('mario_hub_token')?.value;
  if (!token) return NextResponse.json(NESSUNO);

  try {
    return NextResponse.json((await getMe(token)) ?? NESSUNO);
  } catch {
    return NextResponse.json(NESSUNO);
  }
}
