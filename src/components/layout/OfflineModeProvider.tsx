'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

// Lo stato offline sta nel Brain, e ci si arriva dal proxy del Brain: lo stesso
// da casa (LAN) e da fuori (bridge). Fino al 25/10/2026 c'erano due rotte
// `/api/system/*` che andavano solo a BRAIN_URL: dal VPS erano un 502.
const STATUS_URL  = '/api/brain/system/status';
const OFFLINE_URL = '/api/brain/system/offline';

interface OfflineModeContextValue {
  offlineMode: boolean;
  offlineModeLoading: boolean;
  /** true se l'ultima lettura o scrittura non ha detto lo stato: non si sa. */
  offlineModeUnknown: boolean;
  setOfflineMode: (next: boolean) => void;
  toggleOfflineMode: () => void;
}

const OfflineModeContext = createContext<OfflineModeContextValue | null>(null);

/** Lo stato solo se la risposta lo dice davvero; un errore non è «acceso». */
async function statoDa(res: Response): Promise<boolean | null> {
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return typeof data?.offline === 'boolean' ? data.offline : null;
}

export function OfflineModeProvider({ children }: { children: React.ReactNode }) {
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineModeLoading, setOfflineModeLoading] = useState(true);
  const [offlineModeUnknown, setOfflineModeUnknown] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadOfflineMode() {
      setOfflineModeLoading(true);
      try {
        const res = await fetch(STATUS_URL, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        const stato = await statoDa(res);
        if (!active) return;
        if (stato === null) {
          setOfflineModeUnknown(true);
        } else {
          setOfflineMode(stato);
          setOfflineModeUnknown(false);
        }
      } catch {
        if (!active) return;
        setOfflineModeUnknown(true);
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
    void fetch(OFFLINE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ offline: next }),
    })
      .then(statoDa)
      .then((stato) => {
        // Se il Brain non ha risposto con lo stato, il valore di prima resta:
        // non si mostra come fatto un cambio che non è avvenuto.
        if (stato === null) {
          setOfflineModeUnknown(true);
        } else {
          setOfflineMode(stato);
          setOfflineModeUnknown(false);
        }
      })
      .catch(() => {
        setOfflineModeUnknown(true);
      })
      .finally(() => {
        setOfflineModeLoading(false);
      });
  }

  const value = useMemo<OfflineModeContextValue>(() => ({
    offlineMode,
    offlineModeLoading,
    offlineModeUnknown,
    setOfflineMode: (next) => persistOfflineMode(next),
    toggleOfflineMode: () => persistOfflineMode(!offlineMode),
  }), [offlineMode, offlineModeLoading, offlineModeUnknown]);

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
