'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light' | 'auto';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'auto',
  setTheme: () => {},
});

function applica(t: Theme) {
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('auto');

  // Il tema salvato si RIAPPLICA, non solo si legge: l'attributo messo dallo
  // script anti-FOUC si perde se React ridisegna dopo un'hydration fallita, e
  // «scuro» diventava «Auto» (7/11/2026, TH-01).
  useEffect(() => {
    const saved = localStorage.getItem('mario_theme') as Theme | null;
    if (saved === 'dark' || saved === 'light' || saved === 'auto') {
      setThemeState(saved);
      applica(saved);
    }
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem('mario_theme', t);
    applica(t);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
