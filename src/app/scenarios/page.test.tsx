import { fireEvent, render, screen, within } from '@testing-library/react';
import ScenariosPage from '@/app/scenarios/page';
import { clearStoredScenarios } from '@/lib/scenarios-storage';

jest.mock('@/components/layout/TopBar', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

describe('Scenarios page integration', () => {
  beforeEach(() => {
    clearStoredScenarios();
  });

  it('renders empty state, opens composer, adds a block, creates a scenario, and renders it in the list', () => {
    render(<ScenariosPage />);

    expect(screen.getByText('Nessuno scenario')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Crea scenario' }));

    expect(screen.getByRole('heading', { name: 'Nuovo scenario' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crea scenario' })).toBeDisabled();
    expect(screen.getByText('Nome minimo 3 caratteri.')).toBeInTheDocument();
    expect(screen.getByText('Aggiungi almeno un blocco.')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('Es. Rientro sera');
    fireEvent.change(nameInput, { target: { value: 'Scenario test' } });

    fireEvent.change(screen.getByLabelText('Device scenario'), {
      target: { value: 'garage-cover' },
    });
    fireEvent.change(screen.getByLabelText('Azione scenario'), {
      target: { value: 'open' },
    });
    fireEvent.change(screen.getByLabelText('Tipo scenario'), {
      target: { value: 'automatic' },
    });
    expect(screen.getByLabelText('Condizioni mock')).toBeInTheDocument();
    expect(screen.getByLabelText('Esecuzione stimata')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Trigger scenario'), {
      target: { value: 'schedule' },
    });
    fireEvent.change(screen.getByLabelText('Orario trigger'), {
      target: { value: '08:45' },
    });
    expect(screen.getByLabelText('Riepilogo scenario live')).toHaveTextContent(
      'Automatico | Orario: 08:45 | Condizioni: Fascia oraria | 0 blocchi'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi blocco' }));

    expect(screen.getByText('1 draft')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Esecuzione stimata')).getByText('Sequenza stimata: 1 blocchi in ordine.')).toBeInTheDocument();
    const summary = screen.getByLabelText('Ordine esecuzione');
    expect(within(summary).getByText('Ordine esecuzione')).toBeInTheDocument();
    expect(within(summary).getByText('Garage Cover')).toBeInTheDocument();
    expect(within(summary).getByText('>')).toBeInTheDocument();
    expect(within(summary).getByText('Open')).toBeInTheDocument();
    expect(within(summary).getByText('Inizio')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crea scenario' })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Crea scenario' }));

    expect(screen.getByText('Scenario test')).toBeInTheDocument();

    const scenarioCard = screen.getByText('Scenario test').closest('article');
    expect(scenarioCard).not.toBeNull();

    expect(scenarioCard).toHaveClass('border-hub-accent/40');
    expect(within(scenarioCard as HTMLElement).getByText('1 blocks')).toBeInTheDocument();
    expect(within(scenarioCard as HTMLElement).getByText('Automatico')).toBeInTheDocument();
    const savedTrigger = within(scenarioCard as HTMLElement).getByLabelText('Trigger scenario salvato');
    expect(within(savedTrigger).getByText('Orario')).toBeInTheDocument();
    expect(within(savedTrigger).getByText('08:45')).toBeInTheDocument();
    expect(
      within(scenarioCard as HTMLElement).getByLabelText('Riepilogo scenario')
    ).toHaveTextContent('Automatico | Orario: 08:45 | Condizioni: Fascia oraria | 1 blocchi');
    expect(
      within(scenarioCard as HTMLElement).getByLabelText('Condizioni scenario salvato')
    ).toHaveTextContent('Condizioni Mock Fascia oraria | 22:00 - 06:00');
    const savedSummary = within(scenarioCard as HTMLElement).getByLabelText('Ordine esecuzione');
    expect(within(savedSummary).getByText('Garage Cover')).toBeInTheDocument();
    expect(within(savedSummary).getByText('>')).toBeInTheDocument();
    expect(within(savedSummary).getByText('Open')).toBeInTheDocument();
    expect(within(scenarioCard as HTMLElement).getByText('Blocco 1')).toBeInTheDocument();
  });
});
