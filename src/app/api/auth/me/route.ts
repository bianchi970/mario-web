import { NextRequest, NextResponse } from 'next/server';
import { authAttiva } from '@/lib/auth-mode';

/**
 * GET /api/auth/me
 *
 * Legge l'utente reale dal Hub tramite il JWT in cookie.
 * Con il login spento (REMOTE_AUTH_MODE=false, solo sviluppo): restituisce ruolo admin sintetico
 * così che la UI di gestione utenti sia accessibile anche in locale.
 *
 * Il Hub rimane l'autorità — questo endpoint è solo un relay.
 */

const HUB_URL = process.env.HUB_URL || 'http://localhost:4001';

export async function GET(req: NextRequest) {
  // Login spento (solo sviluppo) → admin sintetico
  if (!authAttiva()) {
    return NextResponse.json({ id: 'local', username: 'local', role: 'admin', project_id: null });
  }

  const token = req.cookies.get('mario_hub_token')?.value;
  if (!token) {
    return NextResponse.json({ id: null, username: null, role: null, project_id: null });
  }

  try {
    const hubRes = await fetch(`${HUB_URL}/api/hub/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal:  AbortSignal.timeout(3000),
    });
    if (!hubRes.ok) {
      return NextResponse.json({ id: null, username: null, role: null, project_id: null });
    }
    const data = await hubRes.json() as { success: boolean; data: { id: string; username: string; role: string; project_id: string | null } };
    return NextResponse.json(data.data ?? { id: null, username: null, role: null, project_id: null });
  } catch {
    return NextResponse.json({ id: null, username: null, role: null, project_id: null });
  }
}
