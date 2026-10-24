'use client';

/**
 * SessionContext — espone i dati dell'utente corrente e il logout.
 *
 * Carica l'utente da /api/auth/me al mount.
 * Il logout chiama /api/auth/logout (che revoca i token sul Hub) e reindirizza a /login.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

export interface SessionUser {
  id:         string;
  username:   string;
  role:       string;
  project_id: string | null;
}

interface SessionContextValue {
  user:    SessionUser | null;
  loading: boolean;
  logout:  () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  user:    null,
  loading: true,
  logout:  async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        const d = data as { id?: string; username?: string; role?: string; project_id?: string | null } | null;
        if (d?.username) {
          setUser({
            id:         d.id ?? '',
            username:   d.username,
            role:       d.role ?? 'utente',
            project_id: d.project_id ?? null,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* best-effort */ }
    setUser(null);
    // Un ricaricamento intero, non una navigazione: dopo il logout non resta in
    // memoria niente della persona di prima (com'era il logout di Impostazioni).
    window.location.href = '/login';
  }, []);

  return (
    <SessionContext.Provider value={{ user, loading, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}
