'use client';

import { useState, FormEvent, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const from         = searchParams.get('from') ?? '/';
  const expired      = searchParams.get('expired') === '1';
  const { showToast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  // Toast sessione scaduta (una volta sola al mount)
  useEffect(() => {
    if (expired) showToast('Sessione scaduta. Accedi nuovamente.', 'warning');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          setError('Hub non raggiungibile. Verifica la connessione.');
        } else {
          setError('Errore di accesso. Riprova.');
        }
      }
    } catch {
      setError('Impossibile contattare il server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ backgroundColor: 'var(--bg-app)' }}>
      <div className="w-full max-w-sm">

        {/* Logo HomeMARIO */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center
              text-white text-base font-bold shadow-lg">
              M
            </div>
            <span className="font-bold text-2xl tracking-tight text-text">HomeMARIO</span>
          </div>
          <p className="text-sm text-text-2">Accesso remoto</p>
        </div>

        {/* Card form */}
        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4"
        >
          <Input
            label="Utente"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
            autoComplete="username"
            placeholder="admin"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />

          {error && (
            <p className="text-xs text-danger">{error}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading || !username || !password}
            loading={loading}
          >
            Entra
          </Button>
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
