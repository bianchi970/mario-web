'use client';

import { createContext, useContext, useMemo, useState } from 'react';

const STORAGE_KEY = 'mario_installer_mode';

type InstallerModeContextValue = {
  installerMode: boolean;
  setInstallerMode: (v: boolean) => void;
};

const InstallerModeContext = createContext<InstallerModeContextValue>({
  installerMode: false,
  setInstallerMode: () => {},
});

function readStoredInstallerMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === 'true';
}

export function InstallerModeProvider({ children }: { children: React.ReactNode }) {
  const [installerMode, setInstallerModeState] = useState<boolean>(() => readStoredInstallerMode());

  const value = useMemo<InstallerModeContextValue>(() => ({
    installerMode,
    setInstallerMode(v: boolean) {
      setInstallerModeState(v);
      if (typeof window !== 'undefined') {
        if (v) {
          window.localStorage.setItem(STORAGE_KEY, 'true');
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
    },
  }), [installerMode]);

  return <InstallerModeContext.Provider value={value}>{children}</InstallerModeContext.Provider>;
}

export function useInstallerMode() {
  return useContext(InstallerModeContext);
}
