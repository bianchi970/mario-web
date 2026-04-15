'use client';

import { useEffect, useState } from 'react';
import { useOfflineMode } from '@/components/layout/OfflineModeProvider';

export default function TopBar({ title }: { title: string }) {
  const [hubOk, setHubOk] = useState<boolean | null>(null);
  const { offlineMode, offlineModeLoading } = useOfflineMode();

  useEffect(() => {
    if (offlineModeLoading || offlineMode) {
      setHubOk(null);
      return;
    }

    fetch('/api/hub/health')
      .then((r) => r.json())
      .then((d) => setHubOk(d.status === 'ok'))
      .catch(() => setHubOk(false));
  }, [offlineMode, offlineModeLoading]);

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-hub-border bg-hub-surface md:bg-transparent">
      <h1 className="font-semibold text-hub-text">{title}</h1>
      <div className="flex items-center gap-2 text-xs text-hub-muted">
        <span
          className={`w-2 h-2 rounded-full inline-block ${
            offlineMode ? 'bg-hub-red' :
            offlineModeLoading ? 'bg-hub-amber animate-pulse' :
            hubOk === null ? 'bg-hub-amber animate-pulse' :
            hubOk ? 'bg-hub-green' :
            'bg-hub-red'
          }`}
        />
        {offlineMode ? 'sistema offline' : offlineModeLoading ? 'stato sistema...' : hubOk === null ? 'connecting...' : hubOk ? 'hub online' : 'hub offline'}
      </div>
    </header>
  );
}
