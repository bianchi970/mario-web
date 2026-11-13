'use client';

import Image from 'next/image';
import { useState } from 'react';
import EmergencyButton from '@/components/emergency/EmergencyButton';
import {
  Home, LayoutGrid, Settings, Shield, Zap,
  Clock, Cpu, Plus, Router, Download, type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useInstallerMode } from '@/context/InstallerModeContext';
import { useSession } from '@/context/SessionContext';
import ThemeSelector from '@/components/ui/ThemeSelector';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** 'tutti' · 'chi-aggiunge' (il ruolo: admin, installatore — come l'Hub) · 'installatore' (l'interruttore) */
  perChi: 'tutti' | 'chi-aggiunge' | 'installatore';
  mobileHidden: boolean;
}

// Nella barra del telefono (13/11/2026, Romeo: comandare, allarmi, aggiungere
// dal telefono): Casa · Stanze · Sicurezza · Aggiungi · Impostazioni.
// «Aggiungi» e «Dispositivi» li vede chi l'Hub lascia aggiungere: fino a oggi
// solo con l'interruttore installatore del browser, che non è un permesso.
const NAV_ALL: NavItem[] = [
  { href: '/',           label: 'Casa',         Icon: Home,       perChi: 'tutti',        mobileHidden: false },
  { href: '/rooms',      label: 'Stanze',       Icon: LayoutGrid, perChi: 'tutti',        mobileHidden: false },
  { href: '/security',   label: 'Sicurezza',    Icon: Shield,     perChi: 'tutti',        mobileHidden: false },
  { href: '/onboarding', label: 'Aggiungi',     Icon: Plus,       perChi: 'chi-aggiunge', mobileHidden: false },
  { href: '/settings',   label: 'Impostazioni', Icon: Settings,   perChi: 'tutti',        mobileHidden: false },
  { href: '/energy',     label: 'Energia',      Icon: Zap,        perChi: 'tutti',        mobileHidden: true },
  { href: '/devices',    label: 'Dispositivi',  Icon: Cpu,        perChi: 'chi-aggiunge', mobileHidden: true },
  { href: '/storico',    label: 'Storico',      Icon: Clock,      perChi: 'installatore', mobileHidden: true },
  { href: '/gateways',   label: 'Gateway',      Icon: Router,     perChi: 'installatore', mobileHidden: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { installerMode } = useInstallerMode();
  const { canInstall, install } = usePWAInstall();
  const [logoOpen, setLogoOpen] = useState(false);

  const { user } = useSession();
  const aggiunge = installerMode || user?.role === 'admin' || user?.role === 'installatore';
  const NAV        = NAV_ALL.filter((item) =>
    item.perChi === 'tutti' || (item.perChi === 'chi-aggiunge' ? aggiunge : installerMode));
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
                    ? 'bg-primary/15 text-primary-ink font-medium'
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
          <EmergencyButton variant="sidebar" />
          {canInstall && (
            <button
              onClick={() => void install()}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-primary-ink bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <Download size={14} />
              Installa app
            </button>
          )}
          {installerMode && (
            <div className="text-xs text-primary-ink font-medium px-1">Modalità installatore</div>
          )}
          <ThemeSelector />
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
                active ? 'text-primary-ink' : 'text-text-2'
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
