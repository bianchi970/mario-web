'use client';

import { SCENARIO_COPY } from '@/components/scenarios/scenario-copy';

type Props = {
  originalText: string;
  missing: string[];
  values: {
    trigger_time: string;
    outcome_text: string;
  };
  onChange: (key: 'trigger_time' | 'outcome_text', value: string) => void;
  onConfirm: () => Promise<void> | void;
  loading?: boolean;
};

const LABELS: Record<string, string> = {
  trigger_time: SCENARIO_COPY.confirmationTime,
  outcome: SCENARIO_COPY.confirmationOutcome,
  outcome_text: SCENARIO_COPY.confirmationOutcome,
};

export default function ScenarioConfirmationPanel({
  originalText,
  missing,
  values,
  onChange,
  onConfirm,
  loading = false,
}: Props) {
  if (!missing.length) return null;

  const requiresTime = missing.includes('trigger_time');
  const requiresOutcome = missing.includes('outcome') || missing.includes('outcome_text');
  const canConfirm =
    (!requiresTime || Boolean(values.trigger_time.trim())) &&
    (!requiresOutcome || Boolean(values.outcome_text.trim()));
  const missingLabels = missing.map((key) => LABELS[key] || SCENARIO_COPY.confirmationUnknownField);

  return (
    <div className="card space-y-3">
      <div>
        <h3 className="text-base font-semibold text-hub-text">{SCENARIO_COPY.confirmationTitle}</h3>
        <p className="text-sm text-hub-muted">
          {SCENARIO_COPY.confirmationMissingPrefix} {missingLabels.join(', ')}.
        </p>
      </div>

      <div className="rounded-lg border border-hub-border bg-hub-bg px-3 py-3">
        <p className="text-xs uppercase tracking-wide text-hub-muted">{SCENARIO_COPY.confirmationOriginalText}</p>
        <p className="mt-1 text-sm text-hub-text">{originalText || '-'}</p>
      </div>

      <div className="space-y-3">
        {requiresTime ? (
          <label className="block space-y-1">
            <span className="text-sm text-hub-text">{LABELS.trigger_time}</span>
            <input
              aria-label={LABELS.trigger_time}
              type="time"
              value={values.trigger_time}
              onChange={(e) => onChange('trigger_time', e.target.value)}
              className="w-full rounded-lg border border-hub-border bg-hub-bg px-3 py-3 text-sm text-hub-text focus:outline-none focus:border-hub-accent"
            />
          </label>
        ) : null}

        {requiresOutcome ? (
          <label className="block space-y-1">
            <span className="text-sm text-hub-text">{LABELS.outcome}</span>
            <input
              aria-label={LABELS.outcome}
              type="text"
              value={values.outcome_text}
              onChange={(e) => onChange('outcome_text', e.target.value)}
              className="w-full rounded-lg border border-hub-border bg-hub-bg px-3 py-3 text-sm text-hub-text focus:outline-none focus:border-hub-accent"
              placeholder={SCENARIO_COPY.confirmationOutcomePlaceholder}
            />
          </label>
        ) : null}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void onConfirm()}
          disabled={loading || !canConfirm}
          className="rounded-lg border border-hub-border px-4 py-2 text-sm text-hub-text disabled:opacity-50"
        >
          {loading ? SCENARIO_COPY.confirmationSending : SCENARIO_COPY.confirmationButton}
        </button>
      </div>
    </div>
  );
}
