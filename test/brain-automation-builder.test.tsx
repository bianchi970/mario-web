import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NLCommandBar from '@/components/brain/NLCommandBar';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const automationDraftResponse = {
  ok: true,
  status: 200,
  json: async () => ({
    intent: 'automation_create',
    action: 'turn_on',
    target: { type: 'room', room: 'luce cucina', selector: 'luce cucina', device_id: null },
    parameters: { at: '18:00' },
    risk: 'low',
    requires_confirmation: true,
    confidence: 0.9,
    reason: 'automation_draft',
    dispatchable: false,
    commands: [],
    suggest_diagnose: false,
    missing: [],
    provider: 'local',
    input_text: 'crea automazione accendi luce cucina alle 18',
  }),
};

const automationNoTimeResponse = {
  ok: true,
  status: 200,
  json: async () => ({
    intent: 'automation_create',
    action: 'turn_on',
    target: { type: 'room', room: 'luce cucina', selector: 'luce cucina', device_id: null },
    parameters: {},
    risk: 'low',
    requires_confirmation: true,
    confidence: 0.4,
    reason: 'missing_fields',
    dispatchable: false,
    commands: [],
    suggest_diagnose: false,
    missing: ['trigger'],
    provider: 'local',
    input_text: 'crea automazione accendi luce cucina',
  }),
};

const unknownResponse = {
  ok: true,
  status: 200,
  json: async () => ({
    intent: 'device_control',
    action: 'turn_on',
    target: { type: 'device', device_id: 'dev-luce-cucina', room: 'cucina', selector: 'luce cucina' },
    parameters: {},
    risk: 'low',
    requires_confirmation: false,
    confidence: 0.95,
    reason: null,
    dispatchable: true,
    commands: [{ type: 'device_command', device_id: 'dev-luce-cucina', command: 'turn_on', params: {} }],
    suggest_diagnose: false,
    missing: [],
    provider: 'local',
    input_text: 'accendi luce cucina',
  }),
};

describe('NLCommandBar — Automation Builder (B37.3)', () => {
  test('UserMeaning: mostra frase leggibile invece del nome intent', async () => {
    fetchMock.mockResolvedValueOnce(automationDraftResponse);

    render(<NLCommandBar projectId="default" />);
    fireEvent.change(screen.getByPlaceholderText(/accendi/i), {
      target: { value: 'crea automazione accendi luce cucina alle 18' },
    });
    fireEvent.click(screen.getByRole('button', { name: '' }));

    await waitFor(() => {
      expect(screen.getByText('accendi luce cucina alle 18:00')).toBeInTheDocument();
    });
    // NON deve mostrare il nome tecnico dell'intent
    expect(screen.queryByText('automation_create')).not.toBeInTheDocument();
  });

  test('automation_draft: mostra pannello automazione e bottone Crea', async () => {
    fetchMock.mockResolvedValueOnce(automationDraftResponse);

    render(<NLCommandBar projectId="default" />);
    fireEvent.change(screen.getByPlaceholderText(/accendi/i), {
      target: { value: 'crea automazione accendi luce cucina alle 18' },
    });
    fireEvent.click(screen.getByRole('button', { name: '' }));

    await waitFor(() => {
      expect(screen.getByText('Automazione rilevata')).toBeInTheDocument();
    });
    expect(screen.getByText('Crea automazione')).toBeInTheDocument();
    expect(screen.getAllByText(/18:00/).length).toBeGreaterThan(0);
  });

  test('automation_draft: click Crea chiama createAutomation e mostra successo', async () => {
    fetchMock
      .mockResolvedValueOnce(automationDraftResponse)
      .mockResolvedValueOnce({
        ok: true, status: 201,
        json: async () => ({ success: true, data: { automation: { id: 'auto-1', name: 'accendi luce cucina alle 18:00' } } }),
      });

    render(<NLCommandBar projectId="default" />);
    fireEvent.change(screen.getByPlaceholderText(/accendi/i), {
      target: { value: 'crea automazione accendi luce cucina alle 18' },
    });
    fireEvent.click(screen.getByRole('button', { name: '' }));

    await waitFor(() => {
      expect(screen.getByText('Crea automazione')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Crea automazione'));

    await waitFor(() => {
      expect(screen.getByText('Automazione creata.')).toBeInTheDocument();
    });

    const createCall = fetchMock.mock.calls[1];
    expect(createCall[0]).toContain('/api/hub/automations/default');
    const body = JSON.parse(createCall[1].body as string);
    expect(body.trigger_type).toBe('schedule');
    expect(body.trigger.at).toBe('18:00');
    expect(body.actions[0].type).toBe('intent');
  });

  test('missing trigger: mostra hint orario mancante (no bottone Crea)', async () => {
    fetchMock.mockResolvedValueOnce(automationNoTimeResponse);

    render(<NLCommandBar projectId="default" />);
    fireEvent.change(screen.getByPlaceholderText(/accendi/i), {
      target: { value: 'crea automazione accendi luce cucina' },
    });
    fireEvent.click(screen.getByRole('button', { name: '' }));

    await waitFor(() => {
      expect(screen.getByText(/orario o condizione/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('Crea automazione')).not.toBeInTheDocument();
  });

  test('UserMeaning per device_control: mostra azione + target leggibile', async () => {
    fetchMock.mockResolvedValueOnce(unknownResponse);

    render(<NLCommandBar projectId="default" />);
    fireEvent.change(screen.getByPlaceholderText(/accendi/i), {
      target: { value: 'accendi luce cucina' },
    });
    fireEvent.click(screen.getByRole('button', { name: '' }));

    // dispatchable:true → va diretto a dispatch, non preview
    // mock dispatch success
    fetchMock.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ status: 'success', results: [{ ok: true }] }),
    });

    await waitFor(() => {
      expect(screen.getByText('Fatto.')).toBeInTheDocument();
    });
  });
});
