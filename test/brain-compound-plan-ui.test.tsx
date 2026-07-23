/**
 * B86 — outcome=plan compound alias fast path
 *
 * Verifica che NLCommandBar gestisca correttamente la risposta del brain
 * con outcome='plan' e _v2.plan=[{device_id, action}] (compound alias "A e B").
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NLCommandBar from '@/components/brain/NLCommandBar';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

/** Risposta brain B86: "accendi luce cucina e luce soggiorno" — low risk, auto-dispatch */
const planResponseLow = {
  ok: true,
  status: 200,
  json: async () => ({
    intent: 'device_control',
    action: null,
    target: null,
    parameters: {},
    risk: 'low',
    requires_confirmation: false,
    confidence: 1.0,
    reason: null,
    dispatchable: false,
    commands: [],
    suggest_diagnose: false,
    provider: 'mario-ai-v2',
    input_text: 'accendi luce cucina e luce soggiorno',
    _v2: {
      outcome: 'plan',
      plan: [
        { device_id: 'rele-canale-1', action: 'turn_on' },
        { device_id: '2-ep1',         action: 'turn_on' },
      ],
    },
  }),
};

/** Risposta executeCompoundPlan: già terminato con successo */
const execResponse = {
  ok: true,
  status: 200,
  json: async () => ({
    execution_id: 'exec-001',
    status:       'succeeded',
    steps_done:   2,
    steps_total:  2,
    steps_failed: 0,
    steps: [
      { step_index: 0, device_id: 'rele-canale-1', device_ids: [], action: 'turn_on', status: 'succeeded', dependency_type: 'parallel', depends_on: null, description: null },
      { step_index: 1, device_id: '2-ep1',         device_ids: [], action: 'turn_on', status: 'succeeded', dependency_type: 'parallel', depends_on: null, description: null },
    ],
  }),
};

/** Risposta brain B86 con risk=high → mostra preview */
const planResponseHigh = {
  ok: true,
  status: 200,
  json: async () => ({
    intent: 'device_control',
    action: null,
    target: null,
    parameters: {},
    risk: 'high',
    requires_confirmation: true,
    confidence: 1.0,
    reason: null,
    dispatchable: false,
    commands: [],
    suggest_diagnose: false,
    provider: 'mario-ai-v2',
    input_text: 'spegni tutto',
    _v2: {
      outcome: 'plan',
      plan: [
        { device_id: 'rele-canale-1', action: 'turn_off' },
        { device_id: '2-ep1',         action: 'turn_off' },
      ],
    },
  }),
};

describe('NLCommandBar — B86 compound plan (outcome=plan)', () => {
  test('auto-dispatches outcome=plan (low risk) senza passare per preview', async () => {
    fetchMock
      .mockResolvedValueOnce(planResponseLow)  // POST /api/brain/interpret
      .mockResolvedValueOnce(execResponse);    // POST /api/hub/ui/command/compound

    render(<NLCommandBar projectId="default" />);

    fireEvent.change(screen.getByPlaceholderText(/accendi/i), {
      target: { value: 'accendi luce cucina e luce soggiorno' },
    });
    // Il pulsante Send non ha testo visibile — stessa tecnica degli altri test
    fireEvent.click(screen.getByRole('button', { name: '' }));

    // Non deve mostrare il bottone Annulla del preview
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /annulla/i })).not.toBeInTheDocument();
    });

    // Deve raggiungere lo stato success ("Fatto." per run già terminale)
    await waitFor(() => {
      expect(screen.getByText(/Fatto\./i)).toBeInTheDocument();
    });
  });

  test('outcome=plan con risk=high mostra preview con tasto Esegui', async () => {
    fetchMock.mockResolvedValueOnce(planResponseHigh);

    render(<NLCommandBar projectId="default" />);

    fireEvent.change(screen.getByPlaceholderText(/accendi/i), {
      target: { value: 'spegni tutto' },
    });
    fireEvent.click(screen.getByRole('button', { name: '' }));

    // Con risk=high deve mostrare il preview con il tasto Esegui
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /esegui/i })).toBeInTheDocument();
    });

    // Non deve mostrare "Comando non riconosciuto"
    expect(screen.queryByText(/Comando non riconosciuto/i)).not.toBeInTheDocument();
  });
});
