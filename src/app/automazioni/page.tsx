'use client';

import { useEffect, useMemo, useState } from 'react';
import { useProjectId } from '@/hooks/useProjectId';
import { useInstallerMode } from '@/context/InstallerModeContext';
import TopBar from '@/components/layout/TopBar';
import AutomationCard from '@/components/automations/AutomationCard';
import AutomationWizard from '@/components/automations/AutomationWizard';
import { AUTOMATION_COPY } from '@/components/automations/automation-copy';
import {
  listAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  runAutomation,
  listAutomationRuns,
} from '@/lib/api/automations';
import { listDevices } from '@/lib/api/devices';
import { getBrainSequences, brainConfirmAutomation, type SequencePattern } from '@/lib/api/brain';
import type { Automation, AutomationRun, Device } from '@/lib/hub-types';

const TIME_MAP: Record<string, string> = {
  morning: '07:00',
  afternoon: '13:00',
  evening: '19:00',
  night: '23:00',
};

export default function AutomazioniPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const rawProjectId = useProjectId();
  const projectId = mounted ? rawProjectId : undefined;
  const { installerMode } = useInstallerMode();

  const [automations, setAutomations] = useState<Automation[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [sequences, setSequences] = useState<SequencePattern[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [runsMap, setRunsMap] = useState<Record<string, AutomationRun[]>>({});

  const deviceNames = useMemo(() => {
    const m = new Map<string, string>();
    devices.forEach((d) => m.set(d.id, d.name));
    return m;
  }, [devices]);

  async function load() {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [auts, devs, seqs] = await Promise.all([
        listAutomations(projectId),
        listDevices(projectId),
        getBrainSequences(projectId).catch(() => [] as SequencePattern[]),
      ]);
      setAutomations(auts);
      setDevices(devs);
      setSequences(seqs);
    } catch {
      setError(AUTOMATION_COPY.errorLoad);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!projectId) return;
    void load();
  }, [projectId]);

  async function handleRun(id: string) {
    if (!projectId) return;
    await runAutomation(projectId, id);
    const runs = await listAutomationRuns(projectId, id);
    setRunsMap(prev => ({ ...prev, [id]: runs }));
    void load();
  }

  async function handleToggle(id: string, enabled: boolean) {
    if (!projectId) return;
    try {
      await updateAutomation(projectId, id, { enabled });
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, enabled } : a)),
      );
    } catch {
      setError(AUTOMATION_COPY.toggleError);
    }
  }

  async function handleDelete(id: string) {
    if (!projectId) return;
    try {
      await deleteAutomation(projectId, id);
      setAutomations((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError(AUTOMATION_COPY.deleteError);
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
        <TopBar title={AUTOMATION_COPY.pageTitle} />
        <main className="flex-1 p-5">
          <div className="card text-center py-12">
            <p className="text-sm text-hub-text">Seleziona un progetto nelle Impostazioni.</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title={AUTOMATION_COPY.pageTitle} />
      <main className="flex-1 p-5 space-y-4">
        {/* Pulsante crea — solo installatore */}
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

        {error && (
          <div className="card text-sm text-red-400">{error}</div>
        )}

        {loading && (
          <div className="card text-sm text-hub-muted">{AUTOMATION_COPY.loading}</div>
        )}

        {/* Routine suggerite da SequenceDetector */}
        {!loading && sequences.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-hub-muted px-1">Routine suggerite</p>
            {sequences.map((seq) => (
              <div key={seq.fingerprint} className="card space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-hub-text">{seq.fingerprint}</span>
                  <span className="text-xs text-hub-muted">{Math.round(seq.confidence * 100)}% conf.</span>
                </div>
                <div className="text-xs text-hub-muted">
                  {seq.occurrences}× · {seq.time_of_day} · {seq.day_type === 'weekday' ? 'feriali' : seq.day_type === 'weekend' ? 'weekend' : seq.day_type}
                </div>
                <button
                  onClick={async () => {
                    if (!projectId) return;
                    const time = TIME_MAP[seq.time_of_day] ?? '08:00';
                    const draft = {
                      name: seq.fingerprint,
                      status: 'draft' as const,
                      trigger: { type: 'time', time_of_day: seq.time_of_day, at: time },
                      conditions: [],
                      actions: seq.proposed_actions.map(a => ({
                        type: 'device_command',
                        device_id: a.device_id,
                        command: a.action,
                        params: {},
                      })),
                    };
                    try {
                      const res = await brainConfirmAutomation(draft, projectId);
                      setAutomations(prev => [...prev, res.automation as unknown as Automation]);
                      setSequences(prev => prev.filter(s => s.fingerprint !== seq.fingerprint));
                    } catch { /* best effort */ }
                  }}
                  className="w-full rounded-lg border border-hub-accent/30 bg-hub-accent/10 py-1.5 text-xs text-hub-accent hover:bg-hub-accent/20 transition-colors"
                >
                  Crea automazione
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && automations.length === 0 && !error && (
          <div className="card text-center py-10 space-y-1">
            <p className="text-sm text-hub-text">{AUTOMATION_COPY.empty}</p>
            {installerMode && (
              <p className="text-xs text-hub-muted">{AUTOMATION_COPY.emptyInstaller}</p>
            )}
          </div>
        )}

        {!loading && automations.map((a) => (
          <div key={a.id}>
            <AutomationCard
              automation={a}
              deviceNames={deviceNames}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onRun={handleRun}
            />
            {runsMap[a.id]?.length > 0 && (
              <div className="mt-2 space-y-1">
                {runsMap[a.id].slice(0, 3).map(r => (
                  <div key={r.id} className="flex items-center gap-2 text-[10px] text-hub-muted">
                    <span className={r.status === 'completed' ? 'text-emerald-400' : r.status === 'failed' ? 'text-red-400' : 'text-amber-400'}>●</span>
                    <span>{r.status}</span>
                    <span className="ml-auto">{new Date(r.created_at).toLocaleString('it-IT')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </main>

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
