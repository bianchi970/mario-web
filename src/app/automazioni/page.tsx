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
} from '@/lib/api/automations';
import { listDevices } from '@/lib/api/devices';
import type { Automation, Device } from '@/lib/hub-types';

export default function AutomazioniPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const rawProjectId = useProjectId();
  const projectId = mounted ? rawProjectId : undefined;
  const { installerMode } = useInstallerMode();

  const [automations, setAutomations] = useState<Automation[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

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
      const [auts, devs] = await Promise.all([
        listAutomations(projectId),
        listDevices(projectId),
      ]);
      setAutomations(auts);
      setDevices(devs);
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

        {!loading && automations.length === 0 && !error && (
          <div className="card text-center py-10 space-y-1">
            <p className="text-sm text-hub-text">{AUTOMATION_COPY.empty}</p>
            {installerMode && (
              <p className="text-xs text-hub-muted">{AUTOMATION_COPY.emptyInstaller}</p>
            )}
          </div>
        )}

        {!loading && automations.map((a) => (
          <AutomationCard
            key={a.id}
            automation={a}
            deviceNames={deviceNames}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
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
