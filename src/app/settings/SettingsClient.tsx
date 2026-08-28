'use client';

import { useEffect, useRef, useState } from 'react';
import type { Adapter, ProjectMode, SystemInfo } from '@/lib/hub-types';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useOfflineMode } from '@/components/layout/OfflineModeProvider';
import { useProject } from '@/context/ProjectContext';
import { useInstallerMode } from '@/context/InstallerModeContext';
import { getProjectMode, MODE_LABELS, MODE_ORDER, setProjectMode } from '@/lib/api/mode';
import { patchProjectLocation } from '@/lib/api/weather';
import UsersSection from '@/components/settings/UsersSection';

function formatAdapterStatus(status: string): { label: string; variant: 'green' | 'red' | 'amber' | 'gray' } {
  const map: Record<string, { label: string; variant: 'green' | 'red' | 'amber' | 'gray' }> = {
    active:         { label: 'Attivo',         variant: 'green' },
    registered:     { label: 'Registrato',     variant: 'gray'  },
    degraded:       { label: 'Degradato',      variant: 'amber' },
    stopped:        { label: 'Fermo',          variant: 'gray'  },
    error:          { label: 'Errore',         variant: 'red'   },
    bridge_offline: { label: 'Bridge offline', variant: 'red'   },
  };
  return map[status] ?? { label: 'Sconosciuto', variant: 'gray' };
}

interface Props {
  adapters: Adapter[];
  system: SystemInfo | null;
  adaptersAvailable: boolean;
  systemAvailable: boolean;
  hubDisplayUrl: string;
}

export default function SettingsClient({
  adapters,
  system,
  adaptersAvailable,
  systemAvailable,
  hubDisplayUrl,
}: Props) {
  const [health, setHealth] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyNumber, setEmergencyNumber] = useState('');
  const [emergencySaved, setEmergencySaved] = useState(false);
  const [locationLat, setLocationLat] = useState('');
  const [locationLon, setLocationLon] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationMsg, setLocationMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const locationMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentMode, setCurrentMode] = useState<ProjectMode | null>(null);
  const [modeChanging, setModeChanging] = useState(false);
  const [me, setMe] = useState<{ id: string | null; role: string | null } | null>(null);
  const { projectId, setProjectId, authorizedProjects, projectsStatus, fetchAuthorizedProjects } = useProject();
  const { offlineMode, offlineModeLoading, setOfflineMode } = useOfflineMode();
  const { installerMode, setInstallerMode } = useInstallerMode();

  // Carica contatto emergenza da localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('mario_emergency_contact');
      if (raw) {
        const parsed = JSON.parse(raw) as { name?: string; number?: string };
        if (parsed.name) setEmergencyName(parsed.name);
        if (parsed.number) setEmergencyNumber(parsed.number);
      }
    } catch { /* ignora */ }
  }, []);

  function saveEmergencyContact() {
    try {
      if (emergencyName.trim() && emergencyNumber.trim()) {
        localStorage.setItem('mario_emergency_contact', JSON.stringify({ name: emergencyName.trim(), number: emergencyNumber.trim() }));
      } else {
        localStorage.removeItem('mario_emergency_contact');
      }
      setEmergencySaved(true);
      setTimeout(() => setEmergencySaved(false), 3000);
    } catch { /* ignora */ }
  }

  // B96: carica lista progetti autorizzati al mount della pagina Settings
  useEffect(() => {
    void fetchAuthorizedProjects();
  }, [fetchAuthorizedProjects]);

  useEffect(() => {
    void fetch('/api/auth/me')
      .then((r) => r.json() as Promise<{ id: string | null; role: string | null }>)
      .then((d) => setMe(d))
      .catch(() => { /* ignora */ });
  }, []);

  useEffect(() => {
    if (!projectId || !systemAvailable) return;
    void getProjectMode(projectId).then((info) => {
      if (info) setCurrentMode(info.mode);
    });
  }, [projectId, systemAvailable]);

  async function handleSetMode(mode: ProjectMode) {
    if (!projectId || modeChanging) return;
    setModeChanging(true);
    const ok = await setProjectMode(projectId, mode);
    if (ok) setCurrentMode(mode);
    setModeChanging(false);
  }

  async function checkHealth() {
    if (offlineMode) return;
    setHealth('checking');
    try {
      const res = await fetch('/api/hub/health');
      const data = await res.json() as { status: string };
      setHealth(data.status === 'ok' ? 'ok' : 'error');
    } catch {
      setHealth('error');
    }
  }

  async function handleSaveLocation() {
    if (!projectId || locationSaving) return;
    const lat = parseFloat(locationLat);
    const lon = parseFloat(locationLon);
    if (isNaN(lat) || isNaN(lon)) {
      setLocationMsg({ ok: false, text: 'Latitudine e longitudine devono essere numeri validi.' });
      return;
    }
    setLocationSaving(true);
    try {
      await patchProjectLocation(projectId, lat, lon, locationCity.trim());
      setLocationMsg({ ok: true, text: 'Posizione salvata.' });
    } catch {
      setLocationMsg({ ok: false, text: 'Errore salvataggio posizione.' });
    } finally {
      setLocationSaving(false);
      if (locationMsgTimer.current) clearTimeout(locationMsgTimer.current);
      locationMsgTimer.current = setTimeout(() => setLocationMsg(null), 4000);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <div className="space-y-6">

      {/* Account — sempre visibile */}
      <div className="card space-y-3">
        <h2 className="text-sm font-medium text-hub-text">Account</h2>
        {me?.id && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-hub-muted">{me.id}</span>
            {me.role && <span className="text-xs text-hub-muted capitalize">{me.role}</span>}
          </div>
        )}
        <div>
          <button
            onClick={() => void handleLogout()}
            className="text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Esci
          </button>
        </div>
      </div>

      {/* Contatto emergenza — sempre visibile */}
      <div className="card space-y-3">
        <h2 className="text-sm font-medium text-hub-text">Contatto emergenza</h2>
        <p className="text-xs text-hub-muted">
          Usato dal pulsante SOS. Se vuoto, sarà mostrato solo il 112.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-hub-muted mb-1">Nome familiare</label>
            <input
              type="text"
              placeholder="Mamma"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              className="w-full bg-hub-bg border border-hub-border rounded-lg px-3 py-1.5 text-sm text-hub-text focus:outline-none focus:border-hub-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-hub-muted mb-1">Numero</label>
            <input
              type="tel"
              placeholder="+39 333 1234567"
              value={emergencyNumber}
              onChange={(e) => setEmergencyNumber(e.target.value)}
              className="w-full bg-hub-bg border border-hub-border rounded-lg px-3 py-1.5 text-sm text-hub-text font-mono focus:outline-none focus:border-hub-accent"
            />
          </div>
        </div>
        {emergencySaved && (
          <p className="text-xs text-emerald-400">Contatto salvato.</p>
        )}
        <button
          onClick={saveEmergencyContact}
          className="w-full rounded-lg border border-hub-accent/50 py-2 text-sm text-hub-accent hover:bg-hub-accent/10 transition-colors"
        >
          Salva contatto
        </button>
      </div>

      {/* Stato app — sempre visibile */}
      <div className="card space-y-3">
        <h2 className="text-sm font-medium text-hub-text">Stato app</h2>
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-sm text-hub-muted block">Stato offline di sistema</span>
            <span className="text-xs text-hub-muted">Blocca davvero il runtime del Brain prima di ogni comando verso l&apos;hub.</span>
          </div>
          <label className="flex items-center gap-2 text-sm text-hub-text">
            <input
              type="checkbox"
              checked={offlineMode}
              onChange={(e) => setOfflineMode(e.target.checked)}
              aria-label="Stato offline di sistema"
              disabled={offlineModeLoading}
              className="h-4 w-4 accent-hub-red"
            />
            {offlineModeLoading ? 'Sincronizzazione...' : offlineMode ? 'Attivo' : 'Disattivo'}
          </label>
        </div>
      </div>

      {/* Modalità impianto — sempre visibile se disponibile */}
      {currentMode && (
        <div className="card space-y-3">
          <h2 className="text-sm font-medium text-hub-text">Modalità impianto</h2>
          <div className="flex flex-wrap gap-2">
            {MODE_ORDER.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => void handleSetMode(m)}
                disabled={modeChanging}
                aria-pressed={currentMode === m}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                  currentMode === m
                    ? 'bg-hub-accent text-white'
                    : 'border border-hub-border text-hub-muted hover:text-hub-text'
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modalità installatore — sempre visibile */}
      <div className="card space-y-3">
        <h2 className="text-sm font-medium text-hub-text">Modalità</h2>
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-sm text-hub-muted block">Modalità installatore</span>
            <span className="text-xs text-hub-muted">Abilita voci tecniche: Dispositivi e Aggiungi dispositivo.</span>
          </div>
          <label className="flex items-center gap-2 text-sm text-hub-text">
            <input
              type="checkbox"
              checked={installerMode}
              onChange={(e) => setInstallerMode(e.target.checked)}
              aria-label="Modalità installatore"
              className="h-4 w-4 accent-hub-accent"
            />
            {installerMode ? 'Attiva' : 'Disattiva'}
          </label>
        </div>
      </div>

      {/* Sezioni tecniche — solo installatore */}
      {installerMode && (
        <>
          {/* Hub Connection */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-hub-text">Hub Connection</h2>
              <div className="flex items-center gap-2">
                {offlineMode && <Badge variant="red">Sistema offline</Badge>}
                {!systemAvailable && <Badge variant="red">Hub offline</Badge>}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-hub-muted">Hub URL</span>
              <span className="font-mono text-hub-text text-xs">{hubDisplayUrl}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-hub-muted">Health check</span>
              <div className="flex items-center gap-2">
                {offlineMode ? (
                  <Badge variant="red">Bloccato da sistema offline</Badge>
                ) : !systemAvailable ? (
                  <Badge variant="red">Hub offline</Badge>
                ) : health !== 'idle' ? (
                  <Badge variant={health === 'ok' ? 'green' : health === 'error' ? 'red' : 'amber'}>
                    {health === 'checking' ? 'checking...' : health}
                  </Badge>
                ) : null}
                <Button size="sm" loading={health === 'checking'} onClick={checkHealth} disabled={offlineMode || offlineModeLoading}>
                  Check
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-hub-muted">Auth</span>
              <Badge variant="gray">Bearer token (server-side)</Badge>
            </div>
          </div>

          {/* Project */}
          <div className="card space-y-3">
            <h2 className="text-sm font-medium text-hub-text">Project</h2>
            <div className="flex items-center gap-3">
              <label className="text-sm text-hub-muted shrink-0">Project ID</label>
              {projectsStatus === 'loading' ? (
                <span className="text-sm text-hub-muted italic">Caricamento...</span>
              ) : projectsStatus === 'empty' ? (
                <span className="text-sm text-red-500 font-medium">
                  Nessuna casa autorizzata. Contatta l&apos;amministratore.
                </span>
              ) : authorizedProjects.length > 0 ? (
                <select
                  value={projectId ?? ''}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="flex-1 bg-hub-bg border border-hub-border rounded-lg px-3 py-1.5 text-sm text-hub-text font-mono focus:outline-none focus:border-hub-accent"
                >
                  {authorizedProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name || p.id}</option>
                  ))}
                </select>
              ) : (
                /* unauthenticated o offline → input libero (modalità locale) */
                <input
                  type="text"
                  value={projectId ?? ''}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="flex-1 bg-hub-bg border border-hub-border rounded-lg px-3 py-1.5 text-sm text-hub-text font-mono focus:outline-none focus:border-hub-accent"
                  placeholder="Project ID"
                />
              )}
            </div>
            <p className="text-xs text-hub-muted">
              {projectsStatus === 'empty'
                ? 'Operazioni bloccate: contatta il proprietario della casa per ricevere accesso.'
                : 'Salvato nel browser. E\u2019 la sorgente unica per dispositivi, stanze e scenari.'}
            </p>
          </div>

          {/* Posizione meteo */}
          <div className="card space-y-3">
            <h2 className="text-sm font-medium text-hub-text">Posizione meteo</h2>
            <p className="text-xs text-hub-muted">
              Usata per il meteo Open-Meteo nella Home. Lascia vuoto per disattivare.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-hub-muted mb-1">Latitudine</label>
                <input
                  type="number" step="0.0001" placeholder="45.4654"
                  value={locationLat}
                  onChange={(e) => setLocationLat(e.target.value)}
                  className="w-full bg-hub-bg border border-hub-border rounded-lg px-3 py-1.5 text-sm text-hub-text font-mono focus:outline-none focus:border-hub-accent"
                />
              </div>
              <div>
                <label className="block text-xs text-hub-muted mb-1">Longitudine</label>
                <input
                  type="number" step="0.0001" placeholder="9.1859"
                  value={locationLon}
                  onChange={(e) => setLocationLon(e.target.value)}
                  className="w-full bg-hub-bg border border-hub-border rounded-lg px-3 py-1.5 text-sm text-hub-text font-mono focus:outline-none focus:border-hub-accent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-hub-muted mb-1">Città (opzionale)</label>
              <input
                type="text" placeholder="Milano"
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                className="w-full bg-hub-bg border border-hub-border rounded-lg px-3 py-1.5 text-sm text-hub-text focus:outline-none focus:border-hub-accent"
              />
            </div>
            {locationMsg && (
              <p className={`text-xs ${locationMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {locationMsg.text}
              </p>
            )}
            <button
              onClick={() => void handleSaveLocation()}
              disabled={locationSaving || !locationLat || !locationLon}
              className="w-full rounded-lg border border-hub-accent/50 py-2 text-sm text-hub-accent hover:bg-hub-accent/10 disabled:opacity-40 transition-colors"
            >
              {locationSaving ? 'Salvataggio...' : 'Salva posizione'}
            </button>
          </div>

          {/* System Info */}
          {system ? (
            <div className="card space-y-2">
              <h2 className="text-sm font-medium text-hub-text">System Info</h2>
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                {[
                  ['Hostname', system.hostname],
                  ['Platform', `${system.platform} / ${system.arch}`],
                  ['Memory', `${system.memory_mb} MB`],
                  ['Uptime', `${Math.round(system.uptime_s / 60)} min`],
                  ['Adapters', `${system.active_adapters} / ${system.adapters} active`],
                  ['Project', system.default_project_id],
                ].map(([key, value]) => (
                  <div key={key}>
                    <span className="text-hub-muted block">{key}</span>
                    <span className="text-hub-text font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-medium text-hub-text">System Info</h2>
                <Badge variant="red">Offline</Badge>
              </div>
              <p className="text-sm text-hub-text">System info not reachable.</p>
            </div>
          )}

          {/* Adapters */}
          {!adaptersAvailable ? (
            <div className="card space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-medium text-hub-text">Adapters</h2>
                <Badge variant="red">Offline</Badge>
              </div>
              <p className="text-sm text-hub-text">Adapter status not reachable.</p>
            </div>
          ) : adapters.length > 0 ? (
            <div className="card space-y-2">
              <h2 className="text-sm font-medium text-hub-text">Adapters ({adapters.length})</h2>
              <div className="space-y-2">
                {adapters.map((adapter) => (
                  <div key={adapter.adapter_id} className="flex items-center justify-between text-xs p-2 bg-hub-bg rounded-lg">
                    <div>
                      <span className="text-hub-text font-mono">{adapter.adapter_id}</span>
                      {adapter.vendor && <span className="text-hub-muted ml-2">{adapter.vendor}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {adapter.devices != null && <span className="text-hub-muted">{adapter.devices} dev</span>}
                      {(() => {
                        const status = formatAdapterStatus(adapter.status);
                        return <Badge variant={status.variant}>{status.label}</Badge>;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Area tecnica */}
          <div className="card space-y-2">
            <h2 className="text-sm font-medium text-hub-text">Area tecnica</h2>
            {[
              { href: '/devices',    label: 'Dispositivi' },
              { href: '/gateways',   label: 'Gateway' },
              { href: '/energy',     label: 'Energia' },
              { href: '/storico',    label: 'Storico' },
              { href: '/onboarding', label: 'Aggiungi dispositivo' },
            ].map(({ href, label }) => (
              <a key={href} href={href}
                className="flex items-center justify-between py-1.5 text-sm text-hub-muted hover:text-hub-text">
                {label} <span>→</span>
              </a>
            ))}
          </div>
        </>
      )}

      {/* Utenti — solo admin */}
      {me?.role === 'admin' && <UsersSection currentUserId={me.id} />}

    </div>
  );
}
