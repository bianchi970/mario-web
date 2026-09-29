import { render, screen } from '@testing-library/react';
import OnboardingPage from '@/app/onboarding/page';

jest.mock('@/components/layout/TopBar', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock('@/hooks/useProjectId', () => ({
  useProjectId: jest.fn().mockReturnValue('default'),
}));

// La pagina avvia una scansione di rete al mount. Con `jest.fn()` nudo la
// chiamata risolveva `undefined`, la scansione andava in errore e React
// segnalava un aggiornamento di stato fuori da act(): il test falliva per il
// proprio mock incompleto, non per la pagina.
jest.mock('@/lib/api/client', () => ({
  fetchAPI: jest.fn().mockResolvedValue({ devices: [], success: true, data: [] }),
  ApiClientError: class ApiClientError extends Error {},
}));

jest.mock('@/lib/api/rooms', () => ({
  listRooms: jest.fn().mockResolvedValue([]),
}));

describe('OnboardingPage', () => {
  it('mostra il titolo nella TopBar', () => {
    render(<OnboardingPage />);
    expect(screen.getByText('Aggiungi dispositivo')).toBeInTheDocument();
  });

  // Il test cercava "Avvia pairing". Quel pulsante non esiste più: l'onboarding
  // ora parte dalla SCOPERTA dei dispositivi sulla rete, con due modi —
  // scansione automatica o inserimento manuale dell'IP — e la sessione di
  // inclusione arriva dopo. Il test inseguiva una UX superata.
  it('allo stato iniziale offre i due modi per trovare un dispositivo', () => {
    render(<OnboardingPage />);
    expect(screen.getByRole('button', { name: /scopri/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /per ip/i })).toBeInTheDocument();
    expect(screen.getByText('Dispositivi sulla rete locale')).toBeInTheDocument();
  });

  // La barra step è `['Registrato','Stanza','Test','Fine']` e viene resa solo
  // quando la sessione è aperta (`!isIdle`). Asserirla allo stato iniziale era
  // sbagliato per costruzione. Il comportamento che vale la pena verificare è
  // l'opposto: a riposo la barra NON deve comparire.
  it('non mostra la barra step finché la sessione non è aperta', () => {
    render(<OnboardingPage />);
    expect(screen.queryByText('Registrato')).not.toBeInTheDocument();
    expect(screen.queryByText('Fine')).not.toBeInTheDocument();
  });
});
