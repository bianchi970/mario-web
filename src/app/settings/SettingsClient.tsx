'use client';

import { useState, useEffect } from 'react';
import type { Adapter, SystemInfo } from '@/lib/hub-types';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

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
  const [projectId, setProjectId] = useState('default');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('mario_project_id') : null;
    if (saved) setProjectId(saved);
  }, []);

  function saveProjectId(id: string) {
    setProjectId(id);
    localStorage.setItem('mario_project_id', id);
  }

  async function checkHealth() {
    setHealth('checking');
    try {
      const res = await fetch('/api/hub/health');
      const d = await res.json() as { status: string };
      setHealth(d.status === 'ok' ? 'ok' : 'error');
    } catch {
      setHealth('error');
    }
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-hub-text">Hub Connection</h2>
          {!systemAvailable && <Badge variant="red">Offline</Badge>}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-hub-muted">Hub URL</span>
          <span className="font-mono text-hub-text text-xs">{hubDisplayUrl}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-hub-muted">Health check</span>
          <div className="flex items-center gap-2">
            {!systemAvailable ? (
              <Badge variant="red">Offline</Badge>
            ) : health !== 'idle' ? (
              <Badge variant={health === 'ok' ? 'green' : health === 'error' ? 'red' : 'amber'}>
                {health === 'checking' ? 'checking...' : health}
              </Badge>
            ) : null}
            <Button size="sm" loading={health === 'checking'} onClick={checkHealth}>
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
            value={projectId}
            onChange={(e) => saveProjectId(e.target.value)}
            className="flex-1 bg-hub-bg border border-hub-border rounded-lg px-3 py-1.5 text-sm text-hub-text font-mono focus:outline-none focus:border-hub-accent"
            placeholder="default"
          />
        </div>
        <p className="text-xs text-hub-muted">
          Stored in localStorage. Overrides the server default for client-side requests.
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
            ].map(([k, v]) => (
              <div key={k}>
                <span className="text-hub-muted block">{k}</span>
                <span className="text-hub-text font-mono">{v}</span>
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
            {adapters.map((a) => (
              <div key={a.adapter_id} className="flex items-center justify-between text-xs p-2 bg-hub-bg rounded-lg">
                <div>
                  <span className="text-hub-text font-mono">{a.adapter_id}</span>
                  {a.vendor && <span className="text-hub-muted ml-2">{a.vendor}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {a.devices != null && <span className="text-hub-muted">{a.devices} dev</span>}
                  <Badge variant={a.status === 'running' || a.status === 'active' ? 'green' : 'gray'}>
                    {a.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
