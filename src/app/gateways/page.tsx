'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useGateway, type GatewayEntry } from '@/context/GatewayContext';

interface IdentityResponse {
  gateway_id: string;
  name: string;
  hub: string;
  brain: string;
  version: { web: string; hub: string | null };
}

export default function GatewaysPage() {
  const { gateways, currentUrl, addGateway, updateGateway, removeGateway, goToGateway } = useGateway();

  const [localIdentity, setLocalIdentity] = useState<IdentityResponse | null>(null);
  const [addUrl, setAddUrl] = useState('');
  const [addName, setAddName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Carica identità del gateway locale
  useEffect(() => {
    fetch('/api/gateway/identity')
      .then((r) => r.json())
      .then((d) => {
        setLocalIdentity(d);
        // Auto-registra questo gateway se non già salvato
        if (d.gateway_id) {
          addGateway({ id: d.gateway_id, name: d.name, url: currentUrl });
        }
      })
      .catch(() => {});
  }, [currentUrl]);

  // Ping periodico dei gateway salvati
  useEffect(() => {
    if (gateways.length === 0) return;
    function pingAll() {
      gateways.forEach((g) => {
        fetch(`${g.url}/api/gateway/identity`, { signal: AbortSignal.timeout(3000) })
          .then((r) => r.ok ? r.json() : null)
          .then((d) => {
            updateGateway(g.id, {
              online: !!d,
              last_seen: d ? new Date().toISOString() : g.last_seen,
              name: d?.name ?? g.name,
            });
          })
          .catch(() => updateGateway(g.id, { online: false }));
      });
    }
    pingAll();
    const t = setInterval(pingAll, 30_000);
    return () => clearInterval(t);
  }, [gateways.length]);

  async function handleAdd() {
    setAddError(null);
    setChecking(true);
    const url = addUrl.trim().replace(/\/$/, '');
    if (!url) { setAddError('URL obbligatorio'); setChecking(false); return; }

    try {
      const res = await fetch(`${url}/api/gateway/identity`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error('non risponde');
      const data: IdentityResponse = await res.json();
      addGateway({
        id:   data.gateway_id || `manual-${Date.now()}`,
        name: addName.trim() || data.name || url,
        url,
        online: true,
        last_seen: new Date().toISOString(),
      });
      setAddUrl('');
      setAddName('');
    } catch {
      setAddError('Gateway non raggiungibile. Verifica URL e connessione.');
    } finally {
      setChecking(false);
    }
  }

  const isCurrent = (g: GatewayEntry) =>
    g.url === currentUrl || g.url === window?.location?.origin;

  return (
    <>
      <TopBar title="Gateway" />
      <main className="flex-1 p-5 space-y-6 max-w-lg">

        {/* Gateway locale attivo */}
        {localIdentity && (
          <div className="card space-y-2 border border-hub-accent/30">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-hub-accent/20 text-hub-accent px-2 py-0.5 rounded-full font-medium">Questo gateway</span>
            </div>
            <p className="font-semibold text-hub-text">{localIdentity.name}</p>
            <div className="text-xs text-hub-muted space-y-0.5">
              <div>ID: <span className="font-mono text-hub-text">{localIdentity.gateway_id}</span></div>
              <div>Web v{localIdentity.version.web} · Hub v{localIdentity.version.hub ?? '?'}</div>
              <div className="flex gap-3 mt-1">
                <span className={localIdentity.hub === 'reachable' ? 'text-green-400' : 'text-red-400'}>
                  Hub {localIdentity.hub === 'reachable' ? '✓' : '✗'}
                </span>
                <span className={localIdentity.brain === 'reachable' ? 'text-green-400' : 'text-red-400'}>
                  Brain {localIdentity.brain === 'reachable' ? '✓' : '✗'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Lista gateway salvati (altri) */}
        {gateways.filter((g) => !isCurrent(g)).length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-hub-muted uppercase tracking-wide">Altri gateway</p>
            {gateways.filter((g) => !isCurrent(g)).map((g) => (
              <div key={g.id} className="card space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      g.online === true ? 'bg-green-400' :
                      g.online === false ? 'bg-red-400' : 'bg-hub-muted'
                    }`} />
                    <span className="font-medium text-hub-text text-sm">{g.name}</span>
                  </div>
                  <button
                    onClick={() => removeGateway(g.id)}
                    className="text-xs text-hub-muted hover:text-red-400 transition-colors"
                  >
                    Rimuovi
                  </button>
                </div>
                <div className="text-xs text-hub-muted font-mono">{g.url}</div>
                {g.last_seen && (
                  <div className="text-xs text-hub-muted">
                    Visto: {new Date(g.last_seen).toLocaleString('it-IT')}
                  </div>
                )}
                <button
                  onClick={() => goToGateway(g.url)}
                  disabled={!g.online}
                  className="text-xs px-3 py-1.5 rounded-lg border border-hub-accent/50 text-hub-accent hover:bg-hub-accent/10 disabled:opacity-40 transition-colors"
                >
                  Apri gateway →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Aggiungi gateway */}
        <div className="card space-y-3">
          <p className="text-sm font-medium text-hub-text">Aggiungi gateway</p>
          <div className="space-y-2">
            <input
              type="url"
              value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              placeholder="https://192.168.1.20"
              className="w-full px-3 py-2 rounded-lg border border-hub-border bg-hub-bg text-hub-text text-sm font-mono focus:outline-none focus:border-hub-accent"
            />
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Nome impianto (opzionale)"
              className="w-full px-3 py-2 rounded-lg border border-hub-border bg-hub-bg text-hub-text text-sm focus:outline-none focus:border-hub-accent"
            />
          </div>
          {addError && <p className="text-xs text-red-400">{addError}</p>}
          <button
            onClick={handleAdd}
            disabled={checking || !addUrl.trim()}
            className="w-full py-2 rounded-lg bg-hub-accent text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {checking ? 'Verifica…' : '+ Aggiungi'}
          </button>
          <p className="text-xs text-hub-muted">
            Inserisci l&apos;URL del gateway MARIO raggiungibile da questa rete.
          </p>
        </div>

      </main>
    </>
  );
}
