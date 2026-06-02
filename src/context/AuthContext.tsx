'use client';

/**
 * context/AuthContext.tsx
 *
 * Espone utente corrente e ruolo letto dal cookie mario_hub_token via /api/auth/me.
 *
 * Modalità locale (NEXT_PUBLIC_REMOTE_AUTH_MODE non impostato):
 *   Non effettua fetch — restituisce isAdmin=true per retrocompatibilità.
 *
 * Modalità remota (NEXT_PUBLIC_REMOTE_AUTH_MODE=true):
 *   Fetcha /api/auth/me al mount e ad ogni logout/login.
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface AuthUser {
  id:         string;
  username:   string;
  role:       'admin' | 'installatore' | 'utente';
  project_id: string | null;
}

export interface AuthContextValue {
  user:        AuthUser | null;
  isAdmin:     boolean;
  isInstaller: boolean;
  loading:     boolean;
  refresh:     () => void;
}

// Default: nessun provider → tratta come locale (isAdmin=false, nessun fetch)
const AuthContext = createContext<AuthContextValue>({
  user:        null,
  isAdmin:     false,
  isInstaller: false,
  loading:     false,
  refresh:     () => {},
});

const REMOTE_AUTH = process.env.NEXT_PUBLIC_REMOTE_AUTH_MODE === 'true';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(REMOTE_AUTH);

  const load = useCallback(async () => {
    if (!REMOTE_AUTH) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json() as Partial<AuthUser>;
        setUser(data.username ? (data as AuthUser) : null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const isAdmin     = !REMOTE_AUTH || user?.role === 'admin';
  const isInstaller = !REMOTE_AUTH || isAdmin || user?.role === 'installatore';

  return (
    <AuthContext.Provider value={{ user, isAdmin, isInstaller, loading, refresh: load }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
