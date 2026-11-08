'use client';

import { useTheme, type Theme } from '@/context/ThemeContext';

// Un selettore solo, in due posti: la barra laterale (desktop) e Impostazioni,
// che c'è anche sul telefono — la barra laterale lì è nascosta (8/11/2026).
const THEME_LABELS: { value: Theme; label: string }[] = [
  { value: 'light', label: '☀ Chiaro' },
  { value: 'dark',  label: '☾ Scuro' },
  { value: 'auto',  label: 'Auto' },
];

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Tema">
      {THEME_LABELS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-pressed={theme === value}
          className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
            theme === value
              ? 'bg-primary text-white'
              : 'text-text-2 hover:text-text hover:bg-surface-2'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
