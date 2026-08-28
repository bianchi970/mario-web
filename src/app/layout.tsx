import type { Metadata, Viewport } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import EmergencyButton from '@/components/emergency/EmergencyButton';
import { OfflineModeProvider } from '@/components/layout/OfflineModeProvider';
import { ProjectProvider } from '@/context/ProjectContext';
import { InstallerModeProvider } from '@/context/InstallerModeContext';
import { GatewayProvider } from '@/context/GatewayContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { SessionProvider } from '@/context/SessionContext';

export const metadata: Metadata = {
  title: 'HomeMARIO',
  description: 'Domotica locale — controllo casa',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HomeMARIO',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f1117',
};

// Script anti-FOUC: legge mario_theme da localStorage PRIMA di React
// Imposta data-theme sull'elemento <html> per evitare il flash di tema sbagliato
const ANTI_FOUC_SCRIPT = `(function(){
  try {
    var t = localStorage.getItem('mario_theme');
    if (t === 'dark' || t === 'light') {
      document.documentElement.setAttribute('data-theme', t);
    }
    // 'auto' o null: nessun attributo → CSS media query determina il tema
  } catch(e) {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: data-theme può differire tra SSR e client (anti-FOUC)
    <html lang="it" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC: deve essere il primo script, sincrono, prima di qualsiasi render */}
        <script dangerouslySetInnerHTML={{ __html: ANTI_FOUC_SCRIPT }} />
        {/* Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');`,
          }}
        />
      </head>
      <body className="flex min-h-screen" style={{ backgroundColor: 'var(--bg-app)' }}>
        <ThemeProvider>
          <ToastProvider>
            <SessionProvider>
              <GatewayProvider>
                <ProjectProvider>
                  <InstallerModeProvider>
                      <OfflineModeProvider>
                      <Sidebar />
                      <div className="flex-1 flex flex-col min-h-screen overflow-auto pb-16 md:pb-0">
                        {children}
                      </div>
                      <EmergencyButton />
                    </OfflineModeProvider>
                  </InstallerModeProvider>
                </ProjectProvider>
              </GatewayProvider>
            </SessionProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
