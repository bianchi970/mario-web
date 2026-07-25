'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import TopBar from '@/components/layout/TopBar';
import { fetchAPI } from '@/lib/api/client';
import { executeUiCommand } from '@/lib/api/ui-command';
import { listRooms } from '@/lib/api/rooms';
import { useProjectId } from '@/hooks/useProjectId';
import type { Room } from '@/lib/hub-types';

// ── Tipi ─────────────────────────────────────────────────────────────────────

type Step = 'idle' | 'waiting' | 'found' | 'room' | 'test' | 'done' | 'error';
type Mode = 'discover' | 'manual' | 'zwave';

interface SessionData {
  session_id: string;
  session_token: string;
  adapter_id: string;
  expires_at: string;
}

interface SessionStatus {
  status: 'waiting' | 'found' | 'completed' | 'failed' | 'expired';
  device_id: string | null;
}

interface ScanResult {
  ip: string;
  name?: string;
  brand?: string;
  model?: string;
  protocol?: string;
}

// ── Costanti ──────────────────────────────────────────────────────────────────

const ADAPTER_ID   = 'vendor:zwave-js';
const POLL_MS      = 2000;
const SESSION_SECS = 120;

const PROTOCOL_ICONS: Record<string, string> = {
  http:      '&#127760;',
  shelly:    '&#9889;',
  mqtt:      '&#128225;',
  websocket: '&#128247;',
  zwave:     '&#128246;',
  zigbee:    '&#128309;',
  ble:       '&#128309;',
  matter:    '&#11088;',
};

const PROTOCOL_LABELS: Record<string, string> = {
  http: 'HTTP', shelly: 'Shelly', mqtt: 'MQTT',
  websocket: 'WebSocket', zwave: 'Z-Wave', zigbee: 'Zigbee',
  ble: 'Bluetooth', matter: 'Matter',
};

// ── API helpers ───────────────────────────────────────────────────────────────

async function openSession(projectId: string): Promise<SessionData> {
  const res = await fetchAPI<SessionData>(
    '/api/hub/onboarding/session',
    { method: 'POST', body: JSON.stringify({ adapter_id: ADAPTER_ID, project_id: projectId, timeout_ms: SESSION_SECS * 1000 }) },
  );
  return res as unknown as SessionData;
}

async function pollSession(token: string): Promise<SessionStatus> {
  return fetchAPI<SessionStatus>(`/api/hub/onboarding/session/${encodeURIComponent(token)}`) as unknown as Promise<SessionStatus>;
}

async function assignRoom(projectId: string, roomId: string, deviceId: string): Promise<void> {
  await fetchAPI(
    `/api/hub/rooms/${encodeURIComponent(projectId)}/${encodeURIComponent(roomId)}/devices/${encodeURIComponent(deviceId)}`,
    { method: 'POST' },
  );
}

async function cancelSession(token: string): Promise<void> {
  await fetchAPI(`/api/hub/onboarding/session/${encodeURIComponent(token)}`, { method: 'DELETE' });
}

// ── Componente principale ─────────────────────────────────────────────────────

export default function OnboardingPage() {
  const projectId = useProjectId() ?? 'default';

  const [mode, setMode]         = useState<Mode>('discover');
  const [step, setStep]         = useState<Step>('idle');
  const [session, setSession]   = useState<SessionData | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [rooms, setRooms]       = useState<Room[]>([]);
  const [roomId, setRoomId]     = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [testLog, setTestLog]   = useState<string[]>([]);
  const [errMsg, setErrMsg]     = useState('');
  const [timeLeft, setTimeLeft] = useState(SESSION_SECS);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Z-Wave DSK SmartStart
  const [dskOpen, setDskOpen]     = useState(false);
  const [dskInput, setDskInput]   = useState('');
  const [dskStatus, setDskStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [dskMsg, setDskMsg]       = useState('');

  // Form manuale
  const [manName,     setManName]     = useState('');
  const [manBrand,    setManBrand]    = useState('');
  const [manModel,    setManModel]    = useState('');
  const [manIp,       setManIp]       = useState('');
  const [manProtocol, setManProtocol] = useState('http');
  const [manSaving,   setManSaving]   = useState(false);

  // Scoperta automatica
  const [scanning,    setScanning]    = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[] | null>(null);
  const [scanErr,     setScanErr]     = useState('');

  // Verifica connettività IP
  const [probing,  setProbing]  = useState(false);
  const [probeOk,  setProbeOk]  = useState<boolean | null>(null);

  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current)  { clearInterval(pollRef.current);  pollRef.current  = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // Auto-scan quando si entra nella tab Scopri
  useEffect(() => {
    if (mode === 'discover' && step === 'idle' && scanResults === null) {
      runScan();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Azzera probe quando cambia IP
  useEffect(() => { setProbeOk(null); }, [manIp]);

  // ── Scoperta automatica ───────────────────────────────────────────────────

  async function runScan() {
    setScanning(true);
    setScanErr('');
    try {
      const res = await fetchAPI<{ devices: ScanResult[] }>(
        `/api/hub/onboarding/${encodeURIComponent(projectId)}/scan`,
      );
      setScanResults(res.devices ?? []);
    } catch (err) {
      setScanErr(err instanceof Error ? err.message : 'Errore scansione');
      setScanResults([]);
    } finally {
      setScanning(false);
    }
  }

  function pickDiscovered(r: ScanResult) {
    setManName(r.name ?? '');
    setManBrand(r.brand ?? '');
    setManModel(r.model ?? '');
    setManIp(r.ip);
    setManProtocol(r.protocol ?? 'http');
    setMode('manual');
  }

  // ── Verifica IP ───────────────────────────────────────────────────────────

  async function probeIp() {
    if (!manIp.trim()) return;
    setProbing(true);
    setProbeOk(null);
    try {
      await fetchAPI<unknown>(
        `/api/hub/onboarding/${encodeURIComponent(projectId)}/probe?ip=${encodeURIComponent(manIp.trim())}`,
      );
      setProbeOk(true);
    } catch {
      setProbeOk(false);
    } finally {
      setProbing(false);
    }
  }

  // ── Z-Wave: sessione ──────────────────────────────────────────────────────

  async function startSession(keepDsk = false) {
    setErrMsg('');
    setSessionExpired(false);
    if (!keepDsk) {
      setDskOpen(false);
      setDskInput('');
      setDskStatus('idle');
      setDskMsg('');
    }
    setStep('waiting');
    setTimeLeft(SESSION_SECS);
    stopPolling();
    try {
      const data = await openSession(projectId);
      setSession(data);

      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            setSessionExpired(true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);

      pollRef.current = setInterval(async () => {
        try {
          const s = await pollSession(data.session_token);
          if (s.status === 'found' && s.device_id) {
            stopPolling();
            setDeviceId(s.device_id);
            setRooms(await listRooms(projectId).catch(() => []));
            setStep('found');
          } else if (s.status === 'expired' || s.status === 'failed') {
            stopPolling();
            setSessionExpired(true);
          }
        } catch { /* ignora errori transitori */ }
      }, POLL_MS);

    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Errore apertura sessione');
      setStep('error');
    }
  }

  async function resumeSession() {
    if (session?.session_token) await cancelSession(session.session_token).catch(() => {});
    setSession(null);
    await startSession(true);
  }

  // ── Z-Wave DSK SmartStart ─────────────────────────────────────────────────

  async function handleDSKSubmit() {
    const dsk = dskInput.trim();
    if (!dsk) return;
    if (!/^\d{5}(-\d{5}){7}$/.test(dsk)) {
      setDskStatus('error');
      setDskMsg('Formato non valido. Es: 12345-12345-12345-12345-12345-12345-12345-12345');
      return;
    }
    setDskStatus('sending');
    setDskMsg('');
    try {
      await fetchAPI('/api/hub/zwave/smartstart', {
        method: 'POST',
        body: JSON.stringify({ dsk, security_classes: [0, 1] }),
      });
      setDskStatus('ok');
      setDskMsg('SmartStart attivato. Premi il tasto fisico per completare l\'inclusione.');
      setDskInput('');
      setDskOpen(false);
    } catch (err) {
      setDskStatus('error');
      setDskMsg(err instanceof Error ? err.message : 'Errore SmartStart');
    }
  }

  // ── Manuale: salva device per IP ──────────────────────────────────────────

  async function saveManual() {
    if (!manIp.trim()) { setErrMsg('IP obbligatorio'); return; }
    setErrMsg('');
    setManSaving(true);
    try {
      const body: Record<string, string> = { protocol: manProtocol, address: manIp.trim() };
      if (manName.trim())  body.name  = manName.trim();
      if (manBrand.trim()) body.brand = manBrand.trim();
      if (manModel.trim()) body.model = manModel.trim();
      const res = await fetchAPI<{ device: { id: string } }>(
        `/api/hub/onboarding/${encodeURIComponent(projectId)}/manual`,
        { method: 'POST', body: JSON.stringify(body) },
      );
      setDeviceId(res.device.id);
      const roomList = await listRooms(projectId).catch(() => []);
      setRooms(roomList);
      setRoomId(roomList[0]?.id ?? '');
      setStep('room');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Errore salvataggio');
    } finally {
      setManSaving(false);
    }
  }

  // ── Step room / test / done ───────────────────────────────────────────────

  async function confirmRoom() {
    if (!deviceId) return;
    setErrMsg('');
    try {
      let targetRoomId = roomId;
      if (newRoomName.trim()) {
        const res = await fetchAPI<{ room: { id: string } }>(
          `/api/hub/rooms/${encodeURIComponent(projectId)}`,
          { method: 'POST', body: JSON.stringify({ name: newRoomName.trim() }) },
        );
        targetRoomId = res.room.id;
      }
      if (targetRoomId) await assignRoom(projectId, targetRoomId, deviceId);
      setTestLog([]);
      setStep('test');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Errore assegnazione stanza');
    }
  }

  async function testCmd(cmd: 'turn_on' | 'turn_off') {
    if (!deviceId) return;
    const label = cmd === 'turn_on' ? 'ON' : 'OFF';
    try {
      await executeUiCommand(projectId, { device_id: deviceId, action: cmd, params: {} });
      setTestLog(l => [...l, `\u2713 ${label} inviato`]);
    } catch (err) {
      setTestLog(l => [...l, `\u2717 ${label}: ${err instanceof Error ? err.message : 'errore'}`]);
    }
  }

  async function reset() {
    stopPolling();
    if (session?.session_token) await cancelSession(session.session_token).catch(() => {});
    setSession(null); setDeviceId(null); setRooms([]); setRoomId('');
    setTestLog([]); setErrMsg(''); setDskOpen(false); setDskInput('');
    setDskStatus('idle'); setDskMsg(''); setManName(''); setManBrand('');
    setManModel(''); setManIp(''); setManProtocol('http'); setNewRoomName('');
    setSessionExpired(false); setProbeOk(null);
    setStep('idle');
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const isIdle = step === 'idle';

  function ProtocolBadge({ p }: { p: string }) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs bg-hub-border/60 text-hub-muted px-1.5 py-0.5 rounded font-mono"
        dangerouslySetInnerHTML={{ __html: `${PROTOCOL_ICONS[p] ?? '&#128246;'} ${PROTOCOL_LABELS[p] ?? p}` }}
      />
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Aggiungi dispositivo" />

      <div className="flex-1 p-4 max-w-lg mx-auto w-full space-y-5">

        {/* ── Tab modalità (solo idle) ── */}
        {isIdle && (
          <div className="flex rounded-xl overflow-hidden border border-hub-border text-sm">
            {([
              { id: 'discover', label: '&#128269; Scopri', title: 'Scansione automatica rete' },
              { id: 'manual',   label: '&#127760; Per IP',  title: 'Inserisci IP manualmente' },
              { id: 'zwave',    label: '&#128246; Z-Wave',  title: 'Pairing Z-Wave/Radio' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                title={tab.title}
                className={`flex-1 py-2.5 font-medium transition-colors text-xs ${mode === tab.id ? 'bg-hub-accent text-black' : 'bg-hub-surface text-hub-muted hover:text-hub-text'}`}
                dangerouslySetInnerHTML={{ __html: tab.label }}
              />
            ))}
          </div>
        )}

        {/* ── Barra step ── */}
        {!isIdle && (
          <div className="flex items-center gap-1 text-xs font-mono">
            {(['Registrato','Stanza','Test','Fine'] as const).map((label, i) => {
              const idx = ['found','room','test','done'].indexOf(step);
              const done = i < idx;
              const active = i === idx;
              return (
                <span key={label} className="flex items-center gap-1">
                  {i > 0 && <span className="text-hub-border">&#8250;</span>}
                  <span className={done ? 'text-hub-muted line-through' : active ? 'text-hub-accent font-semibold' : 'text-hub-muted'}>
                    {label}
                  </span>
                </span>
              );
            })}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: SCOPRI (auto-discovery)
        ═══════════════════════════════════════════════════════════════════ */}
        {isIdle && mode === 'discover' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-hub-muted text-sm">Dispositivi sulla rete locale</p>
              <button
                onClick={runScan}
                disabled={scanning}
                className="text-xs text-hub-accent border border-hub-accent/40 rounded-lg px-3 py-1.5 hover:bg-hub-accent/10 disabled:opacity-40 transition-colors"
              >
                {scanning ? 'Scansione...' : '&#8635; Aggiorna'}
              </button>
            </div>

            {scanning && (
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="h-14 rounded-xl bg-hub-surface animate-pulse" />
                ))}
                <p className="text-center text-xs text-hub-muted">Scansione mDNS / ARP in corso...</p>
              </div>
            )}

            {!scanning && scanErr && (
              <div className="rounded-xl border border-amber-700/60 bg-amber-900/20 p-4 text-sm text-amber-300">
                <p className="font-medium mb-1">&#9888; Scansione non disponibile</p>
                <p className="text-xs text-hub-muted">{scanErr}</p>
                <button
                  onClick={() => setMode('manual')}
                  className="mt-3 text-xs text-hub-accent underline"
                >
                  Inserisci IP manualmente &#8250;
                </button>
              </div>
            )}

            {!scanning && scanResults !== null && scanResults.length === 0 && !scanErr && (
              <div className="rounded-xl border border-hub-border bg-hub-surface p-6 text-center space-y-2">
                <p className="text-2xl">&#128308;</p>
                <p className="text-sm text-hub-text font-medium">Nessun dispositivo trovato</p>
                <p className="text-xs text-hub-muted">Assicurati che i dispositivi siano accesi e sulla stessa rete Wi-Fi.</p>
                <button
                  onClick={() => setMode('manual')}
                  className="mt-2 text-xs text-hub-accent underline"
                >
                  Inserisci IP manualmente &#8250;
                </button>
              </div>
            )}

            {!scanning && scanResults && scanResults.length > 0 && (
              <div className="space-y-2">
                {scanResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => pickDiscovered(r)}
                    className="w-full text-left rounded-xl border border-hub-border bg-hub-surface hover:border-hub-accent/60 hover:bg-hub-surface/80 transition-all p-3.5 group"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-hub-text truncate">
                            {r.name ?? `${r.brand ?? ''} ${r.model ?? ''}`.trim() || r.ip}
                          </span>
                          {r.protocol && <ProtocolBadge p={r.protocol} />}
                        </div>
                        <div className="text-xs text-hub-muted font-mono mt-0.5">{r.ip}</div>
                      </div>
                      <span className="text-hub-accent text-sm opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        Aggiungi &#8250;
                      </span>
                    </div>
                  </button>
                ))}
                <p className="text-xs text-hub-muted text-center pt-1">
                  Clicca un dispositivo per avviare la configurazione
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: MANUALE (per IP)
        ═══════════════════════════════════════════════════════════════════ */}
        {isIdle && mode === 'manual' && (
          <div className="space-y-3">
            <p className="text-hub-muted text-sm">
              Dispositivi Wi-Fi/HTTP &mdash; inserisci l&apos;indirizzo IP locale.
            </p>

            <input
              type="text"
              value={manName}
              onChange={e => setManName(e.target.value)}
              placeholder="Nome (es. Sensore gas cucina)"
              className="w-full bg-hub-surface border border-hub-border rounded-xl px-3.5 py-2.5 text-sm text-hub-text focus:border-hub-accent outline-none transition-colors"
            />

            <div className="flex gap-2">
              <input
                type="text"
                value={manBrand}
                onChange={e => setManBrand(e.target.value)}
                placeholder="Marca (es. Shelly)"
                className="flex-1 bg-hub-surface border border-hub-border rounded-xl px-3.5 py-2.5 text-sm text-hub-text focus:border-hub-accent outline-none transition-colors"
              />
              <input
                type="text"
                value={manModel}
                onChange={e => setManModel(e.target.value)}
                placeholder="Modello (es. Gas)"
                className="flex-1 bg-hub-surface border border-hub-border rounded-xl px-3.5 py-2.5 text-sm text-hub-text focus:border-hub-accent outline-none transition-colors"
              />
            </div>

            {/* IP + Verifica + Trova */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={manIp}
                  onChange={e => setManIp(e.target.value)}
                  placeholder="192.168.1.50"
                  className={`w-full bg-hub-surface border rounded-xl px-3.5 py-2.5 text-sm text-hub-text font-mono outline-none transition-colors pr-8
                    ${probeOk === true ? 'border-green-500' : probeOk === false ? 'border-red-500' : 'border-hub-border focus:border-hub-accent'}`}
                />
                {probeOk === true && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-400 text-xs">&#10003;</span>
                )}
                {probeOk === false && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-400 text-xs">&#10007;</span>
                )}
              </div>
              <button
                onClick={probeIp}
                disabled={!manIp.trim() || probing}
                title="Verifica che il dispositivo risponda all'IP inserito"
                className="shrink-0 bg-hub-surface border border-hub-border rounded-xl px-3 py-2 text-xs text-hub-muted hover:text-hub-accent hover:border-hub-accent disabled:opacity-40 transition-colors"
              >
                {probing ? '...' : 'Verifica'}
              </button>
              <button
                onClick={runScan}
                disabled={scanning}
                title="Scansiona rete per trovare IP"
                className="shrink-0 bg-hub-surface border border-hub-border rounded-xl px-3 py-2 text-xs text-hub-accent hover:border-hub-accent disabled:opacity-40 transition-colors"
              >
                {scanning ? '...' : 'Trova IP'}
              </button>
            </div>

            {/* Risultati scan inline */}
            {scanResults && scanResults.length > 0 && (
              <div className="rounded-xl border border-hub-border overflow-hidden">
                <div className="px-3 py-2 bg-hub-surface border-b border-hub-border flex items-center justify-between">
                  <span className="text-xs text-hub-muted font-medium">Trovati in rete</span>
                  <button onClick={() => setScanResults(null)} className="text-xs text-hub-muted">&#10005;</button>
                </div>
                {scanResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => { setManIp(r.ip); if(r.protocol) setManProtocol(r.protocol); setScanResults(null); }}
                    className="w-full text-left px-3 py-2.5 hover:bg-hub-border/20 border-b border-hub-border/40 last:border-0 transition-colors"
                  >
                    <span className="font-mono text-sm text-hub-text">{r.ip}</span>
                    {r.protocol && <span className="ml-2"><ProtocolBadge p={r.protocol} /></span>}
                    {r.name && <span className="ml-2 text-xs text-hub-muted">{r.name}</span>}
                  </button>
                ))}
              </div>
            )}

            <select
              value={manProtocol}
              onChange={e => setManProtocol(e.target.value)}
              className="w-full bg-hub-surface border border-hub-border rounded-xl px-3.5 py-2.5 text-sm text-hub-text focus:border-hub-accent outline-none transition-colors"
            >
              <option value="http">HTTP &mdash; Shelly Gen1, Tasmota, generico</option>
              <option value="shelly">Shelly Gen2 / Gen3 (RPC)</option>
              <option value="mqtt">MQTT</option>
              <option value="websocket">WebSocket</option>
            </select>

            {probeOk === false && (
              <p className="text-xs text-amber-400">&#9888; Dispositivo non raggiungibile all&apos;IP inserito. Controlla IP e connessione.</p>
            )}
            {errMsg && <p className="text-xs text-red-400 font-mono">{errMsg}</p>}

            <button
              onClick={saveManual}
              disabled={!manIp.trim() || manSaving}
              className="w-full bg-hub-accent text-black font-semibold py-3 rounded-xl text-sm disabled:opacity-40 transition-opacity"
            >
              {manSaving ? 'Registrazione...' : 'Registra dispositivo &#8250;'}
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: Z-WAVE
        ═══════════════════════════════════════════════════════════════════ */}
        {isIdle && mode === 'zwave' && (
          <div className="space-y-4">
            {/* Steps guida */}
            <div className="space-y-3">
              {[
                { n: '1', title: 'Avvia sessione', desc: 'Apre la finestra di pairing Z-Wave (120s)' },
                { n: '2', title: 'Includi dispositivo', desc: 'Premi 3 volte il tasto fisico, oppure inserisci il codice DSK (SmartStart)' },
                { n: '3', title: 'Attendi conferma', desc: 'MARIO riconosce il dispositivo automaticamente' },
              ].map(s => (
                <div key={s.n} className="flex items-start gap-3 rounded-xl bg-hub-surface border border-hub-border p-3">
                  <span className="w-6 h-6 rounded-full bg-hub-accent text-black text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {s.n}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-hub-text">{s.title}</p>
                    <p className="text-xs text-hub-muted mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => startSession(false)}
              className="w-full bg-hub-accent text-black font-semibold py-3 rounded-xl text-sm"
            >
              Avvia pairing Z-Wave &#8250;
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP: WAITING (Z-Wave pairing in corso)
        ═══════════════════════════════════════════════════════════════════ */}
        {step === 'waiting' && session && (
          <div className="space-y-4">

            {/* Scaduta */}
            {sessionExpired ? (
              <div className="rounded-xl border border-amber-600/60 bg-amber-900/20 p-4 space-y-3">
                <div>
                  <p className="text-amber-300 font-semibold text-sm">Sessione scaduta</p>
                  <p className="text-xs text-hub-muted mt-1">
                    {dskStatus === 'ok'
                      ? 'SmartStart registrato — riprendi per continuare l\'inclusione.'
                      : 'Apri una nuova sessione da 120s.'}
                  </p>
                </div>
                <button
                  onClick={resumeSession}
                  className="w-full bg-hub-accent text-black font-semibold py-2.5 rounded-xl text-sm"
                >
                  Riprendi sessione +{SESSION_SECS}s &#8635;
                </button>
              </div>
            ) : (
              <>
                {/* Timer circolare / barra */}
                <div className="rounded-xl border border-hub-border bg-hub-surface p-4 text-center space-y-3">
                  <div className="relative inline-flex items-center justify-center w-20 h-20">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="4" className="text-hub-border" />
                      <circle
                        cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="4"
                        className={`transition-all ${timeLeft < 20 ? 'text-red-400' : 'text-hub-accent'}`}
                        strokeDasharray={`${2 * Math.PI * 34}`}
                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - timeLeft / SESSION_SECS)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className={`text-xl font-bold font-mono tabular-nums ${timeLeft < 20 ? 'text-red-400' : 'text-hub-text'}`}>
                      {timeLeft}
                    </span>
                  </div>
                  <p className="text-sm text-hub-muted">In attesa di inclusione...</p>
                </div>

                {/* DSK */}
                {dskOpen ? (
                  <div className="space-y-2">
                    <p className="text-xs text-hub-muted">Codice DSK — stampato sotto il QR sul dispositivo</p>
                    <input
                      type="text"
                      value={dskInput}
                      onChange={e => setDskInput(e.target.value)}
                      placeholder="12345-12345-12345-12345-12345-12345-12345-12345"
                      className="w-full bg-hub-surface border border-hub-border rounded-xl px-3 py-2 text-xs text-hub-text font-mono focus:border-hub-accent outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleDSKSubmit}
                        disabled={!dskInput.trim() || dskStatus === 'sending'}
                        className="flex-1 bg-hub-accent text-black font-semibold py-2 rounded-xl text-xs disabled:opacity-40"
                      >
                        {dskStatus === 'sending' ? 'Attivazione...' : 'Attiva SmartStart'}
                      </button>
                      <button
                        onClick={() => { setDskOpen(false); setDskInput(''); }}
                        className="text-xs text-hub-muted px-3 border border-hub-border rounded-xl py-2"
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setDskOpen(true)}
                    className="w-full bg-hub-surface border border-hub-border hover:border-hub-accent py-2.5 rounded-xl text-sm text-hub-text transition-colors"
                  >
                    Inserisci codice DSK (SmartStart)
                  </button>
                )}

                <p className="text-hub-muted text-xs text-center">
                  oppure premi <strong>3 volte</strong> il tasto fisico sul dispositivo
                </p>
              </>
            )}

            {dskStatus === 'ok' && (
              <div className="rounded-xl bg-green-900/30 border border-green-700 p-3 text-xs text-green-300">
                &#10003; {dskMsg}
              </div>
            )}
            {dskStatus === 'error' && (
              <div className="rounded-xl bg-red-900/30 border border-red-700 p-3 text-xs text-red-300">{dskMsg}</div>
            )}

            <button onClick={reset} className="text-xs text-hub-muted underline w-full text-center">
              Annulla
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP: FOUND
        ═══════════════════════════════════════════════════════════════════ */}
        {step === 'found' && deviceId && (
          <div className="space-y-4">
            <div className="rounded-xl border border-green-600/60 bg-green-900/20 p-4">
              <p className="text-green-400 font-semibold mb-1">&#10003; Dispositivo trovato</p>
              <p className="text-hub-muted text-xs font-mono">{deviceId}</p>
            </div>
            <button
              onClick={() => { setRoomId(rooms[0]?.id ?? ''); setStep('room'); }}
              className="w-full bg-hub-accent text-black font-semibold py-3 rounded-xl text-sm"
            >
              Continua &#8250;
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP: ROOM
        ═══════════════════════════════════════════════════════════════════ */}
        {step === 'room' && (
          <div className="space-y-4">
            <p className="text-hub-muted text-sm">Assegna il dispositivo a una stanza (opzionale).</p>

            <select
              value={roomId}
              onChange={e => { setRoomId(e.target.value); setNewRoomName(''); }}
              disabled={!!newRoomName.trim()}
              className="w-full bg-hub-surface border border-hub-border rounded-xl px-3.5 py-2.5 text-sm text-hub-text disabled:opacity-40 focus:border-hub-accent outline-none"
            >
              <option value="">— Nessuna stanza —</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>

            <div className="flex items-center gap-2 text-xs text-hub-muted">
              <div className="flex-1 h-px bg-hub-border" /><span>oppure crea nuova</span><div className="flex-1 h-px bg-hub-border" />
            </div>

            <input
              type="text"
              value={newRoomName}
              onChange={e => { setNewRoomName(e.target.value); if (e.target.value) setRoomId(''); }}
              placeholder="Nome nuova stanza (es. Caldaia)"
              className="w-full bg-hub-surface border border-hub-border rounded-xl px-3.5 py-2.5 text-sm text-hub-text focus:border-hub-accent outline-none transition-colors"
            />

            {errMsg && <p className="text-xs text-red-400 font-mono">{errMsg}</p>}

            <button
              onClick={confirmRoom}
              className="w-full bg-hub-accent text-black font-semibold py-3 rounded-xl text-sm"
            >
              Avanti &#8250;
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP: TEST
        ═══════════════════════════════════════════════════════════════════ */}
        {step === 'test' && deviceId && (
          <div className="space-y-4">
            <p className="text-hub-muted text-sm">Testa il dispositivo (opzionale — salta con Salva).</p>
            <div className="flex gap-3">
              <button
                onClick={() => testCmd('turn_on')}
                className="flex-1 bg-hub-surface border border-hub-border py-3 rounded-xl text-sm text-hub-text hover:border-hub-accent hover:text-hub-accent transition-colors"
              >
                &#128161; ON
              </button>
              <button
                onClick={() => testCmd('turn_off')}
                className="flex-1 bg-hub-surface border border-hub-border py-3 rounded-xl text-sm text-hub-text hover:border-hub-border/60 transition-colors"
              >
                &#9866; OFF
              </button>
            </div>
            {testLog.length > 0 && (
              <div className="bg-hub-surface rounded-xl p-3 text-xs font-mono text-hub-muted space-y-1 border border-hub-border">
                {testLog.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            )}
            <button
              onClick={() => setStep('done')}
              className="w-full bg-hub-accent text-black font-semibold py-3 rounded-xl text-sm"
            >
              Salva &#10003;
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP: DONE
        ═══════════════════════════════════════════════════════════════════ */}
        {step === 'done' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-green-600/60 bg-green-900/20 p-5 text-center space-y-1">
              <div className="text-3xl">&#10003;</div>
              <p className="text-green-400 font-semibold">Dispositivo salvato</p>
              <p className="text-hub-muted text-xs font-mono">{deviceId}</p>
            </div>
            <button
              onClick={reset}
              className="w-full bg-hub-surface border border-hub-border py-3 rounded-xl text-sm text-hub-text hover:border-hub-accent transition-colors"
            >
              + Aggiungi un altro
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP: ERROR
        ═══════════════════════════════════════════════════════════════════ */}
        {step === 'error' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-900/30 border border-red-700 p-4 text-sm text-red-300">
              {errMsg || 'Errore sconosciuto'}
            </div>
            <button
              onClick={reset}
              className="w-full bg-hub-surface border border-hub-border py-3 rounded-xl text-sm text-hub-text"
            >
              Riprova
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
