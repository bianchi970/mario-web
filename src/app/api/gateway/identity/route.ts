/**
 * GET /api/gateway/identity
 *
 * Identità del gateway. Combina:
 * - Info gateway da mario-hub (gateway_id, name, version)
 * - Stato hub e brain (reachable/unreachable)
 * - Versione mario-web
 *
 * Tutto passa da `hub-client`, che sa già scegliere la strada: diretta in
 * casa, il relay del bridge dal VPS. Fino al 31/10/2026 qui c'era una seconda
 * copia di quella scelta, che conosceva solo la prima: dal VPS chiedeva Hub e
 * Brain a localhost e diceva sempre «non raggiungibile» (visto il 25/10).
 */

import { NextResponse } from 'next/server';
import { version as webVersion } from '../../../../../package.json';
import { getGatewayIdentity, getHealth, getBrainSystemStatus, getAdapters } from '@/lib/hub-client';

const MODE = process.env.REMOTE_BRIDGE_URL ? 'remote' : 'local';

const prova = <T,>(p: Promise<T>): Promise<T | null> => p.catch(() => null);

export async function GET() {
  const [hubIdentity, health, brain, adapters] = await Promise.all([
    prova(getGatewayIdentity()),
    prova(getHealth()),
    prova(getBrainSystemStatus()),
    prova(getAdapters()),
  ]);

  // Z-Wave è attivo se la sua lingua VERA (non il banco `protocol:zwave`) lo è.
  const zWaveOk = adapters?.adapters?.some(
    (a) => /zwave/.test(a.adapter_id ?? '') && a.status === 'active',
  ) ?? false;

  return NextResponse.json({
    gateway_id: hubIdentity?.gateway_id ?? null,
    name:       hubIdentity?.name       ?? 'MARIO Gateway',
    mode:       MODE,
    version:    {
      web: webVersion,
      hub: hubIdentity?.version ?? null,
    },
    hub:    health   ? 'reachable' : 'unreachable',
    brain:  brain    ? 'reachable' : 'unreachable',
    z_wave: zWaveOk  ? 'active'    : 'inactive',
    ts:     new Date().toISOString(),
  });
}
