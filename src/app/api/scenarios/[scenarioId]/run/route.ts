import { NextRequest, NextResponse } from 'next/server';

const HUB_URL            = process.env.HUB_URL            || 'http://localhost:4001';
const HUB_TOKEN          = process.env.HUB_TOKEN          || '';
const REMOTE_BRIDGE_URL  = process.env.REMOTE_BRIDGE_URL  || '';
const BRIDGE_RELAY_TOKEN = process.env.BRIDGE_RELAY_TOKEN || '';
const HUB_ID             = process.env.HUB_ID             || '';

export async function POST(
  req: NextRequest,
  context: { params: { scenarioId: string } }
) {
  const { scenarioId } = context.params;
  const projectId = req.nextUrl.searchParams.get('projectId') || '';
  if (!projectId) {
    return NextResponse.json({ status: 'error', error: 'project_id_required' }, { status: 400 });
  }

  const userToken = req.cookies.get('mario_hub_token')?.value || '';
  const auth = userToken ? `Bearer ${userToken}` : HUB_TOKEN ? `Bearer ${HUB_TOKEN}` : '';
  const hubPath = `/api/hub/automations/${encodeURIComponent(projectId)}/${encodeURIComponent(scenarioId)}/run`;

  try {
    let upstream: Response;
    if (REMOTE_BRIDGE_URL) {
      const relayPayload: Record<string, unknown> = {
        method: 'POST',
        path: hubPath,
        headers: { 'content-type': 'application/json', authorization: auth },
        body: null,
      };
      if (HUB_ID) relayPayload.hub_id = HUB_ID;
      upstream = await fetch(`${REMOTE_BRIDGE_URL}/relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BRIDGE_RELAY_TOKEN}` },
        body: JSON.stringify(relayPayload),
        signal: AbortSignal.timeout(10_000),
      });
    } else {
      upstream = await fetch(`${HUB_URL}${hubPath}`, {
        method: 'POST',
        headers: { authorization: auth, 'content-type': 'application/json' },
        signal: AbortSignal.timeout(8_000),
      });
    }
    const data = await upstream.json().catch(() => ({ status: 'error', error: 'invalid_json' }));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ status: 'error', error: 'hub_unavailable' }, { status: 502 });
  }
}
