/**
 * HUB V1, punto 4 — le conferme sì/no a pulsanti (22/10/2026)
 *
 * Una domanda di MARIO porta `_v2.risposte`: le parole che la riconoscono. La
 * PWA le offre come pulsanti, e un pulsante MANDA QUELLA PAROLA al Brain, nella
 * stessa conversazione, come se si scrivesse.
 *
 * ⛔ Una PROPOSTA non si conferma più con «Esegui» (la PWA mandava il comando
 * da sé: il «sì» aveva due strade, e il Brain lasciava la proposta aperta).
 * Si conferma rispondendo a MARIO; il comando parte quando il Brain, al «sì»,
 * risponde `execute`.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NLCommandBar from '@/components/brain/NLCommandBar';

const fetchMock = jest.fn();

const risposta = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

// La forma che `mario-brain/src/brain-v2/v1.js` produce per una proposta su un device.
const proposta = {
  intent: 'device_control', action: 'turn_on', target: { device_id: '2-ep1' }, parameters: {},
  risk: 'medium', requires_confirmation: true, confidence: 0.7, reason: null, dispatchable: true,
  commands: [{ device_id: '2-ep1', action: 'turn_on', params: {} }],
  suggest_diagnose: false, provider: 'mario-ai-v2', input_text: 'accendi la luce della cucina',
  _v2: { outcome: 'propose', question: 'Vuoi che accenda Luce Cucina?', risposte: ['sì', 'no'] },
};

const sceltaFraDue = {
  intent: 'device_control', action: null, target: null, parameters: {},
  risk: 'low', requires_confirmation: true, confidence: 0.5, reason: 'missing_fields', dispatchable: false,
  commands: [], suggest_diagnose: false, provider: 'mario-ai-v2', input_text: 'accendi la luce',
  _v2: { outcome: 'ask', question: 'Quale? Luce Cucina, Luce Studio.', risposte: ['Luce Cucina', 'Luce Studio'], pending_token: 'tok' },
};

function chiamateAlBrain() {
  return fetchMock.mock.calls
    .filter(([url]) => String(url).includes('/api/brain/interpret'))
    .map(([, init]) => JSON.parse(String((init as RequestInit).body)));
}

// Le due strade con cui la PWA fa partire un comando (`src/lib/api/ui-command.ts`).
function chiamateComando() {
  return fetchMock.mock.calls.filter(([url]) =>
    /\/actions\/ui-command$|\/execution\/execute-plan$/.test(String(url)));
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

async function scrivi(testo: string) {
  fireEvent.change(screen.getByPlaceholderText(/accendi/i), { target: { value: testo } });
  fireEvent.click(screen.getByRole('button', { name: '' }));
}

describe('NLCommandBar — risposte a pulsanti', () => {
  test('una proposta offre Sì / No, non «Esegui», e non fa partire nessun comando', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes('/api/brain/interpret') ? risposta(proposta) : risposta({}));
    render(<NLCommandBar projectId="default" />);
    await scrivi('accendi la luce della cucina');

    await waitFor(() => expect(screen.getByRole('button', { name: 'Sì' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /esegui/i })).not.toBeInTheDocument();
    expect(screen.getByText('Vuoi che accenda Luce Cucina?')).toBeInTheDocument();
    expect(chiamateComando()).toHaveLength(0);
  });

  // Fino al 24/10/2026 l'anteprima (`buildUserMeaning`) ripiegava sul
  // `device_id` quando mancavano stanza e selettore: «accendi 7b1e…».
  test('l\'anteprima non mostra mai il device_id', async () => {
    const conUuid = { ...proposta, target: { device_id: '7b1e3c2a-uuid' }, action: 'turn_on' };
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes('/api/brain/interpret') ? risposta(conUuid) : risposta({}));
    render(<NLCommandBar projectId="default" />);
    await scrivi('accendi quella');

    await waitFor(() => expect(screen.getByRole('button', { name: 'Sì' })).toBeInTheDocument());
    expect(screen.queryByText(/7b1e3c2a-uuid/)).not.toBeInTheDocument();
  });

  test('«Sì» manda «sì» al Brain, nella stessa conversazione', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes('/api/brain/interpret') ? risposta(proposta) : risposta({}));
    render(<NLCommandBar projectId="default" />);
    await scrivi('accendi la luce della cucina');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sì' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Sì' }));
    await waitFor(() => expect(chiamateAlBrain()).toHaveLength(2));
    const [prima, seconda] = chiamateAlBrain();
    expect(seconda.text).toBe('sì');
    expect(seconda.session_id).toBe(prima.session_id);
  });

  test('una scelta offre i nomi, e il nome premuto va al Brain così com\'è', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes('/api/brain/interpret') ? risposta(sceltaFraDue) : risposta({}));
    render(<NLCommandBar projectId="default" />);
    await scrivi('accendi la luce');

    await waitFor(() => expect(screen.getByRole('button', { name: 'Luce Studio' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Luce Studio' }));
    await waitFor(() => expect(chiamateAlBrain()).toHaveLength(2));
    expect(chiamateAlBrain()[1].text).toBe('Luce Studio');
  });

  test('senza `risposte` nessun pulsante inventato', async () => {
    const senza = { ...sceltaFraDue, _v2: { ...sceltaFraDue._v2, risposte: null } };
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes('/api/brain/interpret') ? risposta(senza) : risposta({}));
    render(<NLCommandBar projectId="default" />);
    await scrivi('accendi la luce');

    await waitFor(() => expect(screen.getByText('Quale? Luce Cucina, Luce Studio.')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Luce Studio' })).not.toBeInTheDocument();
  });
});
