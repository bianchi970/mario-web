'use client';

/**
 * GatewayContext — gestisce la lista di gateway MARIO salvati in localStorage.
 *
 * Ogni gateway è un impianto autonomo:
 *   { id, name, url, last_seen?, online? }
 *
 * "Gateway attivo" = quello corrente (url === window.location.origin).
 * Per passare a un altro gateway: redirect a gateway.url.
 *
 * Nessun cloud. Nessun backend centrale. Solo localStorage.
 */

import {
  createContext, useContext, useEffect, useMemo, useState, useCallback,
} from 'react';

export interface GatewayEntry {
  id:        string;   // gateway_id dal hub, oppure uuid locale
  name:      string;
  url:       string;   // es. https://192.168.1.9
  added_at:  string;   // ISO
  last_seen?: string;  // ISO — aggiornato al ping
  online?:   boolean;
}

interface GatewayContextValue {
  gateways:      GatewayEntry[];
  currentUrl:    string;             // URL di questo gateway
  addGateway:    (g: Omit<GatewayEntry, 'added_at'>) => void;
  updateGateway: (id: string, patch: Partial<GatewayEntry>) => void;
  removeGateway: (id: string) => void;
  goToGateway:   (url: string) => void;
}

const STORAGE_KEY = 'mario_gateways';

const GatewayContext = createContext<GatewayContextValue>({
  gateways:      [],
  currentUrl:    '',
  addGateway:    () => {},
  updateGateway: () => {},
  removeGateway: () => {},
  goToGateway:   () => {},
});

function readStored(): GatewayEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch { return []; }
}

function saveStored(list: GatewayEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function GatewayProvider({ children }: { children: React.ReactNode }) {
  const [gateways, setGateways] = useState<GatewayEntry[]>([]);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    setGateways(readStored());
    setCurrentUrl(window.location.origin);
  }, []);

  const persist = useCallback((list: GatewayEntry[]) => {
    setGateways(list);
    saveStored(list);
  }, []);

  const addGateway = useCallback((g: Omit<GatewayEntry, 'added_at'>) => {
    setGateways((prev) => {
      if (prev.some((x) => x.id === g.id || x.url === g.url)) return prev;
      const next = [...prev, { ...g, added_at: new Date().toISOString() }];
      saveStored(next);
      return next;
    });
  }, []);

  const updateGateway = useCallback((id: string, patch: Partial<GatewayEntry>) => {
    setGateways((prev) => {
      const next = prev.map((g) => g.id === id ? { ...g, ...patch } : g);
      saveStored(next);
      return next;
    });
  }, []);

  const removeGateway = useCallback((id: string) => {
    setGateways((prev) => {
      const next = prev.filter((g) => g.id !== id);
      saveStored(next);
      return next;
    });
  }, []);

  const goToGateway = useCallback((url: string) => {
    if (url === currentUrl || url === window.location.origin) return;
    window.location.href = url;
  }, [currentUrl]);

  const value = useMemo<GatewayContextValue>(() => ({
    gateways, currentUrl, addGateway, updateGateway, removeGateway, goToGateway,
  }), [gateways, currentUrl, addGateway, updateGateway, removeGateway, goToGateway]);

  return (
    <GatewayContext.Provider value={value}>
      {children}
    </GatewayContext.Provider>
  );
}

export function useGateway() {
  return useContext(GatewayContext);
}
