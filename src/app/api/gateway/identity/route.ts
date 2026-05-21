/**
 * GET /api/gateway/identity
 *
 * Identità del gateway locale. Combina:
 * - Info gateway da mario-hub (gateway_id, name, version)
 * - Stato hub e brain (reachable/unreachable)
 * - Versione mario-web
 *
 * Pubblica — nessuna auth richiesta (serve al Gateway Selector).
 */

import { NextResponse } from 'next/server';
import { version as webVersion } from '../../../../../package.json';

const HUB_URL    = process.env.HUB_URL    || 'http://localhost:4001';
const BRAIN_URL  = process.env.BRAIN_URL  || 'http://localhost:4000';
const HUB_TOKEN  = process.env.HUB_TOKEN  || '';
const BRAIN_TOKEN = process.env.BRAIN_TOKEN || '';

export async function GET() {
  const [hubIdentity, hubOk, brainOk] = await Promise.all([
    fetchHubIdentity(),
    checkHub(),
    checkBrain(),
  ]);

  return NextResponse.json({
    gateway_id: hubIdentity?.gateway_id ?? null,
    name:       hubIdentity?.name       ?? 'MARIO Gateway',
    mode:       'local',
    version:    {
      web: webVersion,
      hub: hubIdentity?.version ?? null,
    },
    hub:   hubOk   ? 'reachable' : 'unreachable',
    brain: brainOk ? 'reachable' : 'unreachable',
    ts:    new Date().toISOString(),
  });
}

async function fetchHubIdentity() {
  try {
    const headers: Record<string, string> = {};
    if (HUB_TOKEN) headers.authorization = `Bearer ${HUB_TOKEN}`;
    const res = await fetch(`${HUB_URL}/api/hub/gateway/identity`, {
      headers,
      signal: AbortSignal.timeout(3_000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json() as Promise<{ gateway_id: string; name: string; version: string }>;
  } catch {
    return null;
  }
}

async function checkHub(): Promise<boolean> {
  try {
    const headers: Record<string, string> = {};
    if (HUB_TOKEN) headers.authorization = `Bearer ${HUB_TOKEN}`;
    const res = await fetch(`${HUB_URL}/api/hub/health`, {
      headers, signal: AbortSignal.timeout(2_000), cache: 'no-store',
    });
    return res.ok;
  } catch { return false; }
}

async function checkBrain(): Promise<boolean> {
  try {
    const headers: Record<string, string> = {};
    if (BRAIN_TOKEN) headers.authorization = `Bearer ${BRAIN_TOKEN}`;
    const res = await fetch(`${BRAIN_URL}/api/system/status`, {
      headers, signal: AbortSignal.timeout(2_000), cache: 'no-store',
    });
    return res.ok;
  } catch { return false; }
}
