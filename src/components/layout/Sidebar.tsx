'use client';

import { SCENARIO_COPY } from '@/components/scenarios/scenario-copy';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useInstallerMode } from '@/context/InstallerModeContext';
import { useTheme } from '@/context/ThemeContext';

// mobileHidden: non appare nella bottom nav mobile (solo sidebar desktop)
// Routine (B97-C) e Storico (B97-C) aggiunti al nav utente solo dopo che le
// rispettive pagine sono completate e autorizzate.
const NAV_ALL = [
  { href: '/',           label: 'Casa',         icon: '□',  installerOnly: false, mobileHidden: false },
  { href: '/rooms',      label: 'Stanze',       icon: '⬜', installerOnly: false, mobileHidden: false },
  { href: '/scenarios',  label: SCENARIO_COPY.pageTitle, icon: '▣', installerOnly: false, mobileHidden: false },
  { href: '/settings',   label: 'Impostazioni', icon: '⚙', installerOnly: false, mobileHidden: false },
  { href: '/security',   label: 'Sicurezza',    icon: '🛡', installerOnly: false, mobileHidden: true },
  { href: '/energy',     label: 'Energia',      icon: '⚡', installerOnly: false, mobileHidden: true },
  // Storico: diventa visibile a tutti in B97-C (ora solo installatore)
  { href: '/storico',    label: 'Storico',      icon: '◷', installerOnly: true,  mobileHidden: true },
  // Routine: aggiunto in B97-C quando la pagina sarà disponibile
  { href: '/devices',    label: 'Dispositivi',  icon: '◈', installerOnly: true,  mobileHidden: true },
  { href: '/onboarding', label: 'Aggiungi',     icon: '+',  installerOnly: true,  mobileHidden: true },
  { href: '/gateways',   label: 'Gateway',      icon: '⊞', installerOnly: true,  mobileHidden: true },
];

const THEME_LABELS: { value: 'light' | 'dark' | 'auto'; label: string }[] = [
  { value: 'light', label: '☀' },
  { value: 'dark',  label: '☾' },
  { value: 'auto',  label: 'Auto' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { installerMode } = useInstallerMode();
  const { theme, setTheme } = useTheme();

  const NAV        = NAV_ALL.filter((item) => !item.installerOnly || installerMode);
  const MOBILE_NAV = NAV.filter((item) => !item.mobileHidden);

  return (
    <>
      {/* ── Sidebar desktop ─────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-surface border-r border-border">
        {/* Logo HomeMARIO */}
        <div className="px-5 py-5 border-b border-border flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center
            text-white text-xs font-bold flex-shrink-0">
            M
          </div>
          <span className="font-bold text-base tracking-tight text-text">HomeMARIO</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, label, icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-primary/20 text-primary font-medium'
                    : 'text-text-2 hover:text-text hover:bg-surface-2'
                }`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer: modalità installatore + selettore tema */}
        <div className="px-4 py-4 border-t border-border space-y-3">
          {installerMode && (
            <div className="text-xs text-primary font-medium px-1">Modalità installatore</div>
          )}
          {/* Selettore tema dark/light/auto */}
          <div className="flex items-center gap-1" role="group" aria-label="Tema">
            {THEME_LABELS.map(({ value, label }) => (
              <button
                key={value}
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
        </div>
      </aside>

      {/* ── Bottom nav mobile ────────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border flex"
        aria-label="Navigazione principale"
      >
        {MOBILE_NAV.map(({ href, label, icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                active ? 'text-primary' : 'text-text-2'
              }`}
            >
              <span className="text-lg leading-none">{icon}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
