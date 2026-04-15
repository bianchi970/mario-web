'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface OfflineModeContextValue {
  offlineMode: boolean;
  offlineModeLoading: boolean;
  setOfflineMode: (next: boolean) => void;
  toggleOfflineMode: () => void;
}

const OfflineModeContext = createContext<OfflineModeContextValue | null>(null);

export function OfflineModeProvider({ children }: { children: React.ReactNode }) {
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineModeLoading, setOfflineModeLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadOfflineMode() {
      setOfflineModeLoading(true);
      try {
        const res = await fetch('/api/system/status', {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        const data = await res.json().catch(() => ({ offline: false }));
        if (!active) return;
        setOfflineMode(data?.offline === true);
      } catch {
        if (!active) return;
        setOfflineMode(false);
      } finally {
        if (active) {
          setOfflineModeLoading(false);
        }
      }
    }

    void loadOfflineMode();

    return () => {
      active = false;
    };
  }, []);

  function persistOfflineMode(next: boolean) {
    setOfflineModeLoading(true);
    void fetch('/api/system/offline', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ offline: next }),
    })
      .then((res) => res.json().catch(() => ({ offline: next })))
      .then((data) => {
        setOfflineMode(data?.offline === true);
      })
      .catch(() => {
        setOfflineMode((current) => current);
      })
      .finally(() => {
        setOfflineModeLoading(false);
      });
  }

  const value = useMemo<OfflineModeContextValue>(() => ({
    offlineMode,
    offlineModeLoading,
    setOfflineMode: (next) => persistOfflineMode(next),
    toggleOfflineMode: () => persistOfflineMode(!offlineMode),
  }), [offlineMode, offlineModeLoading]);

  return (
    <OfflineModeContext.Provider value={value}>
      {children}
    </OfflineModeContext.Provider>
  );
}

export function useOfflineMode() {
  const context = useContext(OfflineModeContext);

  if (!context) {
    throw new Error('useOfflineMode must be used within OfflineModeProvider');
  }

  return context;
}
