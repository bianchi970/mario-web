import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '@/components/layout/Sidebar';
import { InstallerModeProvider } from '@/context/InstallerModeContext';
import { ProjectProvider } from '@/context/ProjectContext';

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

// Come nel layout: la Sidebar sta dentro ProjectProvider (il pulsante SOS legge
// il contatto della casa, 7/11/2026). La rete non risponde: si vede il 112.
function renderSidebar() {
  global.fetch = jest.fn().mockRejectedValue(new Error('rete')) as unknown as typeof fetch;
  return render(
    <ProjectProvider>
      <InstallerModeProvider>
        <Sidebar />
      </InstallerModeProvider>
    </ProjectProvider>,
  );
}

describe('Sidebar — installer mode nav filtering', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('nasconde Dispositivi e Aggiungi in modalità cliente (default)', () => {
    renderSidebar();
    expect(screen.queryByText('Dispositivi')).not.toBeInTheDocument();
    expect(screen.queryByText('Aggiungi')).not.toBeInTheDocument();
  });

  it('mostra Dispositivi e Aggiungi quando installer mode è attivo da localStorage', () => {
    window.localStorage.setItem('mario_installer_mode', 'true');
    renderSidebar();
    // desktop sidebar + mobile nav → 2 occorrenze ciascuna
    expect(screen.getAllByText('Dispositivi').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Aggiungi').length).toBeGreaterThanOrEqual(1);
  });

  it('mostra sempre Casa, Stanze, Impostazioni indipendentemente dal mode', () => {
    renderSidebar();
    expect(screen.getAllByText('Casa').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Stanze').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Impostazioni').length).toBeGreaterThanOrEqual(1);
  });
});
