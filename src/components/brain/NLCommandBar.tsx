'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle, Loader2, Send, Stethoscope, XCircle } from 'lucide-react';
import { brainInterpret, brainDiagnose, type BrainInterpretResult, type BrainDiagnoseResult } from '@/lib/api/brain';
import { fetchAPI } from '@/lib/api/client';

interface Props {
  projectId: string;
  devices?: unknown[];
}

type Phase = 'idle' | 'loading' | 'preview' | 'confirming' | 'success' | 'error' | 'diagnose_done';

export default function NLCommandBar({ projectId, devices = [] }: Props) {
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<BrainInterpretResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [hubMsg, setHubMsg] = useState('');
  const [diagnoseResult, setDiagnoseResult] = useState<BrainDiagnoseResult | null>(null);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPhase('loading');
    setResult(null);
    setErrorMsg('');
    setHubMsg('');

    try {
      const r = await brainInterpret(trimmed, { project_id: projectId, devices });
      setResult(r);
      if (!r.dispatchable) {
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
    if (!r.dispatchable || !r.commands?.length) {
      setHubMsg('Nessun comando da eseguire.');
      setPhase('success');
      return;
    }
    setPhase('confirming');
    try {
      const outcome = await fetchAPI<{ status?: string; results?: { ok: boolean; error?: string }[] }>(
        `/api/hub/api/hub/${projectId}/dispatch`,
        {
          method: 'POST',
          body: JSON.stringify({
            mode: r.commands.length > 1 ? 'parallel' : 'single',
            project_id: projectId,
            targets: r.commands,
            deadline_ms: 5000,
          }),
        },
      );
      const firstFail = outcome.results?.find((x) => !x.ok);
      if (firstFail) {
        setHubMsg(`Eseguito con errore: ${firstFail.error ?? 'dispatch_failed'}`);
      } else {
        const total = outcome.results?.length ?? 0;
        const ok = outcome.results?.filter((x) => x.ok).length ?? 0;
        setHubMsg(total > 1 ? `Fatto (${ok}/${total}).` : 'Fatto.');
      }
      setPhase('success');
    } catch (err) {
      setHubMsg(err instanceof Error ? err.message : 'Errore hub');
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
    setPhase('idle');
    setText('');
    setResult(null);
    setErrorMsg('');
    setHubMsg('');
    setDiagnoseResult(null);
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
          disabled={phase === 'loading' || phase === 'confirming'}
          placeholder="es. accendi la luce del soggiorno"
          className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={() => void handleSend()}
          disabled={!text.trim() || phase === 'loading' || phase === 'confirming'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/20 text-blue-300 active:bg-blue-500/40 disabled:opacity-40"
        >
          {phase === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Preview */}
      {phase === 'preview' && result && (
        <div className="space-y-2 rounded-[18px] border border-white/10 bg-black/20 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-white">{result.intent}</span>
            <span className={`text-xs font-semibold ${riskColor}`}>
              {result.risk === 'high' ? 'Rischio alto' : result.risk === 'medium' ? 'Rischio medio' : 'Sicuro'}
            </span>
          </div>
          {result.reason && (
            <div className="text-xs text-white/50">{result.reason}</div>
          )}
          <div className="text-xs text-white/40">
            Confidenza: {Math.round(result.confidence * 100)}%
          </div>

          {result.dispatchable ? (
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
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Comando non eseguibile — {result.reason ?? 'dispositivo non trovato'}</span>
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

      {/* Confirming */}
      {phase === 'confirming' && (
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Invio a Hub...</span>
        </div>
      )}

      {/* Success */}
      {phase === 'success' && (
        <div className="flex items-center gap-2 rounded-[16px] border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-300">
          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{hubMsg || 'Fatto.'}</span>
          <button onClick={reset} className="text-emerald-400/50 hover:text-emerald-300">✕</button>
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
