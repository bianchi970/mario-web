'use client';

import { useState } from 'react';
import type { Adapter, SystemInfo } from '@/lib/hub-types';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useOfflineMode } from '@/components/layout/OfflineModeProvider';
import { useProject } from '@/context/ProjectContext';

function formatAdapterStatus(status: string): { label: string; variant: 'green' | 'red' | 'amber' | 'gray' } {
  const map: Record<string, { label: string; variant: 'green' | 'red' | 'amber' | 'gray' }> = {
    active:         { label: 'Attivo',         variant: 'green' },
    registered:     { label: 'Registrato',     variant: 'gray'  },
    degraded:       { label: 'Degradato',      variant: 'amber' },
    stopped:        { label: 'Fermo',          variant: 'gray'  },
    error:          { label: 'Errore',         variant: 'red'   },
    bridge_offline: { label: 'Bridge offline', variant: 'red'   },
  };
  return map[status] ?? { label: 'Sconosciuto', variant: 'gray' };
}

interface Props {
  adapters: Adapter[];
  system: SystemInfo | null;
  adaptersAvailable: boolean;
  systemAvailable: boolean;
  hubDisplayUrl: string;
}

export default function SettingsClient({
  adapters,
  system,
  adaptersAvailable,
  systemAvailable,
  hubDisplayUrl,
}: Props) {
  const [health, setHealth] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const { projectId, setProjectId } = useProject();
  const { offlineMode, offlineModeLoading, setOfflineMode } = useOfflineMode();

  async function checkHealth() {
    if (offlineMode) {
      return;
    }

    setHealth('checking');
    try {
      const res = await fetch('/api/hub/health');
      const data = await res.json() as { status: string };
      setHealth(data.status === 'ok' ? 'ok' : 'error');
    } catch {
      setHealth('error');
    }
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-hub-text">Hub Connection</h2>
          <div className="flex items-center gap-2">
            {offlineMode && <Badge variant="red">Sistema offline</Badge>}
            {!systemAvailable && <Badge variant="red">Hub offline</Badge>}
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-hub-muted">Hub URL</span>
          <span className="font-mono text-hub-text text-xs">{hubDisplayUrl}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-sm text-hub-muted block">Stato offline di sistema</span>
            <span className="text-xs text-hub-muted">Blocca davvero il runtime del Brain prima di ogni comando verso l&apos;hub.</span>
          </div>
          <label className="flex items-center gap-2 text-sm text-hub-text">
            <input
              type="checkbox"
              checked={offlineMode}
              onChange={(e) => setOfflineMode(e.target.checked)}
              aria-label="Stato offline di sistema"
              disabled={offlineModeLoading}
              className="h-4 w-4 accent-hub-red"
            />
            {offlineModeLoading ? 'Sincronizzazione...' : offlineMode ? 'Attivo' : 'Disattivo'}
          </label>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-hub-muted">Health check</span>
          <div className="flex items-center gap-2">
            {offlineMode ? (
              <Badge variant="red">Bloccato da sistema offline</Badge>
            ) : !systemAvailable ? (
              <Badge variant="red">Hub offline</Badge>
            ) : health !== 'idle' ? (
              <Badge variant={health === 'ok' ? 'green' : health === 'error' ? 'red' : 'amber'}>
                {health === 'checking' ? 'checking...' : health}
              </Badge>
            ) : null}
            <Button size="sm" loading={health === 'checking'} onClick={checkHealth} disabled={offlineMode || offlineModeLoading}>
              Check
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-hub-muted">Auth</span>
          <Badge variant="gray">Bearer token (server-side)</Badge>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="text-sm font-medium text-hub-text">Project</h2>
        <div className="flex items-center gap-3">
          <label className="text-sm text-hub-muted shrink-0">Project ID</label>
          <input
            type="text"
            value={projectId ?? ''}
            onChange={(e) => setProjectId(e.target.value)}
            className="flex-1 bg-hub-bg border border-hub-border rounded-lg px-3 py-1.5 text-sm text-hub-text font-mono focus:outline-none focus:border-hub-accent"
            placeholder="Project ID"
          />
        </div>
        <p className="text-xs text-hub-muted">
          Salvato nel browser. E&apos; la sorgente unica per dispositivi, stanze e scenari.
        </p>
      </div>

      {system ? (
        <div className="card space-y-2">
          <h2 className="text-sm font-medium text-hub-text">System Info</h2>
          <div className="grid grid-cols-2 gap-y-2 text-xs">
            {[
              ['Hostname', system.hostname],
              ['Platform', `${system.platform} / ${system.arch}`],
              ['Memory', `${system.memory_mb} MB`],
              ['Uptime', `${Math.round(system.uptime_s / 60)} min`],
              ['Adapters', `${system.active_adapters} / ${system.adapters} active`],
              ['Project', system.default_project_id],
            ].map(([key, value]) => (
              <div key={key}>
                <span className="text-hub-muted block">{key}</span>
                <span className="text-hub-text font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-hub-text">System Info</h2>
            <Badge variant="red">Offline</Badge>
          </div>
          <p className="text-sm text-hub-text">System info not reachable.</p>
          <p className="text-xs text-hub-muted">Offline</p>
        </div>
      )}

      {!adaptersAvailable ? (
        <div className="card space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-hub-text">Adapters</h2>
            <Badge variant="red">Offline</Badge>
          </div>
          <p className="text-sm text-hub-text">Adapter status not reachable.</p>
          <p className="text-xs text-hub-muted">Offline</p>
        </div>
      ) : adapters.length > 0 ? (
        <div className="card space-y-2">
          <h2 className="text-sm font-medium text-hub-text">Adapters ({adapters.length})</h2>
          <div className="space-y-2">
            {adapters.map((adapter) => (
              <div key={adapter.adapter_id} className="flex items-center justify-between text-xs p-2 bg-hub-bg rounded-lg">
                <div>
                  <span className="text-hub-text font-mono">{adapter.adapter_id}</span>
                  {adapter.vendor && <span className="text-hub-muted ml-2">{adapter.vendor}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {adapter.devices != null && <span className="text-hub-muted">{adapter.devices} dev</span>}
                  {(() => {
                    const status = formatAdapterStatus(adapter.status);
                    return <Badge variant={status.variant}>{status.label}</Badge>;
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
