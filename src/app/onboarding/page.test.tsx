import { render, screen } from '@testing-library/react';
import OnboardingPage from '@/app/onboarding/page';

jest.mock('@/components/layout/TopBar', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock('@/hooks/useProjectId', () => ({
  useProjectId: jest.fn().mockReturnValue('default'),
}));

jest.mock('@/lib/api/client', () => ({
  fetchAPI: jest.fn(),
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

  it('mostra il pulsante Avvia pairing allo step idle', () => {
    render(<OnboardingPage />);
    expect(screen.getByText('Avvia pairing')).toBeInTheDocument();
  });

  it('mostra la barra step con le label corrette', () => {
    render(<OnboardingPage />);
    expect(screen.getByText('Sessione')).toBeInTheDocument();
    expect(screen.getByText('Fine')).toBeInTheDocument();
  });
});
