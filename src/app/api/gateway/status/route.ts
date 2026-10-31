/**
 * GET /api/gateway/status
 *
 * Stato del gateway MARIO — per un monitor esterno (oggi nessuno la chiama).
 * Non richiede auth (per permettere health check anche senza sessione).
 *
 * Risposta:
 * {
 *   mode: "local" | "remote",
 *   web: true,
 *   hub: boolean,
 *   bridge: boolean,   // true solo in modalità remote
 *   ts: ISO string
 * }
 *
 * L'Hub si raggiunge da `hub-client`, che sa già scegliere la strada (diretta
 * in casa, relay dal VPS): fino al 31/10/2026 qui ce n'era una seconda copia.
 */

import { NextResponse } from 'next/server';
import { getHealth } from '@/lib/hub-client';

const REMOTE_BRIDGE_URL = process.env.REMOTE_BRIDGE_URL || '';
const MODE = REMOTE_BRIDGE_URL ? 'remote' : 'local';

export async function GET() {
  const [hub, bridge] = await Promise.all([
    getHealth().then(() => true, () => false),
    MODE === 'remote' ? checkBridge() : Promise.resolve(null),
  ]);

  return NextResponse.json({
    mode:   MODE,
    web:    true,
    hub,
    bridge: bridge ?? undefined,
    ts:     new Date().toISOString(),
  });
}

async function checkBridge(): Promise<boolean> {
  try {
    const res = await fetch(`${REMOTE_BRIDGE_URL}/status`, {
      signal: AbortSignal.timeout(3_000),
      cache:  'no-store',
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.agent_connected === true;
  } catch {
    return false;
  }
}
