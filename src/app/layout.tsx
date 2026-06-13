import type { Metadata, Viewport } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import { OfflineModeProvider } from '@/components/layout/OfflineModeProvider';
import { ProjectProvider } from '@/context/ProjectContext';
import { InstallerModeProvider } from '@/context/InstallerModeContext';
import { GatewayProvider } from '@/context/GatewayContext';

export const metadata: Metadata = {
  title: 'MARIO',
  description: 'Domotica locale — controllo casa',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MARIO',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f1117',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');` }} />
      </head>
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
