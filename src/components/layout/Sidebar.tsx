'use client';

import { SCENARIO_COPY } from '@/components/scenarios/scenario-copy';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useInstallerMode } from '@/context/InstallerModeContext';

const NAV_ALL = [
  { href: '/', label: 'Dashboard', icon: '□', installerOnly: false },
  { href: '/energy', label: 'Energia', icon: '⚡', installerOnly: false },
  { href: '/devices', label: 'Dispositivi', icon: '◈', installerOnly: true },
  { href: '/rooms', label: 'Stanze', icon: '⬜', installerOnly: false },
  { href: '/scenarios', label: SCENARIO_COPY.pageTitle, icon: '▣', installerOnly: false },
  { href: '/onboarding', label: 'Aggiungi', icon: '+', installerOnly: true },
  { href: '/settings', label: 'Impostazioni', icon: '⚙', installerOnly: false },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { installerMode } = useInstallerMode();
  const NAV = NAV_ALL.filter((item) => !item.installerOnly || installerMode);

  return (
    <>
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-hub-surface border-r border-hub-border">
        <div className="px-5 py-5 border-b border-hub-border">
          <span className="font-bold text-lg tracking-tight text-white">MARIO</span>
          <span className="ml-1 text-xs text-hub-accent font-mono">web</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, label, icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-hub-accent/20 text-hub-accent font-medium'
                    : 'text-hub-muted hover:text-hub-text hover:bg-hub-border/30'
                }`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-hub-border text-xs text-hub-muted space-y-1">
          <div>MARIO Gateway</div>
          {installerMode && (
            <div className="text-hub-accent font-medium">Modalità installatore</div>
          )}
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-hub-surface border-t border-hub-border flex">
        {NAV.map(({ href, label, icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                active ? 'text-hub-accent' : 'text-hub-muted'
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
