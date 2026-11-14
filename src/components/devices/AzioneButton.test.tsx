import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AzioneButton } from '@/components/devices/CommandButton';
import { OfflineModeProvider } from '@/components/layout/OfflineModeProvider';
import { ProjectProvider } from '@/context/ProjectContext';
import { cambiaPreferito, preferitiDi } from '@/lib/preferiti';

// Proposta 2 della pagina delle decisioni (Romeo: sì, 14/11/2026): in Casa,
// «Accesi ora» era solo testo — per spegnere bisognava entrare nella stanza.

const ONOFF = { key: 'on_off', label: 'On/Off', actions: [
  { key: 'turn_on', label: 'Accendi', type: 'command' }, { key: 'turn_off', label: 'Spegni', type: 'command' }] };

function disegna(device: Record<string, unknown>) {
  return render(
    <ProjectProvider>
      <OfflineModeProvider>
        <AzioneButton device={{ id: '2-ep2', name: 'Dispositivo Corridoio', online: true, state: { on: true }, ...device } as never}
          action="turn_off" label="Spegni" />
      </OfflineModeProvider>
    </ProjectProvider>,
  );
}

describe('AzioneButton — «Spegni» a un tocco', () => {
  beforeEach(() => {
    window.localStorage.setItem('mario_project_id', 'default');
    global.fetch = jest.fn().mockImplementation((input: RequestInfo | URL) =>
      String(input) === '/api/brain/system/status'
        ? Promise.resolve({ ok: true, json: async () => ({ offline: false }) })
        : Promise.resolve({ ok: true, json: async () => ({ success: true, data: { esito: 'eseguito' } }) }));
  });
  afterEach(() => { jest.resetAllMocks(); window.localStorage.clear(); });

  it('PF-01 manda turn_off al Brain, la stessa strada del pulsante pieno', async () => {
    disegna({ capabilities: [ONOFF] });
    const b = await screen.findByRole('button', { name: 'Spegni Dispositivo Corridoio' });
    await waitFor(() => expect(b).not.toBeDisabled());
    fireEvent.click(b);
    await waitFor(() => {
      const chiamata = (global.fetch as jest.Mock).mock.calls.find(([u]) => String(u).includes('/actions/ui-command'));
      expect(chiamata).toBeTruthy();
      expect(String(chiamata[0])).toBe('/api/brain/projects/default/actions/ui-command');
      expect(JSON.parse(chiamata[1].body)).toMatchObject({ device_id: '2-ep2', action: 'turn_off' });
    });
  });

  it('PF-02 chi non dichiara turn_off non ha il pulsante', () => {
    disegna({ capabilities: [] });
    expect(screen.queryByRole('button', { name: /Spegni/ })).toBeNull();
  });
});

describe('preferiti — nelle preferenze della pagina Casa che l\'Hub ha già', () => {
  afterEach(() => jest.resetAllMocks());

  it('PF-03 aggiunge e toglie, senza perdere le altre chiavi del layout', async () => {
    let salvato: unknown = null;
    global.fetch = jest.fn().mockImplementation((u: string, init?: RequestInit) => {
      if (init?.method === 'PUT') { salvato = JSON.parse(String(init.body)); return Promise.resolve({ ok: true, json: async () => ({ success: true }) }); }
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { layout: { ordine: ['x'], preferiti: ['matter-1'] } } }) });
    }) as unknown as typeof fetch;
    expect(await cambiaPreferito('default', '2-ep1')).toEqual(['matter-1', '2-ep1']);
    expect(salvato).toEqual({ project_id: 'default', layout: { ordine: ['x'], preferiti: ['matter-1', '2-ep1'] } });
    expect(await cambiaPreferito('default', 'matter-1')).toEqual([]);
  });

  it('PF-04 un layout senza preferiti, o storto, è «nessuno», non un errore', () => {
    expect(preferitiDi(null)).toEqual([]);
    expect(preferitiDi({ preferiti: 'matter-1' })).toEqual([]);
    expect(preferitiDi({ preferiti: ['a', 3, 'b'] })).toEqual(['a', 'b']);
  });
});
