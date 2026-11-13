'use client';

import { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api/client';

// All'associazione MARIO dice cosa ha capito, e chiede ciò che non può sapere
// (13/11/2026). Fino a oggi: «✓ Dispositivo trovato» e un id. Ciò che il device
// DICHIARA si mostra (tipo, marca, letture, azioni); cosa comanda un relè lo sa
// solo chi l'ha collegato, e si chiede; il nome lo dà chi abita.

type Capability = { key: string; label?: string; actions?: string[]; letture?: string[] };
type Trovato = {
  id: string;
  name: string;
  type?: string;
  metadata?: { brand?: string | null; model?: string | null; electrical_function?: string | null };
  capabilities?: Capability[];
  capacita?: { azioni?: Record<string, unknown> };
};
type Funzione = { id: string; label: string };

// Letture che servono all'impianto, non a chi abita: non si elencano.
const TECNICHE = new Set(['signal_read']);
const AZIONI: Record<string, string> = {
  turn_on: 'accendere', turn_off: 'spegnere', toggle: 'commutare', open: 'aprire', close: 'chiudere',
  stop: 'fermare', set_position: 'posizionare', set_brightness: 'regolare la luce', set_temperature: 'impostare la temperatura',
  lock: 'chiudere a chiave', unlock: 'aprire la serratura',
};

const dati = <T,>(p: unknown): T => ((p && typeof p === 'object' && 'data' in p) ? (p as { data: T }).data : p as T);

export default function CosaHoTrovato({ projectId, deviceId, onDone }: {
  projectId: string;
  deviceId: string;
  onDone: (info: { name: string; comandabile: boolean }) => void;
}) {
  const [device, setDevice] = useState<Trovato | null>(null);
  const [funzioni, setFunzioni] = useState<Funzione[]>([]);
  const [funzione, setFunzione] = useState('');
  const [nome, setNome] = useState('');
  const [errore, setErrore] = useState('');
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    let via = false;
    (async () => {
      try {
        const d = dati<Trovato>(await fetchAPI(`/api/hub/devices/${encodeURIComponent(deviceId)}?project_id=${encodeURIComponent(projectId)}`));
        if (via) return;
        setDevice(d);
        setNome(d?.name ?? '');
        if (d && !d.metadata?.electrical_function) {
          const f = dati<{ funzioni: Funzione[] }>(await fetchAPI('/api/hub/funzioni'));
          if (!via) setFunzioni(f?.funzioni ?? []);
        }
      } catch {
        if (!via) setErrore('Non riesco a leggere il dispositivo dall\'Hub.');
      }
    })();
    return () => { via = true; };
  }, [deviceId, projectId]);

  const azioni = Object.keys(device?.capacita?.azioni ?? {});
  const comandabile = azioni.length > 0;
  const sa = (device?.capabilities ?? []).filter((c) => !TECNICHE.has(c.key) && (c.letture?.length ?? 0) > 0)
    .map((c) => c.label || c.key);
  const fa = azioni.map((a) => AZIONI[a] || a);
  const marca = [device?.metadata?.brand, device?.metadata?.model].filter(Boolean).join(' ');
  // Chiedere cosa comanda ha senso solo per chi comanda qualcosa e non l'ha detto.
  const chiedi = comandabile && !device?.metadata?.electrical_function && funzioni.length > 0;

  async function avanti() {
    if (!device) return;
    const atto: Record<string, string> = {};
    const n = nome.trim();
    if (n && n !== device.name) atto.name = n;
    if (chiedi && funzione) atto.electrical_function = funzione;
    setSalvo(true);
    setErrore('');
    try {
      if (Object.keys(atto).length) {
        await fetchAPI(`/api/hub/devices/${encodeURIComponent(device.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ ...atto, project_id: projectId }),
        });
      }
      onDone({ name: n || device.name, comandabile });
    } catch {
      setErrore('Non sono riuscito a salvarlo: riprova.');
    } finally {
      setSalvo(false);
    }
  }

  if (errore && !device) return <p className="text-sm text-hub-red">{errore}</p>;
  if (!device) return <p className="text-sm text-hub-muted">Guardo cosa è…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-green-600/60 bg-green-900/20 p-4 space-y-1">
        <p className="text-hub-green font-semibold">&#10003; Ho trovato: {device.name}</p>
        {marca && <p className="text-xs text-hub-muted">{marca}</p>}
        {sa.length > 0 && <p className="text-sm text-hub-text">Mi sa dire: {sa.join(' · ')}</p>}
        {fa.length > 0
          ? <p className="text-sm text-hub-text">Posso: {fa.join(' · ')}</p>
          : <p className="text-sm text-hub-text">Non comanda niente: lo leggo soltanto.</p>}
      </div>

      {chiedi && (
        <label className="block space-y-1">
          <span className="text-sm text-hub-text">Cosa comanda?</span>
          <select
            aria-label="Cosa comanda?"
            value={funzione}
            onChange={(e) => setFunzione(e.target.value)}
            className="w-full bg-hub-surface border border-hub-border rounded-xl px-3.5 py-2.5 text-sm text-hub-text"
          >
            <option value="">Non lo so ancora</option>
            {funzioni.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          <span className="block text-xs text-hub-muted">Il dispositivo non lo può sapere: lo sa chi l&apos;ha collegato.</span>
        </label>
      )}

      <label className="block space-y-1">
        <span className="text-sm text-hub-text">Come lo chiami?</span>
        <input
          aria-label="Come lo chiami?"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="es. Sensore acqua depuratore"
          className="w-full bg-hub-surface border border-hub-border rounded-xl px-3.5 py-2.5 text-sm text-hub-text"
        />
      </label>

      {errore && <p className="text-xs text-hub-red">{errore}</p>}

      <button
        onClick={() => void avanti()}
        disabled={salvo}
        className="w-full bg-hub-accent text-black font-semibold py-3 rounded-xl text-sm disabled:opacity-50"
      >
        Avanti &#8250;
      </button>
    </div>
  );
}
