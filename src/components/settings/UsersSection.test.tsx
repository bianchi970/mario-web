import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UsersSection from '@/components/settings/UsersSection';
import { OfflineModeProvider } from '@/components/layout/OfflineModeProvider';
import { ProjectProvider } from '@/context/ProjectContext';
import { InstallerModeProvider } from '@/context/InstallerModeContext';

const MOCK_USERS = [
  { id: 'u1', username: 'admin',   role: 'admin',   project_id: null, active: 1 },
  { id: 'u2', username: 'mario',   role: 'utente',  project_id: null, active: 1 },
  { id: 'u3', username: 'vecchio', role: 'utente',  project_id: null, active: 0 },
];

describe('UsersSection', () => {
  beforeEach(() => {
    window.localStorage.setItem('mario_project_id', 'default');
    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url    = String(input);
      const method = init?.method ?? 'GET';

      if (url === '/api/system/status') {
        return Promise.resolve({ ok: true, json: async () => ({ offline: false }) });
      }
      if (url === '/api/hub/users' && method === 'GET') {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: MOCK_USERS }) });
      }
      if (url === '/api/hub/users' && method === 'POST') {
        const body = JSON.parse(String(init?.body)) as { username: string; role: string };
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { id: 'u4', username: body.username, role: body.role, project_id: null, active: 1 },
          }),
        });
      }
      if (/\/api\/hub\/users\/.+/.test(url) && method === 'DELETE') {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: null }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.resetAllMocks();
    window.localStorage.clear();
  });

  function renderSection(currentUserId?: string) {
    return render(
      <ProjectProvider>
        <InstallerModeProvider>
          <OfflineModeProvider>
            <UsersSection currentUserId={currentUserId} />
          </OfflineModeProvider>
        </InstallerModeProvider>
      </ProjectProvider>,
    );
  }

  it('mostra la lista utenti caricata dal Hub', async () => {
    renderSection();
    await screen.findByText('admin');
    expect(screen.getByText('mario')).toBeInTheDocument();
    expect(screen.getByText('vecchio')).toBeInTheDocument();
  });

  it('mostra badge Disattivo per utenti inattivi', async () => {
    renderSection();
    await screen.findByText('vecchio');
    const badges = screen.getAllByText('Disattivo');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('non mostra Disattiva per utente corrente', async () => {
    renderSection('u1');
    await screen.findByText('admin');
    // u1 = corrente (no btn), u3 = già disattivo (no btn) → solo u2 ha Disattiva
    const deactivateBtns = screen
      .getAllByRole('button')
      .filter((b) => b.textContent === 'Disattiva');
    expect(deactivateBtns).toHaveLength(1);
  });

  it('crea un nuovo utente tramite form', async () => {
    renderSection();
    await screen.findByText('admin');

    fireEvent.click(screen.getByRole('button', { name: 'Nuovo utente' }));

    fireEvent.change(screen.getByLabelText('Nuovo username'), { target: { value: 'nuovo' } });
    fireEvent.change(screen.getByLabelText('Nuova password'), { target: { value: 'pass123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Crea' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/hub/users',
        expect.objectContaining({ method: 'POST' }),
      );
    });
    await screen.findByText('nuovo');
  });

  it('disattiva un utente via DELETE', async () => {
    renderSection('u1');
    await screen.findByText('mario');

    // Unico bottone Disattiva disponibile è per u2
    const deactivateBtn = screen.getByRole('button', { name: 'Disattiva' });
    fireEvent.click(deactivateBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/hub/users/u2',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });
});
