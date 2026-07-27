'use client';

import { useState } from 'react';
import type { BrainScene } from '@/lib/api/brain-scenes';

type Props = {
  items: BrainScene[];
  loading?: boolean;
  onRefresh: () => void;
  onToggle: (sceneId: string, active: boolean) => Promise<void>;
  onDelete: (sceneId: string) => Promise<void>;
};

function StepBadge({ action }: { action: string }) {
  const color =
    action === 'turn_on'  ? 'text-emerald-400 border-emerald-500/40' :
    action === 'turn_off' ? 'text-red-400 border-red-500/40' :
                            'text-hub-muted border-hub-border';
  const label =
    action === 'turn_on'  ? 'accendi' :
    action === 'turn_off' ? 'spegni' :
                            action;
  return (
    <span className={`text-xs border rounded px-1 py-0.5 ${color}`}>
      {label}
    </span>
  );
}

export default function BrainSceneList({ items, loading = false, onRefresh, onToggle, onDelete }: Props) {
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function handleToggle(sceneId: string, active: boolean) {
    setBusy((p) => ({ ...p, [sceneId]: true }));
    try { await onToggle(sceneId, active); } finally {
      setBusy((p) => ({ ...p, [sceneId]: false }));
    }
  }

  async function handleDelete(sceneId: string) {
    setBusy((p) => ({ ...p, [sceneId]: true }));
    try { await onDelete(sceneId); } finally {
      setBusy((p) => ({ ...p, [sceneId]: false }));
      setConfirmDelete(null);
    }
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-hub-text">Scenari domestici</h2>
          <p className="text-sm text-hub-muted">Scenari vocali riconosciuti da MARIO</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="rounded-lg border border-hub-border px-3 py-2 text-sm text-hub-text disabled:opacity-50"
        >
          {loading ? '…' : 'Aggiorna'}
        </button>
      </div>

      {items.length === 0 && !loading && (
        <div className="rounded-lg border border-hub-border px-3 py-3 text-sm text-hub-muted">
          Nessuno scenario domestico configurato.
        </div>
      )}

      {items.map((scene) => (
        <div
          key={scene.id}
          className={`rounded-xl border px-4 py-3 space-y-2 transition-colors ${
            scene.active ? 'border-hub-border bg-hub-bg' : 'border-hub-border/40 bg-hub-bg/50 opacity-60'
          }`}
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-medium text-hub-text">{scene.label}</span>
              {scene.requires_confirm && (
                <span className="ml-2 text-xs text-hub-muted border border-hub-border rounded px-1">
                  conferma richiesta
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={busy[scene.id]}
                onClick={() => void handleToggle(scene.id, !scene.active)}
                className={`text-xs rounded-lg border px-2 py-1 transition-colors disabled:opacity-50 ${
                  scene.active
                    ? 'border-hub-accent/60 text-hub-accent'
                    : 'border-hub-border text-hub-muted'
                }`}
              >
                {scene.active ? 'Attivo' : 'Inattivo'}
              </button>
              <button
                type="button"
                disabled={busy[scene.id]}
                onClick={() => setConfirmDelete(scene.id)}
                className="text-xs rounded-lg border border-hub-border px-2 py-1 text-hub-muted hover:text-red-400 hover:border-red-500/40 transition-colors disabled:opacity-50"
              >
                Elimina
              </button>
            </div>
          </div>

          {/* Trigger phrases */}
          {scene.trigger_phrases.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {scene.trigger_phrases.map((ph) => (
                <span key={ph} className="text-xs bg-hub-surface border border-hub-border rounded px-2 py-0.5 text-hub-muted">
                  &quot;{ph}&quot;
                </span>
              ))}
            </div>
          )}

          {/* Steps */}
          {scene.steps.length > 0 && (
            <div className="space-y-1">
              {scene.steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-hub-muted">
                  <StepBadge action={s.action} />
                  <span>{s.device_name || s.device_id}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="rounded-xl border border-hub-border bg-hub-surface p-6 space-y-4 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-sm font-semibold text-hub-text">Elimina scenario</h3>
            <p className="text-sm text-hub-muted">
              Eliminare{' '}
              <span className="font-medium text-hub-text">
                {items.find((s) => s.id === confirmDelete)?.label ?? confirmDelete}
              </span>
              ? MARIO non riconoscerà più le frasi associate.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-hub-border px-4 py-2 text-sm text-hub-text"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(confirmDelete)}
                className="rounded-lg bg-red-500/80 px-4 py-2 text-sm text-white font-medium hover:bg-red-500"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
