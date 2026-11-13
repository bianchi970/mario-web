import { render, screen, fireEvent, within } from '@testing-library/react';
import Sidebar from '@/components/layout/Sidebar';
import { InstallerModeProvider } from '@/context/InstallerModeContext';
import { ProjectProvider } from '@/context/ProjectContext';

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));
let mockRuolo: string | null = null;
jest.mock('@/context/SessionContext', () => ({
  useSession: () => ({ user: mockRuolo ? { id: 'u', username: 'romeo', role: mockRuolo, project_id: null } : null, loading: false, logout: async () => {} }),
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

// 13/11/2026, Romeo: dal telefono «aggiungere dispositivi» e gli allarmi. «Aggiungi»
// compariva solo con l'interruttore installatore del browser (che non è un
// permesso), e Sicurezza non stava nella barra in basso. Chi può aggiungere lo
// dice il ruolo, come per l'Hub (admin, installatore).
describe('Sidebar — dal telefono', () => {
  afterEach(() => { mockRuolo = null; window.localStorage.clear(); });
  const barra = () => within(screen.getByRole('navigation', { name: 'Navigazione principale' }));

  it('NV-01 un amministratore vede «Aggiungi» nella barra del telefono, senza interruttore', () => {
    mockRuolo = 'admin';
    renderSidebar();
    expect(barra().getByText('Aggiungi')).toBeInTheDocument();
  });

  it('NV-02 Sicurezza sta nella barra del telefono', () => {
    renderSidebar();
    expect(barra().getByText('Sicurezza')).toBeInTheDocument();
  });

  it('NV-03 chi non installa non vede «Aggiungi»', () => {
    mockRuolo = 'utente';
    renderSidebar();
    expect(screen.queryByText('Aggiungi')).not.toBeInTheDocument();
  });
});
