'use client';

import { useEffect, useMemo, useState } from 'react';
import { useProjectId } from '@/hooks/useProjectId';
import { useInstallerMode } from '@/context/InstallerModeContext';
import TopBar from '@/components/layout/TopBar';
import NLScenarioForm from '@/components/scenarios/NLScenarioForm';
import ScenarioList from '@/components/scenarios/ScenarioList';
import ScenarioConfirmationPanel from '@/components/scenarios/ScenarioConfirmationPanel';
import ScenarioDraftPanel from '@/components/scenarios/ScenarioDraftPanel';
import ScenarioAuditList from '@/components/scenarios/ScenarioAuditList';
import AutomationCard from '@/components/automations/AutomationCard';
import AutomationWizard from '@/components/automations/AutomationWizard';
import {
  SCENARIO_COPY,
  formatScenarioError,
} from '@/components/scenarios/scenario-copy';
import { AUTOMATION_COPY } from '@/components/automations/automation-copy';
import {
  createScenarioFromText,
  deleteScenario,
  listScenarios,
  listScenarioAudit,
  runScenario,
  setScenarioEnabled,
  type ScenarioAuditItem,
  type ScenarioRecord,
  type ScenarioSpecV2,
} from '@/lib/api/scenarios';
import {
  listAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
} from '@/lib/api/automations';
import { listDevices } from '@/lib/api/devices';
import type { Automation, Device } from '@/lib/hub-types';

type Tab = 'scenari' | 'automazioni';

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const rawProjectId = useProjectId();
  const projectId = mounted ? rawProjectId : undefined;
  const { installerMode } = useInstallerMode();

  const [tab, setTab] = useState<Tab>('scenari');

  // — Scenari state —
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
  const [draftV2, setDraftV2] = useState<ScenarioSpecV2 | null>(null);
  const [clarification, setClarification] = useState<{ question: string; options: string[] } | null>(null);

  const hasConfirmation = useMemo(() => missing.length > 0, [missing]);

  // — Automazioni state —
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const deviceNames = useMemo(() => {
    const m = new Map<string, string>();
    devices.forEach((d) => m.set(d.id, d.name));
    return m;
  }, [devices]);

  // — Scenari loaders —
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
  }, [projectId]);

  // — Automazioni loaders —
  async function loadAutomations() {
    if (!projectId) return;
    setAutoLoading(true);
    setAutoError(null);
    try {
      const [auts, devs] = await Promise.all([
        listAutomations(projectId),
        listDevices(projectId),
      ]);
      setAutomations(auts);
      setDevices(devs);
    } catch {
      setAutoError(AUTOMATION_COPY.errorLoad);
    } finally {
      setAutoLoading(false);
    }
  }

  useEffect(() => {
    if (!projectId) return;
    void loadAutomations();
  }, [projectId]);

  // — Scenari handlers —
  async function handleToggleScenario(scenarioId: string, enabled: boolean) {
    setManagementLoading(true);
    setError(null);
    try {
      const res = await setScenarioEnabled(scenarioId, enabled, projectId);
      if (!res.success) throw new Error(res.error || 'toggle_failed');
      await refreshScenarioList();
    } catch (err) {
      setError(err instanceof Error ? formatScenarioError(err.message) : SCENARIO_COPY.unexpectedError);
    } finally {
      setManagementLoading(false);
    }
  }

  async function handleRunScenario(scenarioId: string) {
    setError(null);
    try {
      await runScenario(scenarioId, projectId);
      await refreshAudit();
    } catch (err) {
      setError(err instanceof Error ? formatScenarioError(err.message) : SCENARIO_COPY.unexpectedError);
    }
  }

  async function handleDeleteScenario(scenarioId: string) {
    setManagementLoading(true);
    setError(null);
    try {
      const res = await deleteScenario(scenarioId, projectId);
      if (!res.success) throw new Error(res.error || 'delete_failed');
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
    setDraftV2(null);
    setClarification(null);
    try {
      const deviceContext = devices.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        capabilities: d.capabilities,
      }));
      const res = await createScenarioFromText({
        text,
        projectId,
        ...(deviceContext.length > 0 ? { devices: deviceContext } : {}),
      });
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
      if (res.success && res.status === 'draft') {
        setDraftV2(res.data);
        return;
      }
      if (!res.success && res.status === 'needs_confirmation') {
        setMissing(res.missing || []);
        return;
      }
      if (!res.success && res.status === 'needs_clarification') {
        setClarification({ question: res.question, options: res.options || [] });
        return;
      }
      setError(formatScenarioError((res as { error?: string }).error));
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

  // — Draft V2 handlers —
  async function handleDraftConfirm() {
    if (!draftV2 || !projectId) return;
    setLoading(true);
    setError(null);
    try {
      await createAutomation(projectId, {
        name: draftV2.name,
        enabled: draftV2.enabled,
        trigger_type: (draftV2.trigger as { type: string }).type as 'schedule' | 'bus_event' | 'device_state',
        trigger: draftV2.trigger,
        conditions: draftV2.conditions,
        actions: draftV2.actions,
        created_at: '',
      });
      setDraftV2(null);
      setText('');
      setSuccessMessage(`Automazione salvata: ${draftV2.name}`);
      await loadAutomations();
    } catch (err) {
      setError(err instanceof Error ? err.message : SCENARIO_COPY.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  function handleDraftEdit() {
    setDraftV2(null);
  }

  function handleDraftCancel() {
    setDraftV2(null);
    setText('');
    setClarification(null);
  }

  // — Automazioni handlers —
  async function handleAutoToggle(id: string, enabled: boolean) {
    if (!projectId) return;
    try {
      await updateAutomation(projectId, id, { enabled });
      setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, enabled } : a)));
    } catch {
      setAutoError(AUTOMATION_COPY.toggleError);
    }
  }

  async function handleAutoDelete(id: string) {
    if (!projectId) return;
    try {
      await deleteAutomation(projectId, id);
      setAutomations((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setAutoError(AUTOMATION_COPY.deleteError);
    }
  }

  async function handleSaveFromWizard(payload: Record<string, unknown>) {
    if (!projectId) return;
    const automation = await createAutomation(
      projectId,
      payload as Parameters<typeof createAutomation>[1],
    );
    setAutomations((prev) => [...prev, automation]);
    setWizardOpen(false);
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

      {/* Tab bar */}
      <div className="flex border-b border-hub-border px-5 bg-hub-surface">
        {(['scenari', 'automazioni'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-hub-accent text-hub-accent'
                : 'border-transparent text-hub-muted hover:text-hub-text'
            }`}
          >
            {t === 'scenari' ? 'Scenari' : 'Automazioni'}
          </button>
        ))}
      </div>

      {/* Tab: Scenari */}
      {tab === 'scenari' && (
        <main className="flex-1 p-5 space-y-6">
          <NLScenarioForm
            value={text}
            onChange={setText}
            onSubmit={submitNaturalLanguage}
            loading={loading}
            error={error}
          />
          {successMessage ? <div className="card text-sm text-hub-text">{successMessage}</div> : null}
          {draftV2 ? (
            <ScenarioDraftPanel
              spec={draftV2}
              deviceNames={deviceNames}
              onConfirm={handleDraftConfirm}
              onEdit={handleDraftEdit}
              onCancel={handleDraftCancel}
              loading={loading}
            />
          ) : null}
          {clarification ? (
            <div className="card space-y-2">
              <h3 className="text-sm font-semibold text-hub-text">Serve un chiarimento</h3>
              <p className="text-sm text-hub-muted">{clarification.question}</p>
              {clarification.options.length > 0 && (
                <ul className="space-y-1">
                  {clarification.options.map((opt) => (
                    <li key={opt} className="text-sm text-hub-muted">• {opt}</li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-hub-muted">Modifica il testo e riprova.</p>
            </div>
          ) : null}
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
            onRun={handleRunScenario}
          />
          <ScenarioAuditList
            items={auditItems}
            lastUpdatedAt={auditUpdatedAt}
            onRefresh={refreshAudit}
            loading={loading}
          />
        </main>
      )}

      {/* Tab: Automazioni */}
      {tab === 'automazioni' && (
        <main className="flex-1 p-5 space-y-4">
          {installerMode && (
            <div className="flex justify-end">
              <button
                onClick={() => setWizardOpen(true)}
                className="px-4 py-2 rounded-lg bg-hub-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {AUTOMATION_COPY.newButton}
              </button>
            </div>
          )}

          {autoError && <div className="card text-sm text-red-400">{autoError}</div>}

          {autoLoading && (
            <div className="card text-sm text-hub-muted">{AUTOMATION_COPY.loading}</div>
          )}

          {!autoLoading && automations.length === 0 && !autoError && (
            <div className="card text-center py-10 space-y-1">
              <p className="text-sm text-hub-text">{AUTOMATION_COPY.empty}</p>
              {installerMode && (
                <p className="text-xs text-hub-muted">{AUTOMATION_COPY.emptyInstaller}</p>
              )}
            </div>
          )}

          {!autoLoading && automations.map((a) => (
            <AutomationCard
              key={a.id}
              automation={a}
              deviceNames={deviceNames}
              onToggle={handleAutoToggle}
              onDelete={handleAutoDelete}
            />
          ))}
        </main>
      )}

      {wizardOpen && (
        <AutomationWizard
          devices={devices}
          onSave={handleSaveFromWizard}
          onClose={() => setWizardOpen(false)}
        />
      )}
    </>
  );
}
