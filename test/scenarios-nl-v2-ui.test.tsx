import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ScenariosPage from '@/app/scenarios/page';
import { ProjectProvider } from '@/context/ProjectContext';

jest.mock('@/components/layout/TopBar', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

const fetchMock = jest.fn();

// Mount sequence:
// 0: listScenarios, 1: listScenarioAudit, 2: listAutomations, 3: listDevices

const scenariosMock = { json: async () => ({ success: true, data: [] }) };
const auditMock    = { json: async () => [] };
const autoMock     = { ok: true, status: 200, json: async () => ({ automations: [] }) };
const devsEmpty    = { ok: true, status: 200, json: async () => ({ devices: [] }) };
const devsWithOne  = {
  ok: true, status: 200,
  json: async () => ({
    devices: [{
      id: 'luce_1', name: 'Luce soggiorno', type: 'light',
      protocol: 'zwave', capabilities: ['turn_on', 'turn_off'],
      project_id: 'test-project', state: {}, online: true, created_at: '',
    }],
  }),
};

const DRAFT_DATA = {
  name: 'Spegni luce alle 22',
  enabled: true,
  trigger: { type: 'schedule', at: '22:00', cron: '0 22 * * *' },
  conditions: [],
  actions: [{ device_id: 'luce_1', command: 'turn_off', project_id: null }],
};

describe('NL V2 draft flow', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    localStorage.setItem('mario_project_id', 'test-project');
  });

  test('V2D-01: mostra ScenarioDraftPanel quando Brain restituisce draft', async () => {
    fetchMock
      .mockResolvedValueOnce(scenariosMock)
      .mockResolvedValueOnce(auditMock)
      .mockResolvedValueOnce(autoMock)
      .mockResolvedValueOnce(devsWithOne)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, status: 'draft', data: DRAFT_DATA }),
      });

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    fireEvent.change(screen.getByPlaceholderText('Scrivi lo scenario...'), {
      target: { value: 'spegni la luce alle 22' },
    });
    fireEvent.click(screen.getByText('Crea scenario'));

    await waitFor(() => {
      expect(screen.getByText('MARIO ha capito così')).toBeInTheDocument();
    });

    expect(screen.getByText('Spegni luce alle 22')).toBeInTheDocument();
    expect(screen.getByText(/Ogni giorno alle 22:00/)).toBeInTheDocument();
    expect(screen.getByText('Salva automazione')).toBeInTheDocument();
  });

  test('V2D-02: confirm draft chiama Hub POST e mostra successo', async () => {
    const savedAuto = { ...DRAFT_DATA, id: 'auto-1', project_id: 'test-project', trigger_type: 'schedule', created_at: '' };
    fetchMock
      .mockResolvedValueOnce(scenariosMock)
      .mockResolvedValueOnce(auditMock)
      .mockResolvedValueOnce(autoMock)
      .mockResolvedValueOnce(devsWithOne)
      // from-text → draft
      .mockResolvedValueOnce({
        json: async () => ({ success: true, status: 'draft', data: DRAFT_DATA }),
      })
      // createAutomation → Hub POST
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => savedAuto })
      // loadAutomations dopo confirm (listAutomations + listDevices)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ automations: [savedAuto] }) })
      .mockResolvedValueOnce(devsWithOne);

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    fireEvent.change(screen.getByPlaceholderText('Scrivi lo scenario...'), {
      target: { value: 'spegni la luce alle 22' },
    });
    fireEvent.click(screen.getByText('Crea scenario'));

    await waitFor(() => expect(screen.getByText('MARIO ha capito così')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Salva automazione'));

    await waitFor(() => {
      expect(screen.getByText('Automazione salvata: Spegni luce alle 22')).toBeInTheDocument();
    });

    // Il pannello draft deve scomparire
    expect(screen.queryByText('MARIO ha capito così')).not.toBeInTheDocument();

    // Verifica che il fetch verso Hub sia avvenuto (call index 5)
    const hubCall = fetchMock.mock.calls[5];
    expect(hubCall[0]).toContain('/api/hub/automations/');
    const body = JSON.parse(hubCall[1].body as string);
    expect(body.actions).toBeDefined();
    expect(body.actions[0].device_id).toBe('luce_1');
  });

  test('V2D-03: annulla draft nasconde il pannello e svuota il testo', async () => {
    fetchMock
      .mockResolvedValueOnce(scenariosMock)
      .mockResolvedValueOnce(auditMock)
      .mockResolvedValueOnce(autoMock)
      .mockResolvedValueOnce(devsWithOne)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, status: 'draft', data: DRAFT_DATA }),
      });

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    fireEvent.change(screen.getByPlaceholderText('Scrivi lo scenario...'), {
      target: { value: 'spegni la luce alle 22' },
    });
    fireEvent.click(screen.getByText('Crea scenario'));

    await waitFor(() => expect(screen.getByText('MARIO ha capito così')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Annulla'));

    await waitFor(() => {
      expect(screen.queryByText('MARIO ha capito così')).not.toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('Scrivi lo scenario...') as HTMLTextAreaElement;
    expect(textarea.value).toBe('');
  });

  test('V2D-04: modifica chiude il pannello ma conserva il testo', async () => {
    fetchMock
      .mockResolvedValueOnce(scenariosMock)
      .mockResolvedValueOnce(auditMock)
      .mockResolvedValueOnce(autoMock)
      .mockResolvedValueOnce(devsWithOne)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, status: 'draft', data: DRAFT_DATA }),
      });

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    fireEvent.change(screen.getByPlaceholderText('Scrivi lo scenario...'), {
      target: { value: 'spegni la luce alle 22' },
    });
    fireEvent.click(screen.getByText('Crea scenario'));

    await waitFor(() => expect(screen.getByText('MARIO ha capito così')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Modifica'));

    await waitFor(() => {
      expect(screen.queryByText('MARIO ha capito così')).not.toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('Scrivi lo scenario...') as HTMLTextAreaElement;
    expect(textarea.value).toBe('spegni la luce alle 22');
  });

  test('V2D-05: needs_clarification mostra domanda e opzioni', async () => {
    fetchMock
      .mockResolvedValueOnce(scenariosMock)
      .mockResolvedValueOnce(auditMock)
      .mockResolvedValueOnce(autoMock)
      .mockResolvedValueOnce(devsWithOne)
      .mockResolvedValueOnce({
        json: async () => ({
          success: false,
          status: 'needs_clarification',
          question: 'Quale luce intendi?',
          options: ['luce_camera', 'luce_soggiorno'],
        }),
      });

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    fireEvent.change(screen.getByPlaceholderText('Scrivi lo scenario...'), {
      target: { value: 'spegni la luce' },
    });
    fireEvent.click(screen.getByText('Crea scenario'));

    await waitFor(() => {
      expect(screen.getByText('Serve un chiarimento')).toBeInTheDocument();
    });

    expect(screen.getByText('Quale luce intendi?')).toBeInTheDocument();
    expect(screen.getByText(/luce_camera/)).toBeInTheDocument();
  });

  test('V2D-06: parse_error mostra errore generico', async () => {
    fetchMock
      .mockResolvedValueOnce(scenariosMock)
      .mockResolvedValueOnce(auditMock)
      .mockResolvedValueOnce(autoMock)
      .mockResolvedValueOnce(devsWithOne)
      .mockResolvedValueOnce({
        json: async () => ({
          success: false,
          status: 'parse_error',
          error: 'ai_unavailable',
        }),
      });

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    fireEvent.change(screen.getByPlaceholderText('Scrivi lo scenario...'), {
      target: { value: 'spegni la luce alle 22' },
    });
    fireEvent.click(screen.getByText('Crea scenario'));

    await waitFor(() => {
      // parse_error non ha un messaggio specifico → mostra errore generico
      expect(screen.getByText('Creazione scenario fallita.')).toBeInTheDocument();
    });

    expect(screen.queryByText('MARIO ha capito così')).not.toBeInTheDocument();
  });
});
