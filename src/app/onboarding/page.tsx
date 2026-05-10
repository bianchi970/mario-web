'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import TopBar from '@/components/layout/TopBar';
import { fetchAPI } from '@/lib/api/client';
import { listRooms } from '@/lib/api/rooms';
import { useProjectId } from '@/hooks/useProjectId';
import type { Room } from '@/lib/hub-types';
import DeviceQRScanner from '@/components/onboarding/DeviceQRScanner';

// ── Tipi ─────────────────────────────────────────────────────────────────────

type Step = 'idle' | 'waiting' | 'found' | 'room' | 'test' | 'done' | 'error';

interface SessionData {
  session_id: string;
  session_token: string;
  adapter_id: string;
  expires_at: string;
  qr_payload: { type: string; session_token: string };
}

interface SessionStatus {
  status: 'waiting' | 'found' | 'completed' | 'failed' | 'expired';
  device_id: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADAPTER_ID = 'vendor:zwave-js';
const POLL_MS    = 2000;

async function openSession(projectId: string): Promise<SessionData> {
  const res = await fetchAPI<{ success: boolean } & SessionData>(
    '/api/hub/onboarding/session',
    { method: 'POST', body: JSON.stringify({ adapter_id: ADAPTER_ID, project_id: projectId, timeout_ms: 120000 }) },
  );
  return res as unknown as SessionData;
}

async function pollSession(token: string): Promise<SessionStatus> {
  const res = await fetchAPI<{ status: string; device_id: string | null }>(
    `/api/hub/onboarding/session/${encodeURIComponent(token)}`,
  );
  return res as unknown as SessionStatus;
}

async function assignRoom(projectId: string, roomId: string, deviceId: string): Promise<void> {
  await fetchAPI(
    `/api/hub/rooms/${encodeURIComponent(projectId)}/${encodeURIComponent(roomId)}/devices/${encodeURIComponent(deviceId)}`,
    { method: 'POST' },
  );
}

async function sendCommand(deviceId: string, command: 'turn_on' | 'turn_off'): Promise<void> {
  await fetchAPI(`/api/hub/devices/${encodeURIComponent(deviceId)}/command`, {
    method: 'POST',
    body: JSON.stringify({ command }),
  });
}

async function cancelSession(token: string): Promise<void> {
  await fetchAPI(`/api/hub/onboarding/session/${encodeURIComponent(token)}`, { method: 'DELETE' });
}

// ── Componente principale ─────────────────────────────────────────────────────

export default function OnboardingPage() {
  const projectId = useProjectId() ?? 'default';

  const [step, setStep]         = useState<Step>('idle');
  const [session, setSession]   = useState<SessionData | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [rooms, setRooms]       = useState<Room[]>([]);
  const [roomId, setRoomId]     = useState('');
  const [testLog, setTestLog]   = useState<string[]>([]);
  const [errMsg, setErrMsg]     = useState('');
  const [timeLeft, setTimeLeft] = useState(120);

  // QR device scanner
  const [scanOpen, setScanOpen]     = useState(false);
  const [qrStatus, setQrStatus]     = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [qrMsg, setQrMsg]           = useState('');

  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Cleanup poll ──────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollRef.current)  { clearInterval(pollRef.current);  pollRef.current  = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── Step 1: Apri sessione ─────────────────────────────────────────────────

  async function startSession() {
    setErrMsg('');
    setStep('waiting');
    setTimeLeft(120);
    try {
      const data = await openSession(projectId);
      setSession(data);

      // Countdown visivo
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { stopPolling(); return 0; }
          return t - 1;
        });
      }, 1000);

      // Polling status
      pollRef.current = setInterval(async () => {
        try {
          const s = await pollSession(data.session_token);
          if (s.status === 'found' && s.device_id) {
            stopPolling();
            setDeviceId(s.device_id);
            const roomList = await listRooms(projectId).catch(() => []);
            setRooms(roomList);
            setStep('found');
          } else if (s.status === 'expired' || s.status === 'failed') {
            stopPolling();
            setErrMsg(`Sessione ${s.status}. Riprova.`);
            setStep('error');
          }
        } catch { /* ignora errori transitori */ }
      }, POLL_MS);

    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Errore apertura sessione');
      setStep('error');
    }
  }

  // ── Step 2→3: Vai a stanza ────────────────────────────────────────────────

  function proceedToRoom() {
    setRoomId(rooms[0]?.id ?? '');
    setStep('room');
  }

  // ── Step 3: Assegna stanza ────────────────────────────────────────────────

  async function confirmRoom() {
    if (!deviceId) return;
    setErrMsg('');
    try {
      if (roomId) await assignRoom(projectId, roomId, deviceId);
      setTestLog([]);
      setStep('test');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Errore assegnazione stanza');
    }
  }

  // ── Step 4: Test ON/OFF ───────────────────────────────────────────────────

  async function testCmd(cmd: 'turn_on' | 'turn_off') {
    if (!deviceId) return;
    const label = cmd === 'turn_on' ? 'ON' : 'OFF';
    try {
      await sendCommand(deviceId, cmd);
      setTestLog(l => [...l, `✓ ${label} inviato`]);
    } catch (err) {
      setTestLog(l => [...l, `✗ ${label}: ${err instanceof Error ? err.message : 'errore'}`]);
    }
  }

  function finish() {
    setStep('done');
  }

  // ── QR device scan ────────────────────────────────────────────────────────

  async function handleDeviceQR(raw: string) {
    if (!session) return;
    setScanOpen(false);
    setQrStatus('sending');
    setQrMsg('');
    try {
      const result = await fetchAPI<{ success: boolean; protocol: string; notes: string }>(
        `/api/hub/onboarding/session/${encodeURIComponent(session.session_token)}/device-qr`,
        { method: 'POST', body: JSON.stringify({ qr_string: raw }) },
      );
      setQrStatus('ok');
      setQrMsg(result.notes || `Provisioning ${result.protocol} avviato`);
    } catch (err) {
      setQrStatus('error');
      setQrMsg(err instanceof Error ? err.message : 'Errore QR provisioning');
    }
  }

  // ── Ricomincia ────────────────────────────────────────────────────────────

  async function reset() {
    stopPolling();
    if (session?.session_token) {
      await cancelSession(session.session_token).catch(() => {});
    }
    setSession(null);
    setDeviceId(null);
    setRooms([]);
    setRoomId('');
    setTestLog([]);
    setErrMsg('');
    setScanOpen(false);
    setQrStatus('idle');
    setQrMsg('');
    setStep('idle');
  }

  // ── QR URL ────────────────────────────────────────────────────────────────

  const qrUrl = session
    ? `/api/hub/onboarding/session/${encodeURIComponent(session.session_token)}/qr`
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Aggiungi dispositivo" />

      <div className="flex-1 p-4 max-w-lg mx-auto w-full space-y-6">

        {/* Barra step */}
        <div className="flex items-center gap-2 text-xs text-hub-muted font-mono">
          {(['Sessione','Trovato','Stanza','Test','Fine'] as const).map((label, i) => {
            const stepIndex = ['idle','waiting','found','room','test','done'].indexOf(step);
            const active = i <= stepIndex - (step === 'waiting' ? 0 : 0);
            return (
              <span key={label} className={active ? 'text-hub-accent' : ''}>
                {i > 0 && <span className="mx-1">›</span>}
                {label}
              </span>
            );
          })}
        </div>

        {/* ── IDLE ── */}
        {step === 'idle' && (
          <div className="space-y-4">
            <p className="text-hub-muted text-sm">
              Premi per aprire una sessione di pairing. Poi premi il tasto sul dispositivo.
            </p>
            <button
              onClick={startSession}
              className="w-full bg-hub-accent text-black font-semibold py-3 rounded-lg text-sm"
            >
              Avvia pairing
            </button>
          </div>
        )}

        {/* ── WAITING ── */}
        {step === 'waiting' && session && (
          <div className="space-y-4">

            {/* Scanner camera (aperto su richiesta) */}
            {scanOpen ? (
              <DeviceQRScanner
                onScan={handleDeviceQR}
                onError={msg => { setScanOpen(false); setQrStatus('error'); setQrMsg(msg); }}
                onCancel={() => setScanOpen(false)}
              />
            ) : (
              <>
                {/* Azione primaria: QR device */}
                <button
                  onClick={() => { setQrStatus('idle'); setQrMsg(''); setScanOpen(true); }}
                  disabled={qrStatus === 'sending'}
                  className="w-full bg-hub-accent text-black font-semibold py-3 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <span>📷</span>
                  {qrStatus === 'sending' ? 'Elaborazione QR...' : 'Inquadra QR dispositivo'}
                </button>

                {/* Esito provisioning QR */}
                {qrStatus === 'ok' && (
                  <div className="rounded-lg bg-green-900/30 border border-green-700 p-3 text-xs text-green-300">
                    ✓ {qrMsg}
                  </div>
                )}
                {qrStatus === 'error' && (
                  <div className="rounded-lg bg-red-900/30 border border-red-700 p-3 text-xs text-red-300">
                    {qrMsg}
                  </div>
                )}

                {/* Azione secondaria: 3 click */}
                <p className="text-hub-muted text-xs text-center">
                  oppure premi <strong>3 volte</strong> il tasto fisico sul dispositivo
                </p>
              </>
            )}

            {/* Barra attesa */}
            <div className="flex items-center justify-between text-xs text-hub-muted font-mono">
              <span>In attesa dispositivo...</span>
              <span className={timeLeft < 20 ? 'text-red-400' : ''}>{timeLeft}s</span>
            </div>
            <div className="h-1 bg-hub-border rounded">
              <div
                className="h-1 bg-hub-accent rounded transition-all"
                style={{ width: `${(timeLeft / 120) * 100}%` }}
              />
            </div>

            {/* QR sessione MARIO — uso futuro companion app */}
            {qrUrl && !scanOpen && (
              <details className="text-xs text-hub-muted">
                <summary className="cursor-pointer select-none">Info sessione</summary>
                <div className="mt-2 flex justify-center bg-white rounded-xl p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt="QR sessione MARIO" width={160} height={160} />
                </div>
                <p className="text-center mt-1 opacity-60">QR sessione MARIO (per companion app)</p>
              </details>
            )}

            <button onClick={reset} className="text-xs text-hub-muted underline">
              Annulla
            </button>
          </div>
        )}

        {/* ── FOUND ── */}
        {step === 'found' && deviceId && (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-900/30 border border-green-700 p-4 text-sm">
              <div className="font-semibold text-green-400 mb-1">Dispositivo trovato</div>
              <div className="text-hub-muted font-mono">ID: {deviceId}</div>
            </div>
            <button
              onClick={proceedToRoom}
              className="w-full bg-hub-accent text-black font-semibold py-3 rounded-lg text-sm"
            >
              Continua →
            </button>
          </div>
        )}

        {/* ── ROOM ── */}
        {step === 'room' && (
          <div className="space-y-4">
            <p className="text-hub-muted text-sm">Assegna una stanza (opzionale).</p>

            <select
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              className="w-full bg-hub-surface border border-hub-border rounded-lg px-3 py-2 text-sm text-hub-text"
            >
              <option value="">— Nessuna stanza —</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            <button
              onClick={confirmRoom}
              className="w-full bg-hub-accent text-black font-semibold py-3 rounded-lg text-sm"
            >
              Avanti →
            </button>
          </div>
        )}

        {/* ── TEST ── */}
        {step === 'test' && deviceId && (
          <div className="space-y-4">
            <p className="text-hub-muted text-sm">
              Testa il dispositivo prima di salvare.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => testCmd('turn_on')}
                className="flex-1 bg-hub-surface border border-hub-border py-3 rounded-lg text-sm text-hub-text hover:border-hub-accent"
              >
                ON
              </button>
              <button
                onClick={() => testCmd('turn_off')}
                className="flex-1 bg-hub-surface border border-hub-border py-3 rounded-lg text-sm text-hub-text hover:border-hub-accent"
              >
                OFF
              </button>
            </div>

            {testLog.length > 0 && (
              <div className="bg-hub-surface rounded-lg p-3 text-xs font-mono text-hub-muted space-y-1">
                {testLog.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            )}

            <button
              onClick={finish}
              disabled={testLog.length === 0}
              className="w-full bg-hub-accent text-black font-semibold py-3 rounded-lg text-sm disabled:opacity-40"
            >
              Salva
            </button>
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-900/30 border border-green-700 p-4 text-sm text-center">
              <div className="text-green-400 font-semibold text-lg mb-1">✓ Dispositivo salvato</div>
              <div className="text-hub-muted text-xs">
                ID: {deviceId} — persiste dopo reboot
              </div>
            </div>

            <button
              onClick={reset}
              className="w-full bg-hub-surface border border-hub-border py-3 rounded-lg text-sm text-hub-text"
            >
              Aggiungi un altro
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
        {step === 'error' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-red-900/30 border border-red-700 p-4 text-sm text-red-300">
              {errMsg || 'Errore sconosciuto'}
            </div>
            <button
              onClick={reset}
              className="w-full bg-hub-surface border border-hub-border py-3 rounded-lg text-sm text-hub-text"
            >
              Riprova
            </button>
          </div>
        )}

        {/* Errore inline (steps intermedi) */}
        {errMsg && step !== 'error' && (
          <div className="text-xs text-red-400 font-mono">{errMsg}</div>
        )}

      </div>
    </div>
  );
}
