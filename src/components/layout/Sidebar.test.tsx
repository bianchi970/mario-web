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
function renderSidebar(energia?: Record<string, unknown>) {
  global.fetch = jest.fn((url: string) => (energia && String(url).includes('/energy/')
    ? Promise.resolve({ ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => energia, text: async () => JSON.stringify(energia) })
    : Promise.reject(new Error('rete')))) as unknown as typeof fetch;
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

  // Proposta 4 (Romeo: sì, 14/11/2026): decide il RUOLO, come l'Hub. La spunta
  // installatore del browser la può accendere chiunque e vale solo lì: resta
  // per mostrare i dettagli tecnici, non apre pagine.
  it('RU-01 la spunta installatore da sola NON apre Dispositivi né Aggiungi', () => {
    window.localStorage.setItem('mario_installer_mode', 'true');
    mockRuolo = 'utente';
    renderSidebar();
    expect(screen.queryByText('Dispositivi')).not.toBeInTheDocument();
    expect(screen.queryByText('Aggiungi')).not.toBeInTheDocument();
    expect(screen.queryByText('Storico')).not.toBeInTheDocument();
    mockRuolo = null;
  });

  it('RU-02 un installatore vede Storico e Gateway senza la spunta', () => {
    mockRuolo = 'installatore';
    renderSidebar();
    expect(screen.getAllByText('Storico').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Gateway').length).toBeGreaterThanOrEqual(1);
    mockRuolo = null;
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

// Proposta 3 (Romeo: sì, 14/11/2026): Energia diceva «nessuna misura» — la presa
// Matter non misura il consumo. Si mostra quando l'Hub ha una misura vera.
describe('Sidebar — Energia solo con una misura', () => {
  it('EN-01 nessuna misura (null, che non è 0): Energia non c\'è', async () => {
    window.localStorage.setItem('mario_project_id', 'default');
    renderSidebar({ ok: true, today_wh: null, week_wh: null, month_wh: null, current_w: null, peak_w: null });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText('Energia')).not.toBeInTheDocument();
  });

  it('EN-02 una misura nel mese: Energia compare', async () => {
    window.localStorage.setItem('mario_project_id', 'default');
    renderSidebar({ ok: true, today_wh: 0, week_wh: 120, month_wh: 480, current_w: null, peak_w: 60 });
    expect(await screen.findAllByText('Energia')).not.toHaveLength(0);
  });

  it('EN-03 l\'Hub non risponde: Energia non c\'è (non si promette una pagina vuota)', async () => {
    renderSidebar();
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText('Energia')).not.toBeInTheDocument();
  });
});
