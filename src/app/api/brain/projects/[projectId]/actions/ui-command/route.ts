import { NextRequest, NextResponse } from 'next/server';

const BRAIN_URL = process.env.BRAIN_URL || 'http://localhost:4000';
const BRAIN_TOKEN = process.env.BRAIN_TOKEN || '';
const REMOTE_BRIDGE_URL = process.env.REMOTE_BRIDGE_URL || '';
const BRIDGE_RELAY_TOKEN = process.env.BRIDGE_RELAY_TOKEN || '';
const HUB_TOKEN = process.env.HUB_TOKEN || '';
const HUB_ID = process.env.HUB_ID || '';

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

type JsonObject = Record<string, unknown>;
type SanitizedUiCommandPayload =
  | { payload: JsonObject }
  | { response: ReturnType<typeof NextResponse.json> };

function authRequiredResponse() {
  return NextResponse.json(
    {
      success: false,
      status: 'error',
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Autenticazione richiesta',
      },
    },
    { status: 401 },
  );
}

function unavailableResponse() {
  return NextResponse.json(
    {
      success: false,
      status: 'error',
      error: {
        code: 'UPSTREAM_UNAVAILABLE',
        message: 'Brain non raggiungibile',
      },
    },
    { status: 502 },
  );
}

function invalidPayloadResponse(code: string, message: string) {
  return NextResponse.json(
    {
      success: false,
      status: 'error',
      error: { code, message },
    },
    { status: 400 },
  );
}

function parseJsonObject(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as JsonObject;
}

function sanitizeUiCommandPayload(body: JsonObject): SanitizedUiCommandPayload {
  const deviceId = typeof body.device_id === 'string' ? body.device_id.trim() : '';
  const actionCandidate =
    typeof body.action === 'string'
      ? body.action.trim()
      : typeof body.command === 'string'
      ? body.command.trim()
      : '';
  const paramsCandidate = Object.prototype.hasOwnProperty.call(body, 'params')
    ? body.params
    : body.parameters;

  if (!deviceId) {
    return { response: invalidPayloadResponse('DEVICE_ID_REQUIRED', 'device_id is required') };
  }

  if (!actionCandidate) {
    return { response: invalidPayloadResponse('COMMAND_REQUIRED', 'action is required') };
  }

  if (
    paramsCandidate !== undefined &&
    (!paramsCandidate || typeof paramsCandidate !== 'object' || Array.isArray(paramsCandidate))
  ) {
    return { response: invalidPayloadResponse('INVALID_PARAMS', 'params must be an object') };
  }

  return {
    payload: {
      device_id: deviceId,
      action: actionCandidate,
      params: parseJsonObject(paramsCandidate),
    },
  };
}

function toSafeErrorBody(status: number, payload: unknown) {
  const body = parseJsonObject(payload);
  const error = parseJsonObject(body.error);
  const fallbackCode =
    status === 409 ? 'CONFIRMATION_REQUIRED' : status === 403 ? 'FORBIDDEN' : 'UI_COMMAND_FAILED';
  const fallbackMessage =
    status === 409
      ? 'Conferma richiesta per eseguire il comando'
      : status === 403
      ? 'Comando non autorizzato'
      : 'Comando non eseguibile';

  return {
    success: false,
    status: typeof body.status === 'string' ? body.status : 'error',
    error: {
      code:
        typeof error.code === 'string' && error.code
          ? error.code
          : typeof body.error === 'string' && body.error
          ? body.error
          : fallbackCode,
      message:
        typeof error.message === 'string' && error.message
          ? error.message
          : typeof body.message === 'string' && body.message
          ? body.message
          : typeof body.prompt === 'string' && body.prompt
          ? body.prompt
          : fallbackMessage,
    },
  };
}

async function proxyLocal(projectId: string, payload: JsonObject): Promise<Response> {
  const upstream = await fetch(`${BRAIN_URL}/projects/${encodeURIComponent(projectId)}/actions/ui-command`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${BRAIN_TOKEN}`,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
  });

  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    return NextResponse.json(toSafeErrorBody(upstream.status, data), { status: upstream.status });
  }

  return NextResponse.json(data ?? { success: true }, { status: upstream.status });
}

async function proxyBridge(projectId: string, payload: JsonObject): Promise<Response> {
  const relayPayload: Record<string, unknown> = {
    method: 'POST',
    path: `/api/hub/brain/projects/${encodeURIComponent(projectId)}/actions/ui-command`,
    headers: {
      'content-type': 'application/json',
      authorization: HUB_TOKEN ? `Bearer ${HUB_TOKEN}` : '',
    },
    body: JSON.stringify(payload),
  };

  if (HUB_ID) relayPayload.hub_id = HUB_ID;

  const upstream = await fetch(`${REMOTE_BRIDGE_URL}/relay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${BRIDGE_RELAY_TOKEN}`,
    },
    body: JSON.stringify(relayPayload),
    signal: AbortSignal.timeout(10_000),
  });

  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    return NextResponse.json(toSafeErrorBody(upstream.status, data), { status: upstream.status });
  }

  return NextResponse.json(data ?? { success: true }, { status: upstream.status });
}

export async function POST(req: NextRequest, { params: paramsPromise }: RouteContext) {
  const context = { params: await paramsPromise };
  const hasProxyAuth = REMOTE_BRIDGE_URL ? Boolean(HUB_TOKEN) : Boolean(BRAIN_TOKEN);
  if (!hasProxyAuth) {
    return authRequiredResponse();
  }

  const rawBody = parseJsonObject(await req.json().catch(() => ({})));
  const sanitized = sanitizeUiCommandPayload(rawBody);
  if ('response' in sanitized) {
    return sanitized.response;
  }

  try {
    if (REMOTE_BRIDGE_URL) {
      return await proxyBridge(context.params.projectId, sanitized.payload);
    }
    return await proxyLocal(context.params.projectId, sanitized.payload);
  } catch {
    return unavailableResponse();
  }
}
