'use client';

import { SCENARIO_COPY } from '@/components/scenarios/scenario-copy';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
};

export default function NLScenarioForm({
  value,
  onChange,
  onSubmit,
  loading = false,
  error = null,
}: Props) {
  return (
    <div className="card space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-hub-text">{SCENARIO_COPY.createTitle}</h2>
        <p className="text-sm text-hub-muted">{SCENARIO_COPY.createExample}</p>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={SCENARIO_COPY.createPlaceholder}
        className="w-full min-h-28 rounded-lg border border-hub-border bg-hub-bg px-3 py-3 text-sm text-hub-text focus:outline-none focus:border-hub-accent"
      />

      {error ? (
        <div className="rounded-lg border border-hub-red/40 px-3 py-2 text-sm text-hub-text">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void onSubmit()}
          disabled={loading || !value.trim()}
          className="rounded-lg border border-hub-border px-4 py-2 text-sm text-hub-text disabled:opacity-50"
        >
          {loading ? SCENARIO_COPY.creatingButton : SCENARIO_COPY.createButton}
        </button>
      </div>
    </div>
  );
}
