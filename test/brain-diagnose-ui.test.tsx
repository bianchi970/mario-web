import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NLCommandBar from '@/components/brain/NLCommandBar';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const baseInterpret = {
  ok: true,
  status: 200,
  json: async () => ({
    intent: 'diagnosis',
    action: null,
    target: null,
    parameters: {},
    risk: 'low',
    requires_confirmation: false,
    confidence: 0.9,
    reason: 'diagnosis',
    dispatchable: false,
    commands: [],
    suggest_diagnose: true,
    provider: 'local',
    input_text: 'la luce non funziona',
  }),
};

const baseDiagnose = {
  ok: true,
  status: 200,
  json: async () => ({
    category: 'device_fault',
    confidence: 'high',
    cause: 'Il dispositivo potrebbe essere guasto o senza alimentazione.',
    steps: ['Verifica che il dispositivo sia collegato.', 'Prova a resettarlo.'],
    tools: [],
    risk: 'low',
    device_detected: null,
    additional_checks: [],
    known_solution: true,
    provider: 'local',
  }),
};

describe('NLCommandBar — Brain Diagnose UI', () => {
  test('suggest_diagnose:true shows diagnose button in preview', async () => {
    fetchMock.mockResolvedValueOnce(baseInterpret);

    render(<NLCommandBar projectId="default" />);

    fireEvent.change(screen.getByPlaceholderText(/accendi/i), {
      target: { value: 'la luce non funziona' },
    });
    fireEvent.click(screen.getByRole('button', { name: '' }));

    await waitFor(() => {
      expect(screen.getByText('Diagnosi consigliata')).toBeInTheDocument();
    });
  });

  test('suggest_diagnose:false does not show diagnose button', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        intent: 'unknown',
        action: null,
        target: null,
        parameters: {},
        risk: 'low',
        requires_confirmation: false,
        confidence: 0.1,
        reason: 'unknown_intent',
        dispatchable: false,
        commands: [],
        suggest_diagnose: false,
        provider: 'local',
        input_text: 'boh',
      }),
    });

    render(<NLCommandBar projectId="default" />);

    fireEvent.change(screen.getByPlaceholderText(/accendi/i), {
      target: { value: 'boh' },
    });
    fireEvent.click(screen.getByRole('button', { name: '' }));

    await waitFor(() => {
      expect(screen.getByText(/Comando non eseguibile/i)).toBeInTheDocument();
    });

    expect(screen.queryByText('Diagnosi consigliata')).not.toBeInTheDocument();
  });

  test('clicking diagnose button calls brainDiagnose and shows results', async () => {
    fetchMock
      .mockResolvedValueOnce(baseInterpret)
      .mockResolvedValueOnce(baseDiagnose);

    render(<NLCommandBar projectId="default" />);

    fireEvent.change(screen.getByPlaceholderText(/accendi/i), {
      target: { value: 'la luce non funziona' },
    });
    fireEvent.click(screen.getByRole('button', { name: '' }));

    await waitFor(() => {
      expect(screen.getByText('Diagnosi consigliata')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Diagnosi consigliata'));

    await waitFor(() => {
      expect(screen.getByText('device_fault')).toBeInTheDocument();
    });

    expect(screen.getByText('Il dispositivo potrebbe essere guasto o senza alimentazione.')).toBeInTheDocument();
    expect(screen.getByText('Verifica che il dispositivo sia collegato.')).toBeInTheDocument();
    expect(screen.getByText('Prova a resettarlo.')).toBeInTheDocument();
  });

  test('diagnose second fetch calls /api/brain/diagnose endpoint', async () => {
    fetchMock
      .mockResolvedValueOnce(baseInterpret)
      .mockResolvedValueOnce(baseDiagnose);

    render(<NLCommandBar projectId="default" />);

    fireEvent.change(screen.getByPlaceholderText(/accendi/i), {
      target: { value: 'la luce non funziona' },
    });
    fireEvent.click(screen.getByRole('button', { name: '' }));

    await waitFor(() => {
      expect(screen.getByText('Diagnosi consigliata')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Diagnosi consigliata'));

    await waitFor(() => {
      expect(screen.getByText('device_fault')).toBeInTheDocument();
    });

    const diagnoseCall = fetchMock.mock.calls[1];
    expect(diagnoseCall[0]).toContain('/api/brain/diagnose');
    const body = JSON.parse(diagnoseCall[1].body as string);
    expect(body.text).toBe('la luce non funziona');
  });
});
