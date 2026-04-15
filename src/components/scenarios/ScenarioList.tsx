'use client';

import { SCENARIO_COPY } from '@/components/scenarios/scenario-copy';
import type { ScenarioRecord } from '@/lib/api/scenarios';

type Props = {
  items: ScenarioRecord[];
  loading?: boolean;
  onRefresh: () => Promise<void> | void;
  onToggle: (scenarioId: string, enabled: boolean) => Promise<void> | void;
  onDelete: (scenarioId: string) => Promise<void> | void;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('it-IT');
}

export default function ScenarioList({
  items,
  loading = false,
  onRefresh,
  onToggle,
  onDelete,
}: Props) {
  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-hub-text">{SCENARIO_COPY.listTitle}</h2>
          <p className="text-sm text-hub-muted">{SCENARIO_COPY.listDescription}</p>
        </div>

        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={loading}
          className="rounded-lg border border-hub-border px-3 py-2 text-sm text-hub-text disabled:opacity-50"
        >
          {loading ? SCENARIO_COPY.listRefreshing : SCENARIO_COPY.listRefresh}
        </button>
      </div>

      {items.length ? (
        <div className="overflow-auto">
          <table className="w-full text-sm text-hub-text">
            <thead>
              <tr className="text-left text-hub-muted">
                <th className="py-2 pr-4 font-medium">{SCENARIO_COPY.listName}</th>
                <th className="py-2 pr-4 font-medium">{SCENARIO_COPY.listStatus}</th>
                <th className="py-2 pr-4 font-medium">{SCENARIO_COPY.listTrigger}</th>
                <th className="py-2 pr-4 font-medium">{SCENARIO_COPY.listUpdated}</th>
                <th className="py-2 pr-4 font-medium">{SCENARIO_COPY.listActions}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-hub-border">
                  <td className="py-2 pr-4">{item.name}</td>
                  <td className="py-2 pr-4">{item.enabled ? SCENARIO_COPY.listEnabled : SCENARIO_COPY.listDisabled}</td>
                  <td className="py-2 pr-4">{String((item.trigger as { cron?: string })?.cron || '-')}</td>
                  <td className="py-2 pr-4">{formatDate(item.updated_at)}</td>
                  <td className="py-2 pr-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void onToggle(item.id, !item.enabled)}
                        disabled={loading}
                        className="rounded-lg border border-hub-border px-3 py-1 text-sm text-hub-text disabled:opacity-50"
                      >
                        {item.enabled ? SCENARIO_COPY.listDisable : SCENARIO_COPY.listEnable}
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDelete(item.id)}
                        disabled={loading}
                        className="rounded-lg border border-hub-border px-3 py-1 text-sm text-hub-text disabled:opacity-50"
                      >
                        {SCENARIO_COPY.listDelete}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-hub-border px-3 py-3 text-sm text-hub-muted">
          {SCENARIO_COPY.listEmpty}
        </div>
      )}
    </div>
  );
}
