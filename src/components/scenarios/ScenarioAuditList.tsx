'use client';

import {
  SCENARIO_COPY,
  formatScenarioReason,
  formatScenarioStatus,
} from '@/components/scenarios/scenario-copy';
import type { ScenarioAuditItem } from '@/lib/api/scenarios';

type Props = {
  items: ScenarioAuditItem[];
  lastUpdatedAt?: string | null;
  onRefresh?: () => Promise<void> | void;
  loading?: boolean;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('it-IT');
}

export default function ScenarioAuditList({
  items,
  lastUpdatedAt = null,
  onRefresh,
  loading = false,
}: Props) {
  const sortedItems = [...items].sort((left, right) => {
    const leftTs = left.executed_at ? new Date(left.executed_at).getTime() : 0;
    const rightTs = right.executed_at ? new Date(right.executed_at).getTime() : 0;
    return rightTs - leftTs;
  });

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-hub-text">{SCENARIO_COPY.auditTitle}</h2>
          <p className="text-sm text-hub-muted">{SCENARIO_COPY.auditDescription}</p>
          <p className="text-xs text-hub-muted">{SCENARIO_COPY.auditLastUpdated} {formatDate(lastUpdatedAt)}</p>
        </div>

        <button
          type="button"
          onClick={() => void onRefresh?.()}
          disabled={loading}
          className="rounded-lg border border-hub-border px-3 py-2 text-sm text-hub-text disabled:opacity-50"
        >
          {loading ? SCENARIO_COPY.auditRefreshing : SCENARIO_COPY.auditRefresh}
        </button>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm text-hub-text">
          <thead>
            <tr className="text-left text-hub-muted">
              <th className="py-2 pr-4 font-medium">{SCENARIO_COPY.auditScenario}</th>
              <th className="py-2 pr-4 font-medium">{SCENARIO_COPY.auditStatus}</th>
              <th className="py-2 pr-4 font-medium">{SCENARIO_COPY.auditReason}</th>
              <th className="py-2 pr-4 font-medium">{SCENARIO_COPY.auditWhen}</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.length ? (
              sortedItems.map((item, index) => (
                <tr key={`${item.scenario_id}-${item.executed_at ?? index}`} className="border-t border-hub-border">
                  <td className="py-2 pr-4">{item.scenario_name || item.scenario_id}</td>
                  <td className="py-2 pr-4">{formatScenarioStatus(item.status)}</td>
                  <td className="py-2 pr-4">{formatScenarioReason(item.reason)}</td>
                  <td className="py-2 pr-4">{formatDate(item.executed_at)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-3 text-hub-muted" colSpan={4}>
                  {SCENARIO_COPY.auditEmpty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
