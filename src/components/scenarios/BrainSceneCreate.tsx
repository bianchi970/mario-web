'use client';

import { useState } from 'react';
import type { Device } from '@/lib/hub-types';
import type { BrainSceneStep } from '@/lib/api/brain-scenes';

const ACTIONS = [
  { value: 'turn_on',  label: 'Accendi' },
  { value: 'turn_off', label: 'Spegni' },
  { value: 'open',     label: 'Apri' },
  { value: 'close',    label: 'Chiudi' },
];

function slugify(label: string) {
  return label
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

type Props = {
  devices: Device[];
  onSave: (payload: {
    name: string;
    label: string;
    trigger_phrases: string[];
    steps: BrainSceneStep[];
    requires_confirm: boolean;
  }) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
};

export default function BrainSceneCreate({ devices, onSave, onCancel, saving = false }: Props) {
  const [label, setLabel]               = useState('');
  const [phrases, setPhrases]           = useState('');
  const [requiresConfirm, setRequires]  = useState(true);
  const [steps, setSteps]               = useState<{ device_id: string; action: string }[]>([
    { device_id: '', action: 'turn_off' },
  ]);
  const [error, setError] = useState<string | null>(null);

  function addStep() {
    setSteps((prev) => [...prev, { device_id: '', action: 'turn_off' }]);
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateStep(i: number, field: 'device_id' | 'action', value: string) {
    setSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  async function handleSave() {
    setError(null);
    const trimLabel = label.trim();
    if (!trimLabel) { setError('Il nome dello scenario è obbligatorio.'); return; }

    const trigger_phrases = phrases
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);
    if (trigger_phrases.length === 0) { setError('Inserisci almeno una frase che attiva lo scenario.'); return; }

    const validSteps = steps.filter((s) => s.device_id);
    if (validSteps.length === 0) { setError('Aggiungi almeno un passo con un dispositivo.'); return; }

    const enrichedSteps: BrainSceneStep[] = validSteps.map((s) => {
      const dev = devices.find((d) => d.id === s.device_id);
      return { device_id: s.device_id, device_name: dev?.name, action: s.action };
    });

    await onSave({
      name: slugify(trimLabel),
      label: trimLabel,
      trigger_phrases,
      steps: enrichedSteps,
      requires_confirm: requiresConfirm,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-hub-border bg-hub-surface shadow-xl space-y-5 p-5">
        <h2 className="text-base font-semibold text-hub-text">Nuovo scenario domestico</h2>

        {/* Label */}
        <div className="space-y-1">
          <label className="text-xs text-hub-muted">Nome scenario</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="es. Buonanotte, Film, Relax…"
            className="w-full rounded-lg border border-hub-border bg-hub-bg px-3 py-2 text-sm text-hub-text placeholder:text-hub-muted focus:outline-none focus:ring-1 focus:ring-hub-accent"
          />
        </div>

        {/* Frasi trigger */}
        <div className="space-y-1">
          <label className="text-xs text-hub-muted">Frasi che attivano lo scenario <span className="text-hub-muted/60">(una per riga)</span></label>
          <textarea
            value={phrases}
            onChange={(e) => setPhrases(e.target.value)}
            rows={3}
            placeholder={"buonanotte\nvado a dormire\nnotte"}
            className="w-full rounded-lg border border-hub-border bg-hub-bg px-3 py-2 text-sm text-hub-text placeholder:text-hub-muted focus:outline-none focus:ring-1 focus:ring-hub-accent resize-none"
          />
        </div>

        {/* Steps */}
        <div className="space-y-2">
          <label className="text-xs text-hub-muted">Passi</label>
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={step.device_id}
                onChange={(e) => updateStep(i, 'device_id', e.target.value)}
                className="flex-1 rounded-lg border border-hub-border bg-hub-bg px-2 py-2 text-sm text-hub-text focus:outline-none focus:ring-1 focus:ring-hub-accent"
              >
                <option value="">— dispositivo —</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <select
                value={step.action}
                onChange={(e) => updateStep(i, 'action', e.target.value)}
                className="rounded-lg border border-hub-border bg-hub-bg px-2 py-2 text-sm text-hub-text focus:outline-none focus:ring-1 focus:ring-hub-accent"
              >
                {ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
              {steps.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStep(i)}
                  className="text-hub-muted hover:text-red-400 text-lg leading-none px-1"
                  aria-label="Rimuovi passo"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addStep}
            className="text-xs text-hub-accent hover:underline"
          >
            + Aggiungi passo
          </button>
        </div>

        {/* Richiede conferma */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={requiresConfirm}
            onChange={(e) => setRequires(e.target.checked)}
            className="w-4 h-4 accent-hub-accent"
          />
          <span className="text-sm text-hub-text">Richiedi conferma vocale</span>
        </label>

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        {/* Azioni */}
        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-hub-border px-4 py-2 text-sm text-hub-text disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !label.trim()}
            className="rounded-lg bg-hub-accent px-4 py-2 text-sm text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  );
}
