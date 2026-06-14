'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const router = useRouter();

  const [currentPwd, setCurrentPwd]   = useState('');
  const [newPwd,     setNewPwd]       = useState('');
  const [confirmPwd, setConfirmPwd]   = useState('');
  const [error,      setError]        = useState<string | null>(null);
  const [loading,    setLoading]      = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPwd.length < 8) {
      setError('La nuova password deve avere almeno 8 caratteri.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setError('Le password non coincidono.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
      });

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        if (data.error === 'wrong_current_password') {
          setError('Password attuale non corretta.');
        } else if (data.error === 'weak_password') {
          setError('La nuova password è troppo debole (minimo 8 caratteri).');
        } else if (data.error === 'hub_unreachable') {
          setError('Hub non raggiungibile.');
        } else {
          setError('Errore durante il cambio password.');
        }
      }
    } catch {
      setError('Impossibile contattare il server.');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = currentPwd && newPwd && confirmPwd && !loading;

  return (
    <div className="min-h-screen flex items-center justify-center bg-hub-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-bold text-2xl tracking-tight text-white">MARIO</span>
          <span className="ml-1 text-sm text-hub-accent font-mono">web</span>
          <p className="mt-2 text-xs text-hub-muted">Imposta una nuova password per continuare</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="text-xs text-hub-muted block mb-1">Password attuale</label>
            <input
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              autoFocus
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-lg border border-hub-border bg-hub-bg text-hub-text text-sm focus:outline-none focus:border-hub-accent"
            />
          </div>

          <div>
            <label className="text-xs text-hub-muted block mb-1">Nuova password</label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="minimo 8 caratteri"
              className="w-full px-3 py-2 rounded-lg border border-hub-border bg-hub-bg text-hub-text text-sm focus:outline-none focus:border-hub-accent"
            />
          </div>

          <div>
            <label className="text-xs text-hub-muted block mb-1">Conferma nuova password</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-lg border border-hub-border bg-hub-bg text-hub-text text-sm focus:outline-none focus:border-hub-accent"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-2 rounded-lg bg-hub-accent text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {loading ? 'Salvataggio…' : 'Cambia password'}
          </button>
        </form>
      </div>
    </div>
  );
}
