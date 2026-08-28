'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  Home, LayoutGrid, Wand2, Settings, Shield, Zap,
  Clock, Cpu, Plus, Router, Download, type LucideIcon,
} from 'lucide-react';
import { SCENARIO_COPY } from '@/components/scenarios/scenario-copy';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useInstallerMode } from '@/context/InstallerModeContext';
import { useTheme } from '@/context/ThemeContext';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
  installerOnly: boolean;
  mobileHidden: boolean;
}

// mobileHidden: non appare nella bottom nav mobile (solo sidebar desktop)
// Routine e Storico aggiunti al nav utente in B97-C dopo che le pagine sono pronte.
const NAV_ALL: NavItem[] = [
  { href: '/',           label: 'Casa',                      Icon: Home,       installerOnly: false, mobileHidden: false },
  { href: '/rooms',      label: 'Stanze',                    Icon: LayoutGrid, installerOnly: false, mobileHidden: false },
  { href: '/scenarios',  label: SCENARIO_COPY.pageTitle,     Icon: Wand2,      installerOnly: false, mobileHidden: false },
  { href: '/settings',   label: 'Impostazioni',              Icon: Settings,   installerOnly: false, mobileHidden: false },
  { href: '/security',   label: 'Sicurezza',                 Icon: Shield,     installerOnly: false, mobileHidden: true },
  { href: '/energy',     label: 'Energia',                   Icon: Zap,        installerOnly: false, mobileHidden: true },
  // Storico: visibile a tutti in B97-C (ora solo installatore)
  { href: '/storico',    label: 'Storico',                   Icon: Clock,      installerOnly: true,  mobileHidden: true },
  // Routine: aggiunto in B97-C quando la pagina sarà disponibile
  { href: '/devices',    label: 'Dispositivi',               Icon: Cpu,        installerOnly: true,  mobileHidden: true },
  { href: '/onboarding', label: 'Aggiungi',                  Icon: Plus,       installerOnly: true,  mobileHidden: true },
  { href: '/gateways',   label: 'Gateway',                   Icon: Router,     installerOnly: true,  mobileHidden: true },
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
  const { canInstall, install } = usePWAInstall();
  const [logoOpen, setLogoOpen] = useState(false);

  const NAV        = NAV_ALL.filter((item) => !item.installerOnly || installerMode);
  const MOBILE_NAV = NAV.filter((item) => !item.mobileHidden);

  return (
    <>
      {/* ── Sidebar desktop ─────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-surface border-r border-border">
        {/* Logo HomeMARIO — click per ingrandire */}
        <div className="px-4 py-4 border-b border-border flex items-center justify-center bg-white">
          <button onClick={() => setLogoOpen(true)} className="focus:outline-none">
            <Image
              src="/logo-mario.png?v=2"
              alt="HomeMARIO"
              width={160}
              height={160}
              className="w-full max-w-[140px] h-auto cursor-pointer hover:scale-105 transition-transform"
              priority
            />
          </button>
        </div>

        {/* Lightbox logo */}
        {logoOpen && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70"
            onClick={() => setLogoOpen(false)}
          >
            <div className="bg-white rounded-2xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <Image src="/logo-mario.png?v=2" alt="HomeMARIO" width={400} height={400} className="w-80 h-auto" />
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-text-2 hover:text-text hover:bg-surface-2'
                }`}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer: installa PWA + modalità installatore + selettore tema */}
        <div className="px-4 py-4 border-t border-border space-y-3">
          {canInstall && (
            <button
              onClick={() => void install()}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <Download size={14} />
              Installa app
            </button>
          )}
          {installerMode && (
            <div className="text-xs text-primary font-medium px-1">Modalità installatore</div>
          )}
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
        {MOBILE_NAV.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
                active ? 'text-primary' : 'text-text-2'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
