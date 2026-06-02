'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const from         = searchParams.get('from') ?? '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.push(from);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        if (data.error === 'invalid_credentials') {
          setError('Credenziali non valide.');
        } else if (data.error === 'hub_unreachable') {
          setError('Hub non raggiungibile.');
        } else {
          setError('Errore di accesso.');
        }
      }
    } catch {
      setError('Impossibile contattare il server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-hub-bg px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="font-bold text-2xl tracking-tight text-white">MARIO</span>
          <span className="ml-1 text-sm text-hub-accent font-mono">web</span>
          <p className="mt-2 text-xs text-hub-muted">Accesso remoto</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="text-xs text-hub-muted block mb-1">Utente</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
              autoComplete="username"
              placeholder="admin"
              className="w-full px-3 py-2 rounded-lg border border-hub-border bg-hub-bg text-hub-text text-sm focus:outline-none focus:border-hub-accent"
            />
          </div>

          <div>
            <label className="text-xs text-hub-muted block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-lg border border-hub-border bg-hub-bg text-hub-text text-sm focus:outline-none focus:border-hub-accent"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full py-2 rounded-lg bg-hub-accent text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {loading ? 'Accesso…' : 'Entra'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
