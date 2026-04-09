import { fireEvent, render, screen, within } from '@testing-library/react';
import ScenarioComposer from '@/components/scenarios/ScenarioComposer';
import ScenariosEmptyState from '@/components/scenarios/ScenariosEmptyState';
import ScenariosList from '@/components/scenarios/ScenariosList';
import { clearStoredScenarios } from '@/lib/scenarios-storage';
import {
  formatScenarioTriggerLabel,
  formatScenarioTypeLabel,
} from '@/lib/scenario-types';
import { SCENARIO_MOCK_DEVICES } from '@/lib/scenarios-mock';
import { useScenarioBuilder } from '@/hooks/useScenarioBuilder';

function ScenarioComposerHarness() {
  const scenarioBuilder = useScenarioBuilder({
    initialScenarios: [],
    devices: SCENARIO_MOCK_DEVICES,
  });

  return (
    <ScenarioComposer
      name={scenarioBuilder.scenarioName}
      blocks={scenarioBuilder.draftBlocks}
      devices={SCENARIO_MOCK_DEVICES}
      selectedDevice={scenarioBuilder.selectedDevice}
      selectedAction={scenarioBuilder.selectedAction}
      selectedScenarioType={scenarioBuilder.selectedScenarioType}
      selectedTriggerType={scenarioBuilder.selectedTriggerType}
      selectedTriggerTime={scenarioBuilder.selectedTriggerTime}
      selectedTriggerDevice={scenarioBuilder.selectedTriggerDevice}
      canCreate={scenarioBuilder.canCreateScenario}
      validationMessages={scenarioBuilder.validationMessages}
      onNameChange={scenarioBuilder.setScenarioName}
      onSelectedDeviceChange={scenarioBuilder.setSelectedDevice}
      onSelectedActionChange={scenarioBuilder.setSelectedAction}
      onSelectedScenarioTypeChange={scenarioBuilder.setSelectedScenarioType}
      onSelectedTriggerTypeChange={scenarioBuilder.setSelectedTriggerType}
      onSelectedTriggerTimeChange={scenarioBuilder.setSelectedTriggerTime}
      onSelectedTriggerDeviceChange={scenarioBuilder.setSelectedTriggerDevice}
      onAddBlock={scenarioBuilder.addBlock}
      onRemoveBlock={scenarioBuilder.removeDraftBlock}
      onMoveBlockUp={scenarioBuilder.moveDraftBlockUp}
      onMoveBlockDown={scenarioBuilder.moveDraftBlockDown}
      onClose={scenarioBuilder.closeComposer}
      onCreate={scenarioBuilder.createScenario}
    />
  );
}

describe('Scenarios UI', () => {
  beforeEach(() => {
    clearStoredScenarios();
  });

  it('renders the empty state when the scenarios list is empty', () => {
    render(<ScenariosEmptyState onCreate={() => undefined} />);

    expect(screen.getByText('Nessuno scenario')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crea scenario' })).toBeInTheDocument();
  });

  it('lets the user enter a name and add a block in ScenarioComposer', () => {
    render(<ScenarioComposerHarness />);

    const createButton = screen.getByRole('button', { name: 'Crea scenario' });
    expect(createButton).toBeDisabled();
    expect(screen.getByText('Nome minimo 3 caratteri.')).toBeInTheDocument();
    expect(screen.getByText('Aggiungi almeno un blocco.')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Es. Rientro sera');
    fireEvent.change(input, { target: { value: 'Mattina smart' } });
    expect(input).toHaveValue('Mattina smart');
    expect(screen.getByLabelText('Composer scenario Manuale')).toHaveClass('border-hub-border');
    expect(screen.getByRole('option', { name: '+ On' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '- Off' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '> Open' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '< Close' })).toBeInTheDocument();
    const scenarioTypeSelect = screen.getByLabelText('Tipo scenario');
    expect(
      within(scenarioTypeSelect).getByRole('option', {
        name: formatScenarioTypeLabel('manual'),
      })
    ).toBeInTheDocument();
    expect(
      within(scenarioTypeSelect).getByRole('option', {
        name: formatScenarioTypeLabel('automatic'),
      })
    ).toBeInTheDocument();
    const scenarioTriggerSelect = screen.getByLabelText('Trigger scenario');
    expect(
      within(scenarioTriggerSelect).getByRole('option', {
        name: formatScenarioTriggerLabel('manual'),
      })
    ).toBeInTheDocument();
    expect(
      within(scenarioTriggerSelect).getByRole('option', {
        name: formatScenarioTriggerLabel('schedule'),
      })
    ).toBeInTheDocument();
    expect(
      within(scenarioTriggerSelect).getByRole('option', {
        name: formatScenarioTriggerLabel('device_event'),
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    const selectedType = screen.getByLabelText('Tipo scenario selezionato');
    expect(within(selectedType).getByText('Modalita')).toBeInTheDocument();
    expect(within(selectedType).getByText(formatScenarioTypeLabel('manual'))).toBeInTheDocument();
    const selectedTrigger = screen.getByLabelText('Trigger scenario selezionato');
    expect(within(selectedTrigger).getByText('Trigger')).toBeInTheDocument();
    expect(within(selectedTrigger).getByText(formatScenarioTriggerLabel('manual'))).toBeInTheDocument();
    expect(screen.getByLabelText('Riepilogo scenario live')).toHaveTextContent(
      'Manuale | Trigger: Manuale | 0 blocchi'
    );
    expect(screen.queryByLabelText('Esecuzione stimata')).not.toBeInTheDocument();
    const exampleBlock = screen.getByLabelText('Esempio blocco');
    expect(within(exampleBlock).getByText('Living Light')).toBeInTheDocument();
    expect(within(exampleBlock).getByText('+')).toBeInTheDocument();
    expect(within(exampleBlock).getByText('On')).toBeInTheDocument();
    const emptyHint = screen.getByLabelText('Hint blocco vuoto');
    expect(within(emptyHint).getByText('Living Light')).toBeInTheDocument();
    expect(within(emptyHint).getByText('+')).toBeInTheDocument();
    expect(within(emptyHint).getByText('On')).toBeInTheDocument();
    expect(screen.getAllByText('+').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Orario trigger')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Device trigger')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Condizioni mock')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi blocco' }));

    expect(screen.getByText('1 draft')).toBeInTheDocument();
    const summary = screen.getByLabelText('Ordine esecuzione');
    expect(within(summary).getByText('Ordine esecuzione')).toBeInTheDocument();
    expect(within(summary).getByText('Living Light')).toBeInTheDocument();
    expect(within(summary).getByText('+')).toBeInTheDocument();
    expect(within(summary).getByText('On')).toBeInTheDocument();
    expect(within(summary).getByText('Inizio')).toBeInTheDocument();
    expect(createButton).not.toBeDisabled();
  });

  it('removes a draft block in ScenarioComposer', () => {
    render(<ScenarioComposerHarness />);

    fireEvent.change(screen.getByPlaceholderText('Es. Rientro sera'), {
      target: { value: 'Mattina smart' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi blocco' }));

    expect(screen.getByText('1 draft')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi blocco 1' }));

    expect(screen.getByText('0 draft')).toBeInTheDocument();
    expect(screen.getByText('Nessun blocco azione.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crea scenario' })).toBeDisabled();
  });

  it('reorders draft blocks in ScenarioComposer', () => {
    render(<ScenarioComposerHarness />);

    fireEvent.change(screen.getByPlaceholderText('Es. Rientro sera'), {
      target: { value: 'Mattina smart' },
    });

    fireEvent.change(screen.getByLabelText('Device scenario'), {
      target: { value: 'living-light' },
    });
    fireEvent.change(screen.getByLabelText('Azione scenario'), {
      target: { value: 'on' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi blocco' }));

    fireEvent.change(screen.getByLabelText('Device scenario'), {
      target: { value: 'garage-cover' },
    });
    fireEvent.change(screen.getByLabelText('Azione scenario'), {
      target: { value: 'open' },
    });
    fireEvent.change(screen.getByLabelText('Trigger scenario'), {
      target: { value: 'device_event' },
    });
    fireEvent.change(screen.getByLabelText('Tipo scenario'), {
      target: { value: 'automatic' },
    });
    expect(screen.getByLabelText('Composer scenario Automatico')).toHaveClass('border-hub-accent/40');
    const executionSummary = screen.getByLabelText('Esecuzione stimata');
    expect(within(executionSummary).getByText('Esecuzione stimata')).toBeInTheDocument();
    expect(within(executionSummary).getByText('Mock')).toBeInTheDocument();
    expect(within(executionSummary).getByText('Partenza automatica prevista dopo trigger valido.')).toBeInTheDocument();
    const conditions = screen.getByLabelText('Condizioni mock');
    const conditionsSummary = within(conditions).getByLabelText('Riepilogo condizioni mock');
    expect(conditionsSummary).toHaveTextContent(
      'Condizioni Mock Fascia oraria | 22:00 - 06:00'
    );
    expect(within(conditions).getByLabelText('Tipo condizione mock')).toBeInTheDocument();
    expect(within(conditions).getByLabelText('Valore condizione mock')).toHaveValue('22:00 - 06:00');
    fireEvent.change(screen.getByLabelText('Device trigger'), {
      target: { value: 'garage-cover' },
    });
    expect(screen.getByLabelText('Riepilogo scenario live')).toHaveTextContent(
      'Automatico | Evento device: Garage Cover | Condizioni: Fascia oraria | 1 blocchi'
    );
    expect(within(executionSummary).getByText('Sequenza stimata: 1 blocchi in ordine.')).toBeInTheDocument();
    expect(screen.getByLabelText('Device trigger')).toBeInTheDocument();
    const selectedTrigger = screen.getByLabelText('Trigger scenario selezionato');
    expect(within(selectedTrigger).getByText(formatScenarioTriggerLabel('device_event'))).toBeInTheDocument();
    expect(within(selectedTrigger).getByText('Garage Cover')).toBeInTheDocument();
    const exampleBlock = screen.getByLabelText('Esempio blocco');
    expect(within(exampleBlock).getByText('Garage Cover')).toBeInTheDocument();
    expect(within(exampleBlock).getByText('>')).toBeInTheDocument();
    expect(within(exampleBlock).getByText('Open')).toBeInTheDocument();
    expect(screen.getAllByText('Open').length).toBeGreaterThan(0);
    expect(screen.getAllByText('>').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi blocco' }));

    const beforeMoveRows = screen.getAllByText(/Blocco /);
    expect(beforeMoveRows[0]).toHaveTextContent('Blocco 1');
    const summary = screen.getByLabelText('Ordine esecuzione');
    expect(within(summary).getByText('Living Light')).toBeInTheDocument();
    expect(within(summary).getByText('Garage Cover')).toBeInTheDocument();
    expect(within(summary).getByText('+')).toBeInTheDocument();
    expect(within(summary).getByText('>')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sposta su blocco 2' }));

    const movedRows = screen.getAllByText(/Blocco /);
    expect(movedRows[0]).toHaveTextContent('Blocco 1');
    const movedSummary = screen.getByLabelText('Ordine esecuzione');
    const summaryText = movedSummary.textContent ?? '';
    expect(summaryText.indexOf('Garage Cover')).toBeLessThan(
      summaryText.indexOf('Living Light')
    );
    expect(within(movedSummary).getByText('Inizio')).toBeInTheDocument();
    expect(within(movedSummary).getByText('Fine')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sposta giu blocco 1' }));

    const resetSummary = screen.getByLabelText('Ordine esecuzione');
    const resetSummaryText = resetSummary.textContent ?? '';
    expect(resetSummaryText.indexOf('Living Light')).toBeLessThan(
      resetSummaryText.indexOf('Garage Cover')
    );
  });

  it('renders a created scenario in ScenariosList', () => {
    render(
      <ScenariosList
        scenarios={[
          {
            id: 'scenario-1',
            name: 'Rientro sera',
            type: 'automatic',
            trigger: {
              type: 'schedule',
              time: '08:00',
            },
            blocks: [
              {
                id: 'block-1',
                deviceId: 'garage-cover',
                action: 'open',
              },
            ],
          },
        ]}
        devices={SCENARIO_MOCK_DEVICES}
      />
    );

    const scenarioCard = screen.getByText('Rientro sera').closest('article');

    expect(scenarioCard).not.toBeNull();
    expect(scenarioCard).toHaveClass('border-hub-accent/40');
    expect(within(scenarioCard as HTMLElement).getByText('1 blocks')).toBeInTheDocument();
    expect(
      within(scenarioCard as HTMLElement).getByText(formatScenarioTypeLabel('automatic'))
    ).toBeInTheDocument();
    expect(
      within(scenarioCard as HTMLElement).getByText(formatScenarioTriggerLabel('schedule'))
    ).toBeInTheDocument();
    expect(within(scenarioCard as HTMLElement).getByText('08:00')).toBeInTheDocument();
    expect(
      within(scenarioCard as HTMLElement).getByLabelText('Riepilogo scenario')
    ).toHaveTextContent('Automatico | Orario: 08:00 | Condizioni: Fascia oraria | 1 blocchi');
    expect(
      within(scenarioCard as HTMLElement).getByLabelText('Condizioni scenario salvato')
    ).toHaveTextContent('Condizioni Mock Fascia oraria | 22:00 - 06:00');
    const summary = within(scenarioCard as HTMLElement).getByLabelText('Ordine esecuzione');
    expect(within(summary).getByText('Ordine esecuzione')).toBeInTheDocument();
    expect(within(summary).getByText('Garage Cover')).toBeInTheDocument();
    expect(within(summary).getByText('>')).toBeInTheDocument();
    expect(within(summary).getByText('Open')).toBeInTheDocument();
    expect(within(summary).getByText('Inizio')).toBeInTheDocument();
    expect(within(scenarioCard as HTMLElement).getByText('Blocco 1')).toBeInTheDocument();
  });
});
