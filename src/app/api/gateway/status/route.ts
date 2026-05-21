/**
 * GET /api/gateway/status
 *
 * Stato del gateway MARIO — usato dalla dashboard e da monitor esterni.
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
 */

import { NextResponse } from 'next/server';

const HUB_URL           = process.env.HUB_URL           || 'http://localhost:4001';
const HUB_TOKEN         = process.env.HUB_TOKEN         || '';
const REMOTE_BRIDGE_URL = process.env.REMOTE_BRIDGE_URL || '';
const BRIDGE_RELAY_TOKEN = process.env.BRIDGE_RELAY_TOKEN || '';
const MODE = REMOTE_BRIDGE_URL ? 'remote' : 'local';

export async function GET() {
  const [hub, bridge] = await Promise.all([
    checkHub(),
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

async function checkHub(): Promise<boolean> {
  try {
    if (REMOTE_BRIDGE_URL) {
      // In modalità remota: verifica tramite relay
      const res = await fetch(`${REMOTE_BRIDGE_URL}/relay`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${BRIDGE_RELAY_TOKEN}`,
        },
        body:   JSON.stringify({ method: 'GET', path: '/api/hub/health', headers: {}, body: null }),
        signal: AbortSignal.timeout(5_000),
      });
      return res.ok || res.status < 500;
    }
    // In modalità locale: chiamata diretta
    const headers: Record<string, string> = {};
    if (HUB_TOKEN) headers.authorization = `Bearer ${HUB_TOKEN}`;
    const res = await fetch(`${HUB_URL}/api/hub/health`, {
      headers,
      signal: AbortSignal.timeout(3_000),
      cache:  'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
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
