'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle, Loader2, Mic, MicOff, RotateCcw, Send, Stethoscope, XCircle } from 'lucide-react';
import { useConversationSession } from '@/hooks/useConversationSession';
import { brainInterpret, brainDiagnose, brainConfirmAutomation, brainLearn, type BrainInterpretResult, type BrainDiagnoseResult, type AutomationDraft } from '@/lib/api/brain';
import { createAutomation } from '@/lib/api/automations';
import { executeUiCommand, executeCompoundPlan, getExecution, pollExecution, type ExecutionRun } from '@/lib/api/ui-command';
import ExecutionProgressCard from './ExecutionProgressCard';

function triggerLabel(trigger: Record<string, unknown>): string {
  if (trigger.type === 'schedule') return `alle ${(trigger.at as string) || (trigger.cron as string)}`;
  if (trigger.type === 'device_state') {
    const prop = (trigger.property as string) || '';
    const val  = trigger.value;
    return `${prop} ${val === true ? '= sì' : val === false ? '= no' : `= ${val}`}`;
  }
  if (trigger.type === 'sun_event') return `al ${trigger.event as string}`;
  return (trigger.type as string) || '—';
}

function actionsLabel(actions: Record<string, unknown>[]): string {
  return actions
    .filter(a => a.type !== 'delay')
    .map(a => {
      const cmd  = (a.command || a.action || a.type) as string;
      const room = a.room as string;
      const dev  = a.device_type as string;
      return [cmd, dev, room].filter(Boolean).join(' ');
    })
    .join(', ') || '—';
}

const ACTION_LABEL: Record<string, string> = {
  turn_on: 'accendi',
  turn_off: 'spegni',
  open: 'apri',
  close: 'chiudi',
  stop: 'ferma',
  set: 'imposta',
};

const MISSING_LABEL: Record<string, string> = {
  target: 'dispositivo o stanza',
  trigger: 'orario o condizione',
  action: 'azione da eseguire',
  'params.temperature': 'temperatura',
};

function buildUserMeaning(r: BrainInterpretResult): string {
  const action = r.action ? (ACTION_LABEL[r.action] ?? r.action) : '';
  const target = (r.target as Record<string, unknown> | null)?.room as string
    ?? (r.target as Record<string, unknown> | null)?.selector as string
    ?? (r.target as Record<string, unknown> | null)?.device_id as string
    ?? '';
  const at = r.parameters?.at as string | undefined;
  const parts = [action, target, at ? `alle ${at}` : ''].filter(Boolean);
  if (r.intent === 'scene_run') return `avvia scena: ${target}`;
  if (r.intent === 'status_query') return `stato di: ${target}`;
  if (r.intent === 'diagnosis') return `diagnosi: ${target || 'sistema'}`;
  return parts.join(' ') || r.input_text;
}

function atToCron(at: string): string {
  const [h = '0', m = '0'] = at.split(':');
  return `${parseInt(m)} ${parseInt(h)} * * *`;
}

interface Props {
  projectId: string;
  devices?: unknown[];
}

type Phase = 'idle' | 'loading' | 'preview' | 'confirming' | 'executing' | 'success' | 'error' | 'diagnose_done' | 'automation_creating' | 'automation_confirming';

const _EXEC_TERMINAL = new Set(['succeeded', 'failed', 'partially_succeeded', 'cancelled']);

/**
 * Sceglie il MIME type supportato da MediaRecorder sul dispositivo corrente.
 * Necessario per compatibilità Android Chrome / iOS Safari / Desktop.
 */
function chooseMimeType(): string {
  const CANDIDATES = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  if (typeof MediaRecorder === 'undefined') return '';
  for (const t of CANDIDATES) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

function _isCompoundDispatchable(r: BrainInterpretResult): boolean {
  return r.commands.some(c =>
    c.action != null && (c.device_id || (c.device_ids?.length ?? 0) > 0 || c.selector),
  );
}

export default function NLCommandBar({ projectId, devices = [] }: Props) {

  const { sessionId, clearSession } = useConversationSession(projectId);
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<BrainInterpretResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [hubMsg, setHubMsg] = useState('');
  const [diagnoseResult, setDiagnoseResult] = useState<BrainDiagnoseResult | null>(null);
  const [proactiveDismissed, setProactiveDismissed] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [correctionText, setCorrectionText] = useState('');
  const [correctionDone, setCorrectionDone] = useState(false);
  const [executionRun, setExecutionRun] = useState<ExecutionRun | null>(null);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const stopPollRef = useRef<AbortController | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const voiceTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function startVoiceRecording() {
    if (voiceRecording) return;
    setVoiceError('');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const e = err as DOMException;
      let msg: string;
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        msg = `Microfono bloccato (${e.name}). Controlla le autorizzazioni del sito o le impostazioni browser.`;
      } else if (e.name === 'SecurityError') {
        msg = `Microfono vietato dalla policy di sicurezza (${e.name}). Contatta il supporto.`;
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        msg = `Nessun microfono trovato (${e.name}). Collega un microfono e riprova.`;
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        msg = `Microfono occupato da un'altra applicazione (${e.name}).`;
      } else {
        msg = `Errore microfono: ${e.name} — ${e.message}`;
      }
      setVoiceError(msg);
      return;
    }

    // Selezione MIME con fallback (Android / iOS / Desktop)
    const mimeType = chooseMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    } catch (err) {
      stream.getTracks().forEach((t) => t.stop());
      setVoiceError(`Formato audio non supportato (${(err as Error).message}). Scrivi il comando.`);
      return;
    }

    const actualMime = recorder.mimeType || mimeType || 'audio/webm';
    audioChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setVoiceRecording(false);

      const blob = new Blob(audioChunksRef.current, { type: actualMime });
      if (blob.size === 0) {
        setVoiceError('Nessun audio registrato. Riprova.');
        return;
      }

      // Converti in base64 JSON — necessario per attraversare il relay JSON (Pi→VPS bridge).
      // Il relay serializza il body come stringa JSON: multipart/form-data binario verrebbe
      // corrotto da req.text(); base64 + application/json è testo puro e passa intatto.
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      // Chunk-based: String.fromCharCode.apply su blocchi da 32 KB evita sia
      // O(n²) della concatenazione carattere per carattere sia lo stack overflow
      // dello spread (...bytes) su buffer grandi (es. audio 10s ≈ 80 KB).
      const CHUNK = 0x8000; // 32 KB
      let binary = '';
      for (let offset = 0; offset < bytes.byteLength; offset += CHUNK) {
        binary += String.fromCharCode.apply(
          null,
          bytes.subarray(offset, offset + CHUNK) as unknown as number[],
        );
      }
      const audio_base64 = btoa(binary);

      try {
        const res = await fetch('/api/brain/voice/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio_base64, mime: actualMime, lang: 'it' }),
        });
        if (!res.ok) {
          const status = res.status;
          if (status === 503) {
            setVoiceError('Voce temporaneamente non disponibile. Scrivi il comando.');
          } else if (status === 401 || status === 403) {
            setVoiceError(`Accesso negato (${status}). Effettua il login e riprova.`);
          } else {
            setVoiceError(`Errore trascrizione (${status}). Scrivi il comando.`);
          }
          return;
        }
        const data = (await res.json()) as { success: boolean; data?: { text: string } };
        const transcript = data.data?.text?.trim() ?? '';
        if (transcript) {
          setText(transcript);
          setVoiceError('');
        } else {
          setVoiceError('Nessun testo riconosciuto. Riprova.');
        }
      } catch {
        setVoiceError('Voce temporaneamente non disponibile. Scrivi il comando.');
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    // Auto-stop dopo 30 s: 30 s × 64 kbps ≈ 240 KB raw → ~320 KB base64, ben sotto il limite 2 MB Hub.
    voiceTimeoutRef.current = setTimeout(() => stopVoiceRecording(), 30_000);
    setVoiceRecording(true);
  }

  function stopVoiceRecording() {
    if (voiceTimeoutRef.current) { clearTimeout(voiceTimeoutRef.current); voiceTimeoutRef.current = null; }
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }

  // Recovery esecuzione composta dopo refresh di pagina
  useEffect(() => {
    const execKey = `mario_exec_${projectId}`;
    const savedId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(execKey) : null;
    if (!savedId) return;
    const controller = new AbortController();
    stopPollRef.current = controller;
    (async () => {
      try {
        const existing = await getExecution(projectId, savedId);
        if (_EXEC_TERMINAL.has(existing.status)) {
          sessionStorage.removeItem(execKey);
          return;
        }
        setExecutionRun(existing);
        setPhase('executing');
        const final = await pollExecution(projectId, savedId, setExecutionRun, controller.signal);
        setExecutionRun(final);
        sessionStorage.removeItem(execKey);
        if (final.status === 'succeeded') { setHubMsg('Tutti i comandi completati.'); setPhase('success'); }
        else if (final.status === 'partially_succeeded') { setHubMsg(`${final.steps_done} di ${final.steps_total} riusciti.`); setPhase('success'); }
        else { setHubMsg('Esecuzione fallita.'); setPhase('error'); }
      } catch {
        sessionStorage.removeItem(execKey);
      } finally {
        stopPollRef.current = null;
      }
    })();
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPhase('loading');
    setResult(null);
    setErrorMsg('');
    setHubMsg('');

    try {
      const r = await brainInterpret(trimmed, { project_id: projectId, devices, session_id: sessionId });
      setResult(r);
      const canDispatch = r.dispatchable || _isCompoundDispatchable(r);
      if (!canDispatch) {
        setPhase('preview');
        return;
      }
      if (r.requires_confirmation || r.risk === 'high') {
        setPhase('preview');
      } else {
        await dispatch(r);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Errore interpretazione');
      setPhase('error');
    }
  }

  async function dispatch(r: BrainInterpretResult) {
    // Compound: 1+ step con target valido
    const validCommands = r.commands.filter(c =>
      c.action != null && (c.device_id || (c.device_ids?.length ?? 0) > 0 || c.selector),
    );
    if (validCommands.length > 0) {
      await dispatchCompound(r, validCommands);
      return;
    }

    // Legacy single-device
    const deviceId = typeof r.target?.device_id === 'string' ? r.target.device_id.trim() : '';
    const action = typeof r.action === 'string' ? r.action.trim() : '';

    if (!r.dispatchable || !deviceId || !action) {
      setHubMsg('Nessun comando da eseguire.');
      setPhase('success');
      return;
    }
    setPhase('confirming');
    try {
      await executeUiCommand(projectId, {
        device_id: deviceId,
        action,
        params: r.parameters ?? {},
      });
      setHubMsg('Fatto.');
      setPhase('success');
    } catch (err) {
      setHubMsg(err instanceof Error ? err.message : 'Errore hub');
      setPhase('error');
    }
  }

  async function dispatchCompound(r: BrainInterpretResult, steps: BrainInterpretResult['commands']) {
    setPhase('executing');
    setExecutionRun(null);
    const controller = new AbortController();
    stopPollRef.current = controller;
    const execKey = `mario_exec_${projectId}`;
    try {
      const run = await executeCompoundPlan(
        projectId,
        steps.map(s => ({
          device_id:       s.device_id,
          device_ids:      s.device_ids,
          action:          s.action!,
          params:          s.params,
          step_index:      s.step_index,
          dependency_type: s.dependency_type,
          depends_on:      s.depends_on,
          selector:        s.selector,
          target_type:     s.target_type,
          room_id:         s.room_id,
          excluded_ids:    s.excluded_ids,
          description:     s.description,
        })),
        undefined,
        sessionId ?? undefined,
      );

      try { sessionStorage.setItem(execKey, run.execution_id); } catch { /* */ }
      setExecutionRun(run);

      if (!_EXEC_TERMINAL.has(run.status)) {
        const finalRun = await pollExecution(projectId, run.execution_id, setExecutionRun, controller.signal);
        setExecutionRun(finalRun);
        try { sessionStorage.removeItem(execKey); } catch { /* */ }
        if (finalRun.status === 'succeeded') {
          setHubMsg(`${finalRun.steps_done} di ${finalRun.steps_total} comand${finalRun.steps_total === 1 ? 'o' : 'i'} esegu${finalRun.steps_total === 1 ? 'ito' : 'iti'}.`);
          setPhase('success');
        } else if (finalRun.status === 'partially_succeeded') {
          setHubMsg(`${finalRun.steps_done} di ${finalRun.steps_total} riusciti, ${finalRun.steps_failed} falliti.`);
          setPhase('success');
        } else {
          setHubMsg('Esecuzione fallita.');
          setPhase('error');
        }
      } else {
        try { sessionStorage.removeItem(execKey); } catch { /* */ }
        if (run.status === 'succeeded') { setHubMsg('Fatto.'); setPhase('success'); }
        else { setHubMsg('Esecuzione fallita.'); setPhase('error'); }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      try { sessionStorage.removeItem(execKey); } catch { /* */ }
      setHubMsg(err instanceof Error ? err.message : 'Errore esecuzione');
      setPhase('error');
    } finally {
      stopPollRef.current = null;
    }
    // suppress unused var lint — r.input_text used indirectly
    void r;
  }

  async function retryFailed() {
    if (!executionRun) return;
    const toRetry = executionRun.steps.filter(
      s => s.status === 'failed' || s.status === 'blocked',
    );
    if (toRetry.length === 0) return;

    setPhase('executing');
    setHubMsg('');
    setErrorMsg('');
    setExecutionRun(null);
    const controller = new AbortController();
    stopPollRef.current = controller;
    const execKey = `mario_exec_${projectId}`;

    try {
      const run = await executeCompoundPlan(
        projectId,
        toRetry.map((s, i) => ({
          device_id:       s.device_id,
          device_ids:      s.device_ids.length > 0 ? s.device_ids : undefined,
          action:          s.action,
          params:          result?.commands.find(c => c.step_index === s.step_index)?.params,
          step_index:      i,
          dependency_type: s.dependency_type,
          depends_on:      null,
          description:     s.description,
        })),
        undefined,
        sessionId ?? undefined,
      );
      try { sessionStorage.setItem(execKey, run.execution_id); } catch { /* */ }
      setExecutionRun(run);

      if (!_EXEC_TERMINAL.has(run.status)) {
        const finalRun = await pollExecution(projectId, run.execution_id, setExecutionRun, controller.signal);
        setExecutionRun(finalRun);
        try { sessionStorage.removeItem(execKey); } catch { /* */ }
        if (finalRun.status === 'succeeded') {
          setHubMsg(`${finalRun.steps_done} di ${finalRun.steps_total} riusciti.`);
          setPhase('success');
        } else if (finalRun.status === 'partially_succeeded') {
          setHubMsg(`${finalRun.steps_done} di ${finalRun.steps_total} riusciti, ${finalRun.steps_failed} falliti.`);
          setPhase('success');
        } else {
          setHubMsg('Esecuzione fallita.');
          setPhase('error');
        }
      } else {
        try { sessionStorage.removeItem(execKey); } catch { /* */ }
        if (run.status === 'succeeded') { setHubMsg('Fatto.'); setPhase('success'); }
        else { setHubMsg('Esecuzione fallita.'); setPhase('error'); }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      try { sessionStorage.removeItem(execKey); } catch { /* */ }
      setHubMsg(err instanceof Error ? err.message : 'Errore esecuzione');
      setPhase('error');
    } finally {
      stopPollRef.current = null;
    }
  }

  async function handleCreateAutomation() {
    if (!result) return;
    const at = result.parameters?.at as string | undefined;
    if (!at) return;
    setPhase('automation_creating');
    try {
      const target = result.target as Record<string, unknown> | null;
      const deviceId = target?.device_id as string | undefined;
      const selector = (target?.selector ?? target?.room ?? '') as string;
      await createAutomation(projectId, {
        name: buildUserMeaning(result),
        enabled: true,
        trigger_type: 'schedule',
        trigger: { cron: atToCron(at), at },
        conditions: [],
        actions: [
          deviceId
            ? { type: 'device_command', device_id: deviceId, command: result.action, params: {} }
            : { type: 'intent', intent: `${result.action ?? ''} ${selector}`.trim() },
        ],
      });
      setHubMsg('Automazione creata.');
      setPhase('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Errore creazione automazione');
      setPhase('error');
    }
  }

  async function handleConfirmDraft() {
    if (!result?._v2?.draft) return;
    setPhase('automation_confirming');
    try {
      const res = await brainConfirmAutomation(result._v2.draft as AutomationDraft, projectId);
      setHubMsg(`Automazione creata: ${res.automation?.name || ''}`);
      setPhase('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Errore creazione automazione');
      setPhase('error');
    }
  }

  async function handleDiagnose() {
    if (!text.trim()) return;
    setPhase('loading');
    try {
      const r = await brainDiagnose(text.trim(), { project_id: projectId, devices });
      setDiagnoseResult(r);
      setPhase('diagnose_done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Errore diagnosi');
      setPhase('error');
    }
  }

  function reset() {
    stopPollRef.current?.abort();
    stopPollRef.current = null;
    try { sessionStorage.removeItem(`mario_exec_${projectId}`); } catch { /* */ }
    setPhase('idle');
    setText('');
    setResult(null);
    setErrorMsg('');
    setHubMsg('');
    setDiagnoseResult(null);
    setProactiveDismissed(false);
    setCorrecting(false);
    setCorrectionText('');
    setCorrectionDone(false);
    setExecutionRun(null);
  }

  const riskColor =
    result?.risk === 'high'
      ? 'text-red-300'
      : result?.risk === 'medium'
      ? 'text-amber-300'
      : 'text-emerald-300';

  return (
    <div className="rounded-[24px] border border-blue-500/20 bg-blue-500/[0.04] p-4 space-y-3">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400/70">
        Comando Vocale
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void handleSend(); }}
          disabled={phase === 'loading' || phase === 'confirming' || phase === 'executing'}
          placeholder={voiceRecording ? 'Sto ascoltando…' : 'es. accendi la luce del soggiorno'}
          className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none disabled:opacity-50"
        />

        {/* Pulsante microfono — voce locale Pi via Whisper (B97-B) */}
        {typeof window !== 'undefined' && !!navigator.mediaDevices && (
          <button
            onClick={voiceRecording ? stopVoiceRecording : () => void startVoiceRecording()}
            disabled={phase === 'loading' || phase === 'confirming' || phase === 'executing'}
            title={voiceRecording ? 'Ferma registrazione' : 'Parla in italiano'}
            aria-label={voiceRecording ? 'Ferma registrazione' : 'Avvia registrazione vocale'}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors disabled:opacity-40 ${
              voiceRecording
                ? 'border-red-500/50 bg-red-500/20 text-red-300 animate-pulse'
                : 'border-white/10 bg-white/5 text-white/50 active:bg-white/10 hover:text-white/80'
            }`}
          >
            {voiceRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        )}

        <button
          onClick={() => void handleSend()}
          disabled={!text.trim() || phase === 'loading' || phase === 'confirming' || phase === 'executing'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/20 text-blue-300 active:bg-blue-500/40 disabled:opacity-40"
        >
          {phase === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={() => { clearSession(); reset(); }}
          title="Nuova conversazione"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/40 active:bg-white/10"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Banner voce — non silenzioso se STT non disponibile */}
      {voiceError && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{voiceError}</span>
          <button onClick={() => setVoiceError('')} className="ml-auto text-amber-400/60 hover:text-amber-300">✕</button>
        </div>
      )}

      {/* Preview */}
      {(phase === 'preview' || phase === 'automation_confirming') && result && (
        <div className="space-y-2 rounded-[18px] border border-white/10 bg-black/20 p-3 text-sm">
          {/* UserMeaning */}
          <div className="flex items-center justify-between">
            <span className="font-medium text-white">{buildUserMeaning(result)}</span>
            <span className={`text-xs font-semibold ${riskColor}`}>
              {result.risk === 'high' ? 'Rischio alto' : result.risk === 'medium' ? 'Rischio medio' : 'Sicuro'}
            </span>
          </div>
          <div className="text-xs text-white/40">
            Confidenza: {Math.round(result.confidence * 100)}%
          </div>

          {/* automation_intent — draft da Brain V2 */}
          {result.intent === 'automation_intent' && result._v2?.draft && (
            <div className="space-y-1.5 rounded-[14px] border border-sky-500/20 bg-sky-500/[0.06] p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-sky-300">
                <CalendarClock className="h-3.5 w-3.5" />
                Nuova automazione
              </div>
              <div className="text-xs text-white/70 font-medium">{result._v2.draft.name}</div>
              {!!(result._v2.draft.trigger?.type) && (
                <div className="text-xs text-white/50">
                  Quando: <span className="text-white/70">{triggerLabel(result._v2.draft.trigger)}</span>
                </div>
              )}
              {result._v2.draft.actions?.length > 0 && (
                <div className="text-xs text-white/50">
                  Azione: <span className="text-white/70">{actionsLabel(result._v2.draft.actions)}</span>
                </div>
              )}
              {result._v2.explanation && (
                <div className="text-xs text-white/40 italic">{result._v2.explanation}</div>
              )}
              <div className="flex gap-2 pt-0.5">
                <button
                  onClick={() => void handleConfirmDraft()}
                  disabled={phase === 'automation_confirming'}
                  className="flex-1 rounded-xl border border-sky-500/30 bg-sky-500/20 py-1.5 text-xs text-sky-300 active:bg-sky-500/30 disabled:opacity-40"
                >
                  {phase === 'automation_confirming' ? '…' : 'Conferma'}
                </button>
                <button
                  onClick={reset}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}

          {/* automation_draft */}
          {result.reason === 'automation_draft' && (
            <div className="space-y-1.5 rounded-[14px] border border-sky-500/20 bg-sky-500/[0.06] p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-sky-300">
                <CalendarClock className="h-3.5 w-3.5" />
                Automazione rilevata
              </div>
              {(result.parameters?.at as string | undefined) && (
                <div className="text-xs text-white/50">
                  Orario: <span className="text-white/70">{result.parameters.at as string}</span>
                </div>
              )}
              {result.action && (
                <div className="text-xs text-white/50">
                  Azione: <span className="text-white/70">{ACTION_LABEL[result.action] ?? result.action}</span>
                </div>
              )}
              {result.parameters?.at ? (
                <div className="flex gap-2 pt-0.5">
                  <button
                    onClick={() => void handleCreateAutomation()}
                    className="flex-1 rounded-xl border border-sky-500/30 bg-sky-500/20 py-1.5 text-xs text-sky-300 active:bg-sky-500/30"
                  >
                    Crea automazione
                  </button>
                  <button
                    onClick={reset}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 active:bg-white/10"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="text-xs text-amber-300">
                  Specifica un orario per creare l&apos;automazione.
                </div>
              )}
            </div>
          )}

          {/* Missing fields */}
          {(result.missing?.length ?? 0) > 0 && result.reason !== 'automation_draft' && (
            <div className="text-xs text-amber-300/80">
              Manca: {result.missing!.map((m) => MISSING_LABEL[m] ?? m).join(', ')}
            </div>
          )}

          {(result.dispatchable || _isCompoundDispatchable(result)) ? (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => void dispatch(result)}
                className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/20 py-1.5 text-xs text-emerald-300 active:bg-emerald-500/30"
              >
                Esegui
              </button>
              <button
                onClick={reset}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-1.5 text-xs text-white/50 active:bg-white/10"
              >
                Annulla
              </button>
            </div>
          ) : result.reason !== 'automation_draft' && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {result._v2?.outcome === 'ask' && result._v2.question
                    ? result._v2.question
                    : result._v2?.outcome === 'defer' && result._v2?.explanation
                    ? result._v2.explanation
                    : result.reason === 'missing_fields'
                    ? 'Comando incompleto'
                    : `Non eseguibile — ${result.reason ?? 'dispositivo non trovato'}`}
                </span>
                <button onClick={reset} className="ml-auto text-white/40 hover:text-white/70">✕</button>
              </div>
              {result.suggest_diagnose && (
                <button
                  onClick={() => void handleDiagnose()}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 py-1.5 text-xs text-violet-300 active:bg-violet-500/20"
                >
                  <Stethoscope className="h-3.5 w-3.5" />
                  Diagnosi consigliata
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Executing compound plan — per-step progress */}
      {phase === 'executing' && (
        executionRun
          ? <ExecutionProgressCard run={executionRun} phase="executing" />
          : <div className="flex items-center gap-2 text-xs text-white/50">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Avvio esecuzione…</span>
            </div>
      )}

      {/* Automation creating */}
      {phase === 'automation_creating' && (
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Creazione automazione...</span>
        </div>
      )}

      {/* Confirming */}
      {phase === 'confirming' && (
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Invio a Hub...</span>
        </div>
      )}

      {/* Success */}
      {phase === 'success' && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 rounded-[16px] border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-300">
            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">{hubMsg || 'Fatto.'}</span>
            <button onClick={reset} className="text-emerald-400/50 hover:text-emerald-300">✕</button>
          </div>
          {executionRun && executionRun.steps.length > 1 && (
            <ExecutionProgressCard run={executionRun} phase="done" />
          )}
          {executionRun && executionRun.steps.some(s => s.status === 'failed' || s.status === 'blocked') && (
            <button
              onClick={() => void retryFailed()}
              className="w-full rounded-xl border border-amber-500/20 bg-amber-500/[0.06] py-1.5 text-xs text-amber-300 active:bg-amber-500/10"
            >
              Riprova i falliti ({executionRun.steps.filter(s => s.status === 'failed' || s.status === 'blocked').length})
            </button>
          )}
        </div>
      )}

      {/* Proactive routine (3b) */}
      {phase === 'success' && !proactiveDismissed && (() => {
        const proactiveItem = result?._v2?.proactive?.find(p => p.type === 'routine_detected' && p.draft);
        if (!proactiveItem) return null;
        return (
          <div className="space-y-2 rounded-[18px] border border-indigo-500/20 bg-indigo-500/[0.06] p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-indigo-300">
                Routine rilevata {proactiveItem.occurrences ?? ''} volte — Vuoi creare un&apos;automazione?
              </span>
              <button onClick={() => setProactiveDismissed(true)} className="text-white/40 hover:text-white/70">✕</button>
            </div>
            {proactiveItem.message && (
              <div className="text-white/50">{proactiveItem.message}</div>
            )}
            <div className="flex gap-2 pt-0.5">
              <button
                onClick={async () => {
                  try {
                    await brainConfirmAutomation(proactiveItem.draft as unknown as AutomationDraft, projectId);
                    setHubMsg('Automazione creata.');
                    setProactiveDismissed(true);
                  } catch { /* best effort */ }
                }}
                className="flex-1 rounded-xl border border-indigo-500/30 bg-indigo-500/20 py-1.5 text-xs text-indigo-300 active:bg-indigo-500/30"
              >
                Crea
              </button>
              <button
                onClick={() => setProactiveDismissed(true)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50"
              >
                Non ora
              </button>
            </div>
          </div>
        );
      })()}

      {/* "Hai sbagliato?" inline (3c) */}
      {phase === 'success' && result?.dispatchable && (
        <div className="text-xs">
          {correctionDone ? (
            <span className="text-emerald-400/70">Grazie, imparato.</span>
          ) : correcting ? (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={correctionText}
                onChange={e => setCorrectionText(e.target.value)}
                placeholder="Cosa intendevi?"
                className="flex-1 rounded-xl border border-white/10 bg-black/20 px-2 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none"
              />
              <button
                onClick={async () => {
                  if (!correctionText.trim()) return;
                  try {
                    await brainLearn({
                      wrong_phrase: result.input_text,
                      correct_phrase: correctionText.trim(),
                      project_id: projectId,
                      feedback_type: 'correction',
                    });
                  } catch { /* best effort */ }
                  setCorrectionDone(true);
                  setTimeout(() => { setCorrecting(false); setCorrectionText(''); setCorrectionDone(false); }, 2000);
                }}
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300"
              >
                Invia
              </button>
              <button onClick={() => setCorrecting(false)} className="text-white/40 hover:text-white/70">✕</button>
            </div>
          ) : (
            <button
              onClick={() => setCorrecting(true)}
              className="text-white/30 hover:text-white/60 underline underline-offset-2"
            >
              Hai sbagliato?
            </button>
          )}
        </div>
      )}

      {/* Diagnose result */}
      {phase === 'diagnose_done' && diagnoseResult && (
        <div className="space-y-2 rounded-[18px] border border-violet-500/20 bg-violet-500/[0.06] p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-violet-300">
              <Stethoscope className="h-3.5 w-3.5" />
              {diagnoseResult.category}
            </span>
            <button onClick={reset} className="text-white/40 hover:text-white/70">✕</button>
          </div>
          {diagnoseResult.cause && (
            <div className="text-white/60">{diagnoseResult.cause}</div>
          )}
          {diagnoseResult.steps.length > 0 && (
            <ol className="space-y-1 pl-3">
              {diagnoseResult.steps.map((step, i) => (
                <li key={i} className="list-decimal text-white/50">{step}</li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* Error */}
      {phase === 'error' && (
        <div className="flex items-center gap-2 rounded-[16px] border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-300">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{errorMsg || hubMsg || 'Errore.'}</span>
          <button onClick={reset} className="text-red-400/50 hover:text-red-300">✕</button>
        </div>
      )}
    </div>
  );
}
