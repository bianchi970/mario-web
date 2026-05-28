'use client';

type TriggerSpec = Record<string, unknown>;
type ActionSpec = Record<string, unknown>;

type Props = {
  spec: {
    name: string;
    trigger: TriggerSpec;
    conditions: Array<Record<string, unknown>>;
    actions: ActionSpec[];
  };
  deviceNames?: Map<string, string>;
  onConfirm: () => Promise<void> | void;
  onEdit: () => void;
  onCancel: () => void;
  loading?: boolean;
};

function formatTrigger(trigger: TriggerSpec): string {
  if (trigger.type === 'schedule') {
    if (trigger.at) return `Ogni giorno alle ${trigger.at}`;
    if (trigger.cron) return `Programmato: ${trigger.cron}`;
  }
  if (trigger.type === 'bus_event') {
    const base = `Quando si verifica: ${trigger.event_type || 'evento'}`;
    return trigger.for ? `${base} (per ${trigger.for}s)` : base;
  }
  if (trigger.type === 'device_state') {
    const base = `Quando ${trigger.device_id || 'dispositivo'} ${trigger.property} ${trigger.operator} ${trigger.value}`;
    return trigger.for ? `${base} (per ${trigger.for}s)` : base;
  }
  return `Trigger: ${trigger.type || 'sconosciuto'}`;
}

function formatAction(action: ActionSpec, deviceNames?: Map<string, string>): string {
  if (!action.type) {
    const name = deviceNames?.get(action.device_id as string) || (action.device_id as string);
    return `${name}: ${action.command}`;
  }
  if (action.type === 'delay') return `Attendi ${action.seconds}s`;
  if (action.type === 'wait_for_trigger') return `Aspetta evento "${action.event_type || ''}"`;
  if (action.type === 'parallel') {
    const branches = action.branches as unknown[][];
    return `Parallelo (${branches?.length ?? 0} rami)`;
  }
  return String(action.type);
}

export default function ScenarioDraftPanel({
  spec,
  deviceNames,
  onConfirm,
  onEdit,
  onCancel,
  loading = false,
}: Props) {
  return (
    <div className="card space-y-4">
      <div>
        <h3 className="text-base font-semibold text-hub-text">MARIO ha capito così</h3>
        <p className="text-sm text-hub-muted">Controlla e conferma prima di salvare.</p>
      </div>

      <div className="space-y-2 text-sm">
        <div className="rounded-lg border border-hub-border bg-hub-bg px-3 py-2">
          <p className="text-xs text-hub-muted uppercase tracking-wide mb-1">Nome</p>
          <p className="text-hub-text font-medium">{spec.name}</p>
        </div>

        <div className="rounded-lg border border-hub-border bg-hub-bg px-3 py-2">
          <p className="text-xs text-hub-muted uppercase tracking-wide mb-1">Quando</p>
          <p className="text-hub-text">{formatTrigger(spec.trigger)}</p>
        </div>

        {spec.conditions.length > 0 && (
          <div className="rounded-lg border border-hub-border bg-hub-bg px-3 py-2">
            <p className="text-xs text-hub-muted uppercase tracking-wide mb-1">Condizioni</p>
            {spec.conditions.map((c, i) => (
              <p key={i} className="text-hub-text">
                {String(c.type)}: {String(c.operator)} {String(c.value)}
              </p>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-hub-border bg-hub-bg px-3 py-2">
          <p className="text-xs text-hub-muted uppercase tracking-wide mb-1">Azioni</p>
          {spec.actions.map((a, i) => (
            <p key={i} className="text-hub-text">
              → {formatAction(a, deviceNames)}
            </p>
          ))}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-lg border border-hub-border px-3 py-2 text-sm text-hub-muted hover:text-hub-text disabled:opacity-50"
        >
          Annulla
        </button>
        <button
          type="button"
          onClick={onEdit}
          disabled={loading}
          className="rounded-lg border border-hub-border px-3 py-2 text-sm text-hub-text disabled:opacity-50"
        >
          Modifica
        </button>
        <button
          type="button"
          onClick={() => void onConfirm()}
          disabled={loading}
          className="rounded-lg bg-hub-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Salvataggio...' : 'Salva automazione'}
        </button>
      </div>
    </div>
  );
}
