/**
 * NLCommandBar.voice.test.tsx
 *
 * Test mirati per il flusso voce:
 *   MIME detection/fallback → MediaRecorder → blob → base64 JSON → fetch → risposta STT
 *
 * Copertura (14 test case):
 *   1. MIME primario supportato → MediaRecorder costruito con audio/webm;codecs=opus
 *   2. MIME primario non supportato → fallback a audio/webm
 *   3. Tutti i MIME non supportati → MediaRecorder senza opzioni mimeType
 *   4. MediaRecorder constructor lancia eccezione → voiceError mostrato, stream chiuso
 *   5. Blob troppo piccolo (< 1000 byte) → voiceError, nessun fetch
 *   6. Payload inviato come JSON base64 (non FormData)
 *   7. Risposta 200 con trascrizione valida → testo nell'input
 *   8. Risposta 200 con schema mancante (no data.text) → "Nessun testo riconosciuto"
 *   9. Risposta 401 → errore accesso specifico
 *  10. Risposta 403 → errore accesso specifico
 *  11. Risposta 404 → "Errore trascrizione (404)"
 *  12. Risposta 503 → "Voce temporaneamente non disponibile"
 *  13. Risposta 500 (5xx) → "Errore trascrizione (500)"
 *  14. Errore di rete (fetch throw) → "Voce temporaneamente non disponibile"
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import NLCommandBar from '@/components/brain/NLCommandBar';

// ── Mocks moduli ────────────────────────────────────────────────────────────

jest.mock('@/lib/api/brain', () => ({
  brainInterpret: jest.fn(),
  brainDiagnose: jest.fn(),
  brainConfirmAutomation: jest.fn(),
  brainLearn: jest.fn(),
}));

jest.mock('@/lib/api/automations', () => ({
  createAutomation: jest.fn(),
}));

jest.mock('@/lib/api/ui-command', () => ({
  executeUiCommand: jest.fn(),
  executeCompoundPlan: jest.fn(),
  getExecution: jest.fn(),
  pollExecution: jest.fn(),
}));

jest.mock('@/components/brain/ExecutionProgressCard', () => ({
  __esModule: true,
  default: () => null,
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Crea un'istanza MockMediaRecorder condivisibile tra setup e test. */
function makeMockMediaRecorder(overrideMime?: string) {
  const instance = {
    ondataavailable: null as ((e: { data: Blob }) => void) | null,
    onstop: null as (() => Promise<void>) | null,
    start: jest.fn(),
    stop: jest.fn(),
    mimeType: overrideMime ?? 'audio/webm;codecs=opus',
  };
  return instance;
}

type MockRecorderInstance = ReturnType<typeof makeMockMediaRecorder>;

/** Simula una registrazione audio: dataavailable + stop. */
async function simulateRecording(
  instance: MockRecorderInstance,
  audioSize = 5000,
) {
  const chunk = new Blob(['x'.repeat(audioSize)], { type: 'audio/webm' });
  act(() => {
    instance.ondataavailable?.({ data: chunk });
  });
  await act(async () => {
    await instance.onstop?.();
  });
}

// ── Test suite ───────────────────────────────────────────────────────────────

describe('NLCommandBar — flusso voce', () => {
  let recorderInstance: MockRecorderInstance;
  let MockMediaRecorderClass: jest.Mock;
  const mockGetUserMedia = jest.fn();

  beforeEach(() => {
    recorderInstance = makeMockMediaRecorder();

    MockMediaRecorderClass = jest.fn().mockImplementation(
      (_stream: MediaStream, options?: { mimeType?: string }) => {
        recorderInstance.mimeType = options?.mimeType ?? 'audio/webm';
        return recorderInstance;
      },
    );
    (MockMediaRecorderClass as unknown as { isTypeSupported: jest.Mock }).isTypeSupported =
      jest.fn().mockReturnValue(true);

    Object.defineProperty(global, 'MediaRecorder', {
      value: MockMediaRecorderClass,
      writable: true,
      configurable: true,
    });

    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true,
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { text: 'accendi la luce' } }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── Pulsante microfono ──────────────────────────────────────────────────

  function getMicButton() {
    return screen.getByRole('button', { name: 'Avvia registrazione vocale' });
  }

  async function clickMic() {
    fireEvent.click(getMicButton());
    // Attende start() registrazione
    await waitFor(() => expect(recorderInstance.start).toHaveBeenCalled());
  }

  // ── 1. MIME primario supportato ─────────────────────────────────────────

  it('1 — costruisce MediaRecorder con MIME primario se supportato', async () => {
    const isSupported = (MockMediaRecorderClass as unknown as { isTypeSupported: jest.Mock }).isTypeSupported;
    isSupported.mockReturnValue(true);

    render(<NLCommandBar projectId="test" />);
    await clickMic();

    expect(MockMediaRecorderClass).toHaveBeenCalledWith(
      expect.anything(),
      { mimeType: 'audio/webm;codecs=opus' },
    );
  });

  // ── 2. Fallback MIME ────────────────────────────────────────────────────

  it('2 — sceglie il primo MIME supportato (fallback a audio/webm)', async () => {
    const isSupported = (MockMediaRecorderClass as unknown as { isTypeSupported: jest.Mock }).isTypeSupported;
    isSupported.mockImplementation((t: string) => t === 'audio/webm');

    render(<NLCommandBar projectId="test" />);
    await clickMic();

    expect(MockMediaRecorderClass).toHaveBeenCalledWith(
      expect.anything(),
      { mimeType: 'audio/webm' },
    );
  });

  // ── 3. Nessun MIME supportato → costruttore senza opzioni ──────────────

  it('3 — costruisce MediaRecorder senza mimeType se nessun formato è supportato', async () => {
    const isSupported = (MockMediaRecorderClass as unknown as { isTypeSupported: jest.Mock }).isTypeSupported;
    isSupported.mockReturnValue(false);

    render(<NLCommandBar projectId="test" />);
    await clickMic();

    expect(MockMediaRecorderClass).toHaveBeenCalledWith(expect.anything(), {});
  });

  // ── 4. MediaRecorder constructor throw ─────────────────────────────────

  it('4 — mostra voiceError e chiude lo stream se MediaRecorder lancia eccezione', async () => {
    MockMediaRecorderClass.mockImplementation(() => {
      throw new Error('NotSupportedError');
    });

    render(<NLCommandBar projectId="test" />);
    fireEvent.click(getMicButton());

    await waitFor(() =>
      expect(screen.getByText(/Formato audio non supportato/i)).toBeInTheDocument(),
    );
    expect(recorderInstance.start).not.toHaveBeenCalled();
  });

  // ── 5. Blob vuoto (nessun chunk) → voiceError, nessun fetch ───────────

  it('5 — mostra errore e non invia fetch se il blob è vuoto (nessun chunk)', async () => {
    render(<NLCommandBar projectId="test" />);
    await clickMic();

    // Non si attiva ondataavailable → audioChunksRef rimane vuoto → Blob.size === 0
    await act(async () => {
      await recorderInstance.onstop?.();
    });

    await waitFor(() =>
      expect(screen.getByText(/Nessun audio registrato/i)).toBeInTheDocument(),
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // ── 5b. Blob piccolo ma non vuoto → fetch inviato ──────────────────────
  // Verifica che la soglia sia zero: anche 50 byte vengono inviati.

  it('5b — invia fetch con blob piccolo ma non vuoto (50 byte)', async () => {
    render(<NLCommandBar projectId="test" />);
    await clickMic();

    // Chunk da 50 byte (> 0, < 1000 della vecchia soglia)
    const smallChunk = new Blob(['x'.repeat(50)], { type: 'audio/webm' });
    act(() => {
      recorderInstance.ondataavailable?.({ data: smallChunk });
    });
    await act(async () => {
      await recorderInstance.onstop?.();
    });

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    // Nessun voiceError per blob piccolo non vuoto
    expect(screen.queryByText(/Nessun audio registrato/i)).not.toBeInTheDocument();
  });

  // ── 6. Payload JSON base64 (non FormData) ──────────────────────────────

  it('6 — invia JSON con audio_base64 (non FormData)', async () => {
    render(<NLCommandBar projectId="test" />);
    await clickMic();
    await simulateRecording(recorderInstance);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe('/api/brain/voice/transcribe');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json',
    );
    expect(init.body).not.toBeInstanceOf(FormData);
    const body = JSON.parse(init.body as string) as {
      audio_base64: string;
      mime: string;
      lang: string;
    };
    expect(typeof body.audio_base64).toBe('string');
    expect(body.audio_base64.length).toBeGreaterThan(0);
    expect(body.lang).toBe('it');
    expect(typeof body.mime).toBe('string');
  });

  // ── 7. Risposta valida 200 ──────────────────────────────────────────────

  it('7 — popola il campo testo con la trascrizione su 200 OK', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { text: 'accendi la luce del soggiorno' } }),
    });

    render(<NLCommandBar projectId="test" />);
    await clickMic();
    await simulateRecording(recorderInstance);

    await waitFor(() =>
      expect(
        screen.getByPlaceholderText('es. accendi la luce del soggiorno'),
      ).toHaveValue('accendi la luce del soggiorno'),
    );
  });

  // ── 8. Schema risposta non valido (no data.text) ────────────────────────

  it('8 — mostra "Nessun testo riconosciuto" se la risposta non contiene data.text', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    render(<NLCommandBar projectId="test" />);
    await clickMic();
    await simulateRecording(recorderInstance);

    await waitFor(() =>
      expect(screen.getByText(/Nessun testo riconosciuto/i)).toBeInTheDocument(),
    );
  });

  // ── 9. 401 ─────────────────────────────────────────────────────────────

  it('9 — mostra errore accesso specifico su 401', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
    });

    render(<NLCommandBar projectId="test" />);
    await clickMic();
    await simulateRecording(recorderInstance);

    await waitFor(() =>
      expect(screen.getByText(/Accesso negato \(401\)/i)).toBeInTheDocument(),
    );
  });

  // ── 10. 403 ────────────────────────────────────────────────────────────

  it('10 — mostra errore accesso specifico su 403', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
    });

    render(<NLCommandBar projectId="test" />);
    await clickMic();
    await simulateRecording(recorderInstance);

    await waitFor(() =>
      expect(screen.getByText(/Accesso negato \(403\)/i)).toBeInTheDocument(),
    );
  });

  // ── 11. 404 ────────────────────────────────────────────────────────────

  it('11 — mostra "Errore trascrizione (404)" su risposta 404', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
    });

    render(<NLCommandBar projectId="test" />);
    await clickMic();
    await simulateRecording(recorderInstance);

    await waitFor(() =>
      expect(screen.getByText(/Errore trascrizione \(404\)/i)).toBeInTheDocument(),
    );
  });

  // ── 12. 503 ────────────────────────────────────────────────────────────

  it('12 — mostra "Voce temporaneamente non disponibile" su 503', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
    });

    render(<NLCommandBar projectId="test" />);
    await clickMic();
    await simulateRecording(recorderInstance);

    await waitFor(() =>
      expect(
        screen.getByText(/Voce temporaneamente non disponibile/i),
      ).toBeInTheDocument(),
    );
  });

  // ── 13. 500 (5xx) ──────────────────────────────────────────────────────

  it('13 — mostra "Errore trascrizione (500)" su risposta 5xx', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<NLCommandBar projectId="test" />);
    await clickMic();
    await simulateRecording(recorderInstance);

    await waitFor(() =>
      expect(screen.getByText(/Errore trascrizione \(500\)/i)).toBeInTheDocument(),
    );
  });

  // ── 14. Errore di rete ─────────────────────────────────────────────────

  it('14 — mostra "Voce temporaneamente non disponibile" su errore di rete', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));

    render(<NLCommandBar projectId="test" />);
    await clickMic();
    await simulateRecording(recorderInstance);

    await waitFor(() =>
      expect(
        screen.getByText(/Voce temporaneamente non disponibile/i),
      ).toBeInTheDocument(),
    );
  });

  // ── 15. Payload realistico 100 KB — chunk-based safe ───────────────────
  // Verifica che la conversione Uint8Array→base64 con String.fromCharCode.apply
  // su blocchi da 32 KB gestisca correttamente un audio di ~100 KB (10s a 64kbps)
  // senza stack overflow e produca una stringa base64 valida e decodificabile.

  it('15 — payload realistico 100 KB inviato come base64 valido e decodificabile', async () => {
    render(<NLCommandBar projectId="test" />);
    await clickMic();

    // 100 KB con byte non-ASCII per simulare audio reale (non solo ASCII)
    const SIZE = 102_400;
    const bigChunk = new Blob([new Uint8Array(SIZE).map((_, i) => i % 256)], {
      type: 'audio/webm',
    });
    act(() => {
      recorderInstance.ondataavailable?.({ data: bigChunk });
    });
    await act(async () => {
      await recorderInstance.onstop?.();
    });

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const body = JSON.parse(init.body as string) as { audio_base64: string };

    // base64 di 100 KB → atteso circa 136.8 KB (ceil(100000/3)*4)
    expect(typeof body.audio_base64).toBe('string');
    expect(body.audio_base64.length).toBeGreaterThan(100_000);

    // Decodificabile senza errori e dimensione corretta
    const decoded = Uint8Array.from(atob(body.audio_base64), (c) => c.charCodeAt(0));
    expect(decoded.byteLength).toBe(SIZE);
  });
});
