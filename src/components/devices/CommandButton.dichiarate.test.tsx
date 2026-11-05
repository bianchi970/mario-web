import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CommandButton from '@/components/devices/CommandButton';
import { OfflineModeProvider } from '@/components/layout/OfflineModeProvider';
import { ProjectProvider } from '@/context/ProjectContext';

// I pulsanti nascono da ciò che il device DICHIARA (le capability dell'Hub,
// la stessa lista con cui l'Hub accetta un comando), non dal suo tipo.
// Fino al 5/11/2026: tabella per tipo + On/Off di ripiego. Una tapparella
// «Apri» mandava `turn_on` (l'Hub lo rifiuta), e la valvola `4-ep1`, di tipo
// `termostato`, non aveva il controllo della temperatura.

const ONOFF = { key: 'on_off', label: 'On/Off', actions: [
  { key: 'turn_on', label: 'Accendi', type: 'command' }, { key: 'turn_off', label: 'Spegni', type: 'command' }] };
const TEMPERATURA = { key: 'temperature_set', label: 'Temperatura impostata', actions: [
  { key: 'set_temperature', label: 'Imposta temperatura', type: 'command' }] };
const COVER = { key: 'cover', label: 'Apertura', actions: [
  { key: 'set_position', label: 'Posizione', type: 'command' }, { key: 'open', label: 'Apri', type: 'command' },
  { key: 'close', label: 'Chiudi', type: 'command' }, { key: 'stop', label: 'Stop', type: 'command' }] };

function disegna(device: Record<string, unknown>) {
  return render(
    <ProjectProvider>
      <OfflineModeProvider>
        <CommandButton device={{ id: 'd', name: 'd', online: true, state: {}, ...device } as never} />
      </OfflineModeProvider>
    </ProjectProvider>,
  );
}

describe('i pulsanti di ciò che il device dichiara', () => {
  beforeEach(() => {
    window.localStorage.setItem('mario_project_id', 'default');
    global.fetch = jest.fn().mockImplementation((input: RequestInfo | URL) =>
      String(input) === '/api/brain/system/status'
        ? Promise.resolve({ ok: true, json: async () => ({ offline: false }) })
        : Promise.resolve({ ok: true, json: async () => ({ success: true, data: { esito: 'eseguito' } }) }));
  });
  afterEach(() => { jest.resetAllMocks(); window.localStorage.clear(); });

  it('un relè: Accendi e Spegni, come li chiama l\'Hub', async () => {
    disegna({ type: 'switch_relay', capabilities: [ONOFF] });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Accendi' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Spegni' })).toBeInTheDocument();
  });

  it('la valvola `termostato` ha il controllo della temperatura (prima: solo On/Off)', async () => {
    disegna({ type: 'termostato', capabilities: [ONOFF, TEMPERATURA], state: { setpoint: 21 } });
    await waitFor(() => expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '−' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Imposta temperatura' })).toBeNull();
  });

  it('una tapparella: «Apri» manda `open`, non `turn_on`; la posizione non è un pulsante', async () => {
    disegna({ type: 'cover', capabilities: [COVER] });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apri' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Posizione' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Apri' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      '/api/brain/projects/default/actions/ui-command',
      expect.objectContaining({ body: JSON.stringify({ device_id: 'd', action: 'open', params: {} }) }),
    ));
  });

  it('un sensore non ha pulsanti', async () => {
    const { container } = disegna({ type: 'sensor', capabilities: [{ key: 'temperature_read', label: 'Temperatura', actions: [], letture: ['temperature'] }] });
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  it('un device che non dichiara azioni non riceve un On/Off inventato', async () => {
    const { container } = disegna({ type: 'light', capabilities: [] });
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });
});
