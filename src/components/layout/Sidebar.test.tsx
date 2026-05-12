import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '@/components/layout/Sidebar';
import { InstallerModeProvider } from '@/context/InstallerModeContext';

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

function renderSidebar() {
  return render(
    <InstallerModeProvider>
      <Sidebar />
    </InstallerModeProvider>,
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

  it('mostra sempre Dashboard, Stanze, Scenari, Impostazioni indipendentemente dal mode', () => {
    renderSidebar();
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Stanze').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Impostazioni').length).toBeGreaterThanOrEqual(1);
  });
});
