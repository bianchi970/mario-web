import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import { OfflineModeProvider } from '@/components/layout/OfflineModeProvider';
import { ProjectProvider } from '@/context/ProjectContext';
import { InstallerModeProvider } from '@/context/InstallerModeContext';
import { GatewayProvider } from '@/context/GatewayContext';

export const metadata: Metadata = {
  title: 'MARIO Web',
  description: 'MARIO Hub — Domotics Control Panel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="dark">
      <body className="flex min-h-screen bg-hub-bg">
        <GatewayProvider>
        <ProjectProvider>
          <InstallerModeProvider>
            <OfflineModeProvider>
              <Sidebar />
              <div className="flex-1 flex flex-col min-h-screen overflow-auto pb-16 md:pb-0">
                {children}
              </div>
            </OfflineModeProvider>
          </InstallerModeProvider>
        </ProjectProvider>
        </GatewayProvider>
      </body>
    </html>
  );
}
