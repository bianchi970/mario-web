import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ScenariosPage from '@/app/scenarios/page';
import { ProjectProvider } from '@/context/ProjectContext';
import { routerFetch, json } from './helpers/fetch-router';

jest.mock('@/components/layout/TopBar', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

/**
 * Mock instradati per URL invece che per posizione: quando la pagina ha
 * iniziato a leggere anche `/scenes` al montaggio, la catena posizionale è
 * slittata di uno e le prove sono fallite tutte insieme senza che nulla fosse
 * rotto nel prodotto.
 */

const SCENARIO_ATTIVO = {
  id: 'night_close',
  name: 'Night close',
  enabled: true,
  trigger: { cron: '0 22 * * *' },
  conditions: [],
  outcome: { type: 'intent', intent: 'chiudi le tapparelle' },
  updated_at: '2026-04-11T21:00:00Z',
};

/** Rotte comuni al montaggio, con l'elenco scenari che il test decide. */
const montaggio = (scenari: unknown[] = []) => ([
  [/\/api\/scenarios\/audit/, json([])],
  [/\/api\/scenarios(?!\/)/,  json({ success: true, data: scenari })],
  [/\/scenes/,                json({ success: true, data: [] })],
  [/\/automations/,           json({ automations: [] })],
  [/\/devices/,               json({ devices: [] })],
] as Parameters<typeof routerFetch>[0]);

function installa(rotte: Parameters<typeof routerFetch>[0]) {
  const mock = routerFetch(rotte);
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

describe('scenarios management ui', () => {
  beforeEach(() => {
    localStorage.setItem('mario_project_id', 'test-project');
  });

  test('renders scenario list from backend', async () => {
    installa(montaggio([SCENARIO_ATTIVO]));

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    await waitFor(() => {
      expect(screen.getByText('Night close')).toBeInTheDocument();
      expect(screen.getByText('Attivo')).toBeInTheDocument();
    });
  });

  test('shows explicit error when there is no active project', async () => {
    installa([
      [/\/api\/scenarios\/audit/, json({ success: false, status: 'error', error: 'NO_ACTIVE_PROJECT' })],
      [/\/api\/scenarios(?!\/)/,  json({ success: false, data: [], error: 'NO_ACTIVE_PROJECT' })],
      [/\/scenes/,                json({ success: true, data: [] })],
      [/\/automations/,           json({ automations: [] })],
      [/\/devices/,               json({ devices: [] })],
    ]);

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    await waitFor(() => {
      expect(screen.getByText('Nessun progetto attivo disponibile.')).toBeInTheDocument();
    });
  });

  test('toggles scenario and refreshes list', async () => {
    // Dopo il PATCH lo scenario risulta disattivato: lo stato vive qui, non
    // nell'ordine delle chiamate.
    let abilitato = true;
    installa([
      [/\/api\/scenarios\/audit/, json([])],
      // PATCH e DELETE vanno su /api/scenarios/<id>: rotta distinta dalla lista.
      [/\/api\/scenarios\/[^/?]+/, () => { abilitato = false; return json({ success: true }); }],
      [/\/api\/scenarios/,         () => json({ success: true, data: [{ ...SCENARIO_ATTIVO, enabled: abilitato }] })],
      [/\/scenes/,      json({ success: true, data: [] })],
      [/\/automations/, json({ automations: [] })],
      [/\/devices/,     json({ devices: [] })],
    ]);

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    await waitFor(() => {
      expect(screen.getByText('Disabilita')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Disabilita'));

    await waitFor(() => {
      expect(screen.getByText('Disattivo')).toBeInTheDocument();
    });
  });

  test('deletes scenario and refreshes list', async () => {
    let esiste = true;
    installa([
      [/\/api\/scenarios\/audit/, json([])],
      [/\/api\/scenarios\/[^/?]+/, () => { esiste = false; return json({ success: true }); }],
      [/\/api\/scenarios/,         () => json({ success: true, data: esiste ? [SCENARIO_ATTIVO] : [] })],
      [/\/scenes/,      json({ success: true, data: [] })],
      [/\/automations/, json({ automations: [] })],
      [/\/devices/,     json({ devices: [] })],
    ]);

    render(<ProjectProvider><ScenariosPage /></ProjectProvider>);

    await waitFor(() => {
      expect(screen.getByText('Elimina')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Elimina'));

    await waitFor(() => {
      expect(screen.getByText('Nessuno scenario salvato.')).toBeInTheDocument();
    });
  });
});
