'use client';

import { useEffect, useMemo, useState } from 'react';
import { useProjectId } from '@/hooks/useProjectId';
import TopBar from '@/components/layout/TopBar';
import NLScenarioForm from '@/components/scenarios/NLScenarioForm';
import ScenarioList from '@/components/scenarios/ScenarioList';
import ScenarioConfirmationPanel from '@/components/scenarios/ScenarioConfirmationPanel';
import ScenarioAuditList from '@/components/scenarios/ScenarioAuditList';
import {
  SCENARIO_COPY,
  formatScenarioError,
} from '@/components/scenarios/scenario-copy';
import {
  createScenarioFromText,
  deleteScenario,
  listScenarios,
  listScenarioAudit,
  setScenarioEnabled,
  type ScenarioAuditItem,
  type ScenarioRecord,
} from '@/lib/api/scenarios';

function appendTimeToText(text: string, time: string) {
  const trimmed = text.trim();
  if (!time) return trimmed;
  if (/\balle\s+\d{1,2}(?::|\.)?\d{0,2}\b/i.test(trimmed)) return trimmed;
  return `alle ${time} ${trimmed}`.trim();
}

function appendOutcomeToText(text: string, outcomeText: string) {
  const trimmed = text.trim();
  if (!outcomeText.trim()) return trimmed;
  return `${trimmed} ${outcomeText.trim()}`.trim();
}

export default function ScenariosPage() {
  const projectId = useProjectId();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [confirmationValues, setConfirmationValues] = useState({
    trigger_time: '',
    outcome_text: '',
  });
  const [auditItems, setAuditItems] = useState<ScenarioAuditItem[]>([]);
  const [scenarioItems, setScenarioItems] = useState<ScenarioRecord[]>([]);
  const [auditUpdatedAt, setAuditUpdatedAt] = useState<string | null>(null);
  const [managementLoading, setManagementLoading] = useState(false);

  const hasConfirmation = useMemo(() => missing.length > 0, [missing]);

  async function refreshScenarioList() {
    setManagementLoading(true);
    try {
      const items = await listScenarios(projectId);
      setScenarioItems(items);
      setError(null);
    } catch (err) {
      setScenarioItems([]);
      setError(err instanceof Error ? formatScenarioError(err.message) : SCENARIO_COPY.unexpectedError);
    } finally {
      setManagementLoading(false);
    }
  }

  async function refreshAudit() {
    try {
      const items = await listScenarioAudit(projectId);
      setAuditItems(items);
      setAuditUpdatedAt(new Date().toISOString());
    } catch (err) {
      setAuditItems([]);
      setAuditUpdatedAt(new Date().toISOString());
      setError((current) => current || (err instanceof Error ? formatScenarioError(err.message) : SCENARIO_COPY.unexpectedError));
    }
  }

  useEffect(() => {
    if (!projectId) return;
    void refreshScenarioList();
    void refreshAudit();
  }, []);

  async function handleToggleScenario(scenarioId: string, enabled: boolean) {
    setManagementLoading(true);
    setError(null);
    try {
      const res = await setScenarioEnabled(scenarioId, enabled, projectId);
      if (!res.success) {
        throw new Error(res.error || 'toggle_failed');
      }
      await refreshScenarioList();
    } catch (err) {
      setError(err instanceof Error ? formatScenarioError(err.message) : SCENARIO_COPY.unexpectedError);
    } finally {
      setManagementLoading(false);
    }
  }

  async function handleDeleteScenario(scenarioId: string) {
    setManagementLoading(true);
    setError(null);
    try {
      const res = await deleteScenario(scenarioId, projectId);
      if (!res.success) {
        throw new Error(res.error || 'delete_failed');
      }
      await refreshScenarioList();
      await refreshAudit();
    } catch (err) {
      setError(err instanceof Error ? formatScenarioError(err.message) : SCENARIO_COPY.unexpectedError);
    } finally {
      setManagementLoading(false);
    }
  }

  async function submitNaturalLanguage() {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await createScenarioFromText({ text, projectId });

      if (res.success && res.status === 'created') {
        setMissing([]);
        setConfirmationValues({ trigger_time: '', outcome_text: '' });
        setError(null);
        setSuccessMessage((`${SCENARIO_COPY.successPrefix} ${res.data.name ?? ''}`).trim());
        setText('');
        await refreshScenarioList();
        await refreshAudit();
        return;
      }

      if (!res.success && res.status === 'needs_confirmation') {
        setMissing(res.missing || []);
        return;
      }

      setError(formatScenarioError(res.error));
    } catch (err) {
      setError(err instanceof Error ? formatScenarioError(err.message) : SCENARIO_COPY.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  async function submitConfirmation() {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      let rebuiltText = text;

      if (missing.includes('trigger_time')) {
        rebuiltText = appendTimeToText(rebuiltText, confirmationValues.trigger_time);
      }

      if (missing.includes('outcome') || missing.includes('outcome_text')) {
        rebuiltText = appendOutcomeToText(rebuiltText, confirmationValues.outcome_text);
      }

      const retry = await createScenarioFromText({ text: rebuiltText, projectId });

      if (retry.success && retry.status === 'created') {
        setMissing([]);
        setConfirmationValues({ trigger_time: '', outcome_text: '' });
        setError(null);
        setSuccessMessage((`${SCENARIO_COPY.successPrefix} ${retry.data.name ?? ''}`).trim());
        setText('');
        await refreshScenarioList();
        await refreshAudit();
        return;
      }

      if (!retry.success && retry.status === 'needs_confirmation') {
        setMissing(retry.missing || []);
        return;
      }

      setError(formatScenarioError(retry.error || 'Conferma non riuscita'));
    } catch (err) {
      setError(err instanceof Error ? formatScenarioError(err.message) : SCENARIO_COPY.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  if (!projectId) {
    return (
      <>
        <TopBar title={SCENARIO_COPY.pageTitle} />
        <main className="flex-1 p-5">
          <div className="card text-center py-12">
            <p className="text-sm text-hub-text">Seleziona un progetto nelle Impostazioni.</p>
            <p className="mt-1 text-xs text-hub-muted">Imposta il Project ID per usare gli scenari.</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title={SCENARIO_COPY.pageTitle} />
      <main className="flex-1 p-5 space-y-6">
        <NLScenarioForm
          value={text}
          onChange={setText}
          onSubmit={submitNaturalLanguage}
          loading={loading}
          error={error}
        />

        {successMessage ? <div className="card text-sm text-hub-text">{successMessage}</div> : null}

        {hasConfirmation ? (
          <ScenarioConfirmationPanel
            originalText={text}
            missing={missing}
            values={confirmationValues}
            onChange={(key, value) => setConfirmationValues((prev) => ({ ...prev, [key]: value }))}
            onConfirm={submitConfirmation}
            loading={loading}
          />
        ) : null}

        <ScenarioList
          items={scenarioItems}
          loading={managementLoading}
          onRefresh={refreshScenarioList}
          onToggle={handleToggleScenario}
          onDelete={handleDeleteScenario}
        />

        <ScenarioAuditList
          items={auditItems}
          lastUpdatedAt={auditUpdatedAt}
          onRefresh={refreshAudit}
          loading={loading}
        />
      </main>
    </>
  );
}
