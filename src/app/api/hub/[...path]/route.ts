/**
 * api/hub/[...path]/route.ts - Catch-all proxy to mario-hub.
 *
 * Modalità locale (default):
 *   Chiama HUB_URL direttamente (LAN Pi).
 *
 * Modalità remota (REMOTE_BRIDGE_URL impostato):
 *   Invia la richiesta al mario-remote-bridge via HTTP relay,
 *   che la inoltra al Pi via WebSocket outbound.
 *
 * Auth priority (locale):
 *   1. Authorization header incoming (passthrough — es. client con token esplicito)
 *   2. mario_hub_token cookie (JWT utente loggato — Hub enforces roles)
 *   3. HUB_TOKEN env (fallback tecnico: locale non autenticato, health check, etc.)
 *
 * SSE passthrough: se Accept: text/event-stream, streamma il body hub.
 */

import { NextRequest, NextResponse } from 'next/server';

const HUB_URL            = process.env.HUB_URL            || 'http://localhost:4001';
const HUB_TOKEN          = process.env.HUB_TOKEN          || '';
const REMOTE_BRIDGE_URL  = process.env.REMOTE_BRIDGE_URL  || '';
const BRIDGE_RELAY_TOKEN = process.env.BRIDGE_RELAY_TOKEN || '';
const HUB_ID             = process.env.HUB_ID             || '';

// ── Helpers ─────────────────────────────────────────────────────────────────

function upstreamUnavailableResponse() {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: {
        code:    'UPSTREAM_UNAVAILABLE',
        message: 'Hub non raggiungibile',
        source:  'web-proxy',
      },
    },
    { status: 502 },
  );
}

function bridgeUnavailableResponse() {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: {
        code:    'BRIDGE_UNAVAILABLE',
        message: 'Pi non raggiungibile (bridge disconnesso)',
        source:  'remote-bridge',
      },
    },
    { status: 503 },
  );
}

function readOnlyResponse() {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: {
        code: 'HUB_PROXY_READ_ONLY',
        message: 'Questa operazione non passa dal proxy Hub',
        source: 'web-hub-proxy',
      },
    },
    { status: 405 },
  );
}

function buildHubUrl(path: string[], req: NextRequest): string {
  return `${HUB_URL}/api/hub/${path.join('/')}${req.nextUrl.search}`;
}

/**
 * Costruisce gli header da passare al Hub.
 * Priority: incomingAuth > userToken (JWT cookie) > HUB_TOKEN (tecnico)
 */
function buildHubHeaders(incoming: Headers, userToken: string, method: string): HeadersInit {
  const out: Record<string, string> = {};

  const ct = incoming.get('content-type');
  if (ct) out['content-type'] = ct;

  const accept = incoming.get('accept');
  if (accept) out.accept = accept;

  const auth = authPer(method, incoming.get('authorization'), userToken);
  if (auth) out.authorization = auth;

  return out;
}

/**
 * Con quale identità la richiesta arriva all'Hub.
 *
 * Una SCRITTURA viaggia solo con la persona (il suo JWT): così è l'Hub a dire
 * cosa quella persona può fare, ruolo per ruolo. Mai con HUB_TOKEN: per l'Hub
 * quello è admin **e** canale di esecuzione (`requireExecutionChannel`), e una
 * scrittura col token tecnico potrebbe comandare un device senza passare dal
 * Brain — un secondo cervello. Il token tecnico resta solo per le letture.
 */
function authPer(method: string, incomingAuth: string | null, userToken: string): string {
  if (incomingAuth) return incomingAuth;
  if (userToken) return `Bearer ${userToken}`;
  if (isLettura(method) && HUB_TOKEN) return `Bearer ${HUB_TOKEN}`;
  return '';
}

function isLettura(method: string): boolean {
  return method === 'GET' || method === 'HEAD';
}

// ── Modalità locale ──────────────────────────────────────────────────────────

async function proxyLocal(req: NextRequest, path: string[]): Promise<Response> {
  const isSSE      = req.headers.get('accept') === 'text/event-stream';
  const userToken  = req.cookies.get('mario_hub_token')?.value || '';
  const body       = ['GET', 'HEAD'].includes(req.method)
    ? undefined
    : Buffer.from(await req.arrayBuffer());

  const upstreamRes = await fetch(buildHubUrl(path, req), {
    method:  req.method,
    headers: buildHubHeaders(req.headers, userToken, req.method),
    body,
    // @ts-expect-error duplex è necessario per streaming body
    duplex: 'half',
  });

  if (isSSE && upstreamRes.body) {
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: {
        'Content-Type':    'text/event-stream',
        'Cache-Control':   'no-cache',
        'Connection':      'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  const responseBody = await upstreamRes.text();
  return new NextResponse(responseBody, {
    status:  upstreamRes.status,
    headers: {
      'Content-Type': upstreamRes.headers.get('content-type') || 'application/json',
    },
  });
}

// ── Modalità remota (bridge) ─────────────────────────────────────────────────

async function proxyBridge(req: NextRequest, path: string[]): Promise<Response> {
  const hubPath    = `/api/hub/${path.join('/')}${req.nextUrl.search}`;
  const bodyText   = ['GET', 'HEAD'].includes(req.method) ? null : await req.text();
  const userToken  = req.cookies.get('mario_hub_token')?.value || '';
  const incomingAuth = req.headers.get('authorization');

  const relayPayload: Record<string, unknown> = {
    method:  req.method,
    path:    hubPath,
    headers: {
      'content-type':  req.headers.get('content-type') || 'application/json',
      'authorization': authPer(req.method, incomingAuth, userToken),
    },
    body: bodyText,
  };
  if (HUB_ID) relayPayload.hub_id = HUB_ID;

  const relayRes = await fetch(`${REMOTE_BRIDGE_URL}/relay`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${BRIDGE_RELAY_TOKEN}`,
    },
    body:   JSON.stringify(relayPayload),
    signal: AbortSignal.timeout(12_000),
  });

  if (relayRes.status === 503) return bridgeUnavailableResponse();

  const responseBody = await relayRes.text();
  return new NextResponse(responseBody, {
    status:  relayRes.status,
    headers: {
      'Content-Type': relayRes.headers.get('content-type') || 'application/json',
    },
  });
}

// ── Dispatcher ───────────────────────────────────────────────────────────────

async function proxyRequest(req: NextRequest, path: string[]): Promise<Response> {
  if (REMOTE_BRIDGE_URL) {
    // SSE non supportato in modalità bridge (WebSocket relay non streamma)
    // → risponde 503 immediatamente → il client fa fallback a polling
    if (req.headers.get('accept') === 'text/event-stream') {
      return new Response('SSE not available in bridge mode', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }
    return proxyBridge(req, path);
  }
  return proxyLocal(req, path);
}

// ── Le scritture che passano ──────────────────────────────────────────────────

/**
 * Le sole scritture che la PWA fa verso l'Hub, una per riga (metodo + percorso).
 * Tutto il resto risponde 405. Ognuna viaggia con il JWT della persona
 * (`authPer`), e l'Hub controlla il ruolo: questo elenco dice *cosa* la PWA può
 * chiedere, l'Hub *chi* può farlo.
 *
 * NON ci sono, e non per svista:
 *   - `devices/:id/command`, `command`: un device lo comanda solo il Brain
 *     (`/api/brain/*`), e l'Hub li chiude comunque col canale di esecuzione;
 *   - `security/state`, `projects/:id/mode`: in Mario ci sono tre «modi della
 *     casa» (Brain, allarme dell'Hub, modo del progetto) che non si parlano.
 *     Si riaprono quando ne resta uno — decisione aperta con Romeo, 21/10/2026;
 *   - `user-prefs/home-layout`: nessuna pagina la usa.
 *
 * `devices/:id` è la risorsa device e basta (nome e stanza): fino al 29/09
 * bastava `path[0] === 'devices'`, e passava anche `devices/:id/command`.
 */
const SEG = '[^/]+';
const SCRITTURE: Array<[string, RegExp]> = [
  ['POST',   /^auth\/.+$/],                                   // login, refresh, logout
  ['POST',   /^push\/.+$/],                                   // iscrizione del telefono, prova
  ['DELETE', /^push\/.+$/],
  ['PATCH',  /^notifications\/.+$/],                          // letta, tutte lette
  ['DELETE', /^notifications\/.+$/],
  ['PATCH',  new RegExp(`^devices/${SEG}$`)],                 // nome e stanza di un device
  ['POST',   /^onboarding\/.+$/],                             // aggiungere un device
  ['DELETE', new RegExp(`^onboarding/session/${SEG}$`)],      // annullare l'aggiunta
  ['POST',   /^zwave\/.+$/],                                  // inclusione, SmartStart
  ['POST',   new RegExp(`^rooms/${SEG}$`)],                   // nuova stanza
  ['PATCH',  new RegExp(`^rooms/${SEG}/${SEG}$`)],            // rinominare una stanza
  ['POST',   new RegExp(`^rooms/${SEG}/${SEG}/devices/${SEG}$`)], // device in una stanza
  ['POST',   /^users$/],                                      // utenti (solo admin, lo dice l'Hub)
  ['PUT',    new RegExp(`^users/${SEG}$`)],
  ['DELETE', new RegExp(`^users/${SEG}$`)],
  ['PATCH',  new RegExp(`^projects/${SEG}/location$`)],       // posizione del meteo
  ['POST',   /^wireguard\/regenerate-qr$/],                   // accesso da fuori (solo admin)
];

function scritturaConsentita(method: string, path: string[]): boolean {
  const p = path.join('/');
  return SCRITTURE.some(([m, re]) => m === method && re.test(p));
}

// ── Route handlers ───────────────────────────────────────────────────────────

async function inoltra(req: NextRequest, path: string[]): Promise<Response> {
  try { return await proxyRequest(req, path); }
  catch { return REMOTE_BRIDGE_URL ? bridgeUnavailableResponse() : upstreamUnavailableResponse(); }
}

async function scrivi(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (!scritturaConsentita(req.method, path)) return readOnlyResponse();
  return inoltra(req, path);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return inoltra(req, (await params).path);
}

export async function HEAD(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return inoltra(req, (await params).path);
}

export const POST   = scrivi;
export const PATCH  = scrivi;
export const PUT    = scrivi;
export const DELETE = scrivi;
