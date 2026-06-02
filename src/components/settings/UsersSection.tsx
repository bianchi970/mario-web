'use client';

import { useEffect, useState } from 'react';
import { listUsers, createUser, deactivateUser, type HubUser } from '@/lib/api/users';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

const ROLE_LABELS: Record<HubUser['role'], string> = {
  admin:        'Admin',
  installatore: 'Installatore',
  utente:       'Utente',
};

interface Props {
  currentUserId?: string | null;
}

export default function UsersSection({ currentUserId }: Props) {
  const [users,   setUsers]   = useState<HubUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [showForm,     setShowForm]     = useState(false);
  const [newUsername,  setNewUsername]  = useState('');
  const [newPassword,  setNewPassword]  = useState('');
  const [newRole,      setNewRole]      = useState<HubUser['role']>('utente');
  const [creating,     setCreating]     = useState(false);
  const [createError,  setCreateError]  = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setUsers(await listUsers());
    } catch {
      setError('Impossibile caricare utenti.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const user = await createUser({ username: newUsername, password: newPassword, role: newRole });
      setUsers((prev) => [...prev, user]);
      setNewUsername('');
      setNewPassword('');
      setNewRole('utente');
      setShowForm(false);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Errore creazione utente');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await deactivateUser(id);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active: 0 } : u)));
    } catch {
      // silent — ricarica alla prossima apertura
    }
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-hub-text">Utenti</h2>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annulla' : 'Nuovo utente'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-2 border border-hub-border rounded-lg p-3">
          <input
            type="text"
            placeholder="Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            required
            aria-label="Nuovo username"
            className="w-full px-3 py-1.5 rounded-lg border border-hub-border bg-hub-bg text-hub-text text-sm focus:outline-none focus:border-hub-accent"
          />
          <input
            type="password"
            placeholder="Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            aria-label="Nuova password"
            className="w-full px-3 py-1.5 rounded-lg border border-hub-border bg-hub-bg text-hub-text text-sm focus:outline-none focus:border-hub-accent"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as HubUser['role'])}
            aria-label="Ruolo utente"
            className="w-full px-3 py-1.5 rounded-lg border border-hub-border bg-hub-bg text-hub-text text-sm focus:outline-none focus:border-hub-accent"
          >
            <option value="utente">Utente</option>
            <option value="installatore">Installatore</option>
            <option value="admin">Admin</option>
          </select>
          {createError && <p className="text-xs text-red-400">{createError}</p>}
          <Button type="submit" size="sm" loading={creating} disabled={!newUsername || !newPassword}>
            Crea
          </Button>
        </form>
      )}

      {loading ? (
        <p className="text-xs text-hub-muted">Caricamento...</p>
      ) : error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : users.length === 0 ? (
        <p className="text-xs text-hub-muted">Nessun utente.</p>
      ) : (
        <div className="space-y-1">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between text-xs p-2 bg-hub-bg rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-hub-text font-mono">{u.username}</span>
                <Badge variant={u.active ? 'green' : 'gray'}>{ROLE_LABELS[u.role]}</Badge>
                {!u.active && <Badge variant="gray">Disattivo</Badge>}
              </div>
              {!!u.active && u.id !== currentUserId && (
                <Button size="sm" variant="danger" onClick={() => void handleDeactivate(u.id)}>
                  Disattiva
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
