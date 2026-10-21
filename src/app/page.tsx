'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Battery,
  Eye,
  PlusCircle,
  Shield,
  ShieldAlert,
  Smartphone,
  Sun,
  Thermometer,
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { useProjectId } from '@/hooks/useProjectId';
import { useProject } from '@/context/ProjectContext';
import { useInstallerMode } from '@/context/InstallerModeContext';
import { ApiClientError } from '@/lib/api/client';
import { listDevices } from '@/lib/api/devices';
import { listRooms } from '@/lib/api/rooms';
import type { Device, Room } from '@/lib/hub-types';
import { computeHouseState, computeRoomStates } from '@/lib/house-state';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import PushEnableBanner from '@/components/notifications/PushEnableBanner';
import WeatherBanner from '@/components/dashboard/WeatherBanner';
import { getWeatherData, type WeatherData } from '@/lib/api/weather';
import NLCommandBar from '@/components/brain/NLCommandBar';
import { getDeviceHistory } from '@/lib/api/history';

/* ─── helpers ─────────────────────────────────────────── */

function serviceDot(ok: boolean) {
  return ok
    ? 'bg-emerald-400 shadow shadow-emerald-500/40'
    : 'bg-red-400 shadow shadow-red-500/40';
}

/* ─── componenti ──────────────────────────────────────── */

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-text-2">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function RoomCard({
  room,
  temperature,
  lux,
  motionActive,
  lightsOn,
  lightsTotal,
}: {
  room: Room;
  temperature: number | null;
  lux: number | null;
  motionActive: boolean;
  lightsOn: number;
  lightsTotal: number;
}) {
  const hasData = temperature !== null || lux !== null || motionActive || lightsTotal > 0;
  const lightsActive = lightsOn > 0;
  return (
    <div className={`rounded-[22px] border p-4 transition-colors ${
      lightsActive
        ? 'border-amber-500/20 bg-amber-500/[0.05]'
        : motionActive
        ? 'border-orange-500/20 bg-orange-500/[0.04]'
        : 'border-border bg-surface'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium text-text text-sm">{room.name}</div>
        {lightsTotal > 0 && (
          <div className={`text-xs px-2 py-0.5 rounded-full border ${
            lightsActive
              ? 'border-amber-500/30 bg-amber-500/15 text-amber-600'
              : 'border-border bg-surface-2 text-text-2'
          }`}>
            {lightsOn}/{lightsTotal}
          </div>
        )}
      </div>
      {hasData ? (
        <div className="grid grid-cols-2 gap-1.5">
          {temperature !== null && (
            <div className="flex items-center gap-1.5">
              <Thermometer className="h-3.5 w-3.5 text-sky-500 shrink-0" />
              <span className="text-xs text-text-2">{temperature.toFixed(1)}°</span>
            </div>
          )}
          {lux !== null && (
            <div className="flex items-center gap-1.5">
              <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="text-xs text-text-2">{Math.round(lux)} lx</span>
            </div>
          )}
          {motionActive && (
            <div className="flex items-center gap-1.5 col-span-2">
              <Eye className="h-3.5 w-3.5 text-orange-500 shrink-0" />
              <span className="text-xs text-orange-600">Movimento</span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-text-2/60">Nessun sensore</div>
      )}
    </div>
  );
}

/* ─── pagina principale ───────────────────────────────── */

export default function DashboardPage() {
  const projectId = useProjectId();
  const { setProjectId } = useProject();
  const { installerMode } = useInstallerMode();
  const [mounted, setMounted] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const weatherTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [viewDay, setViewDay] = useState<'oggi' | 'ieri'>('oggi');
  const [yStats, setYStats] = useState<{ tempMin: number | null; tempMax: number | null; luxMax: number | null } | null>(null);
  const [yLoading, setYLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!projectId) {
      setDevices(null);
      setRooms(null);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [deviceItems, roomItems] = await Promise.all([
          listDevices(projectId!, controller.signal),
          listRooms(projectId!, controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setDevices(deviceItems);
        setRooms(roomItems);
      } catch (err) {
        if (controller.signal.aborted) return;
        setDevices(null);
        setRooms(null);
        if (err instanceof ApiClientError && (err.status === 500 || err.status === 502)) {
          setError('Casa non raggiungibile');
        } else {
          setError('Errore caricamento');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();

    const timer = setInterval(() => {
      if (controller.signal.aborted || document.visibilityState !== 'visible') return;
      listDevices(projectId!, controller.signal).then((items) => {
        if (!controller.signal.aborted) setDevices(items);
      }).catch(() => { /* silent */ });
    }, 2000);

    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [projectId, retryCount]);

  useEffect(() => {
    if (!projectId) { setWeather(null); return; }
    getWeatherData(projectId).then(setWeather).catch(() => {});
    weatherTimer.current = setInterval(
      () => getWeatherData(projectId).then(setWeather).catch(() => {}),
      30 * 60 * 1000,
    );
    return () => { if (weatherTimer.current) clearInterval(weatherTimer.current); };
  }, [projectId]);

  useEffect(() => {
    if (viewDay !== 'ieri' || !projectId) return;
    const now = Date.now();
    const y24 = now - 24 * 60 * 60 * 1000;
    const y48 = now - 48 * 60 * 60 * 1000;
    setYLoading(true);
    setYStats(null);
    getDeviceHistory(projectId, '3', 500)
      .then((data) => {
        const evs = (data.events ?? []).filter((e) => {
          const t = new Date(e.ts).getTime();
          return t >= y48 && t <= y24;
        });
        let tempMin: number | null = null, tempMax: number | null = null, luxMax: number | null = null;
        for (const ev of evs) {
          const p = ev.payload as Record<string, unknown>;
          const temp = (p['temperature'] ?? p['temp']) as number | undefined;
          const lux = (p['luminance'] ?? p['lux'] ?? p['illuminance']) as number | undefined;
          if (typeof temp === 'number' && !isNaN(temp)) {
            if (tempMin === null || temp < tempMin) tempMin = temp;
            if (tempMax === null || temp > tempMax) tempMax = temp;
          }
          if (typeof lux === 'number' && !isNaN(lux)) {
            if (luxMax === null || lux > luxMax) luxMax = lux;
          }
        }
        setYStats({ tempMin, tempMax, luxMax });
      })
      .catch(() => setYStats(null))
      .finally(() => setYLoading(false));
  }, [viewDay, projectId]);

  const effectiveProjectId = mounted ? projectId : undefined;
  const hubOnline = !error && !loading && devices !== null;
  const hasData = !loading && !error && devices !== null;

  const casa = useMemo(
    () => (devices ? computeHouseState(devices) : null),
    [devices],
  );
  const roomStates = useMemo(
    () => (devices && rooms ? computeRoomStates(devices, rooms) : []),
    [devices, rooms],
  );

  return (
    <>
      <TopBar title="Casa" />
      <main className="flex-1 space-y-5 px-4 py-5 xl:px-8">

        {/* Header — KPI strip */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-text-2">HomeMARIO</div>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-text">Casa</h1>
          </div>
          <div className="flex items-center gap-2">
            {devices && (
              <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5">
                <Smartphone className="h-3 w-3 text-text-2" />
                <span className="text-xs text-text-2">
                  {devices.filter(d => d.online).length}/{devices.length}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5">
              <span className={`h-2 w-2 rounded-full ${serviceDot(hubOnline)}`} />
              <span className="text-xs text-text">{hubOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>

        {/* Banner: nessun progetto */}
        {!effectiveProjectId && installerMode ? (
          <div className="flex items-start gap-3 rounded-[22px] border border-amber-500/25 bg-amber-500/10 p-5 text-amber-700">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <div className="font-medium">Seleziona un progetto.</div>
              <div className="mt-1 text-sm text-amber-700/70">
                I dispositivi non si caricano senza un progetto attivo.
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchInput.trim()) setProjectId(searchInput.trim());
                  }}
                  placeholder="Nome progetto..."
                  className="flex-1 rounded-xl border border-amber-500/30 bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-amber-700/50 focus:outline-none"
                />
                <button
                  onClick={() => { if (searchInput.trim()) setProjectId(searchInput.trim()); }}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/20 px-4 py-2 text-sm text-amber-700 active:bg-amber-500/30"
                >
                  Carica
                </button>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="rounded-[22px] border border-border bg-surface p-5 text-sm text-text-2">
            Caricamento...
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-[22px] border border-danger/25 bg-danger/10 p-4 text-danger">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span className="flex-1 text-sm">{error}</span>
            <button
              onClick={() => setRetryCount((c) => c + 1)}
              className="rounded-xl border border-danger/30 bg-danger/20 px-3 py-1.5 text-sm active:bg-danger/30"
            >
              Riprova
            </button>
          </div>
        ) : null}

        {hasData && casa && (
          <>
            {/* SEZIONE 1 — Hero Stato Casa */}
            <div className="rounded-[28px] border border-border bg-surface p-6">
              <div className="mb-5 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-text-2">
                  Stato Casa
                </div>
                <div className="flex items-center rounded-full border border-border bg-surface-2 p-0.5">
                  {(['oggi', 'ieri'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setViewDay(d)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        viewDay === d
                          ? 'bg-primary/20 text-primary'
                          : 'text-text-2'
                      }`}
                    >
                      {d === 'oggi' ? 'Oggi' : 'Ieri'}
                    </button>
                  ))}
                </div>
              </div>

              {viewDay === 'ieri' && (
                yLoading ? (
                  <div className="text-xs text-text-2 py-4 text-center">Caricamento dati ieri…</div>
                ) : yStats ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-sky-500">
                        <Thermometer className="h-5 w-5" />
                        <span className="text-2xl font-semibold text-text">
                          {yStats.tempMin !== null && yStats.tempMax !== null
                            ? `${yStats.tempMin.toFixed(1)}–${yStats.tempMax.toFixed(1)}°`
                            : '—'}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-text-2">Temp ieri (min–max)</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-amber-500">
                        <Sun className="h-5 w-5" />
                        <span className="text-2xl font-semibold text-text">
                          {yStats.luxMax !== null ? `${Math.round(yStats.luxMax)}` : '—'}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-text-2">Lux max ieri</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-text-2 py-4 text-center">
                    Nessun dato storico disponibile per ieri.
                  </div>
                )
              )}

              {viewDay === 'oggi' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sky-500">
                      <Thermometer className="h-5 w-5" />
                      <span className="text-2xl font-semibold text-text">
                        {casa.temperature !== null ? `${casa.temperature.toFixed(1)}°` : '—'}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-text-2">Temperatura</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-amber-500">
                      <Sun className="h-5 w-5" />
                      <span className="text-2xl font-semibold text-text">
                        {casa.lux !== null ? `${Math.round(casa.lux)}` : '—'}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-text-2">
                      {casa.lux !== null ? 'lux' : 'Luminosità'}
                    </div>
                  </div>
                  <div>
                    <div className={`flex items-center gap-2 ${casa.motionActive ? 'text-orange-500' : 'text-text-2'}`}>
                      <Eye className="h-5 w-5" />
                      <span className={`text-lg font-semibold ${casa.motionActive ? 'text-orange-600' : 'text-text-2'}`}>
                        {casa.motionActive ? 'Rilevato' : 'Assente'}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-text-2">Movimento</div>
                  </div>
                  <div className="col-span-2">
                    <div className={`flex items-center gap-2 ${casa.batteryWarnings > 0 ? 'text-danger' : 'text-success'}`}>
                      <Battery className="h-5 w-5" />
                      <span className={`text-lg font-semibold ${casa.batteryWarnings > 0 ? 'text-danger' : 'text-text-2'}`}>
                        {casa.batteryWarnings > 0 ? `${casa.batteryWarnings} basse` : 'OK'}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-text-2">Batterie</div>
                    {casa.batteryWarnings > 0 && (
                      <ul className="mt-2 space-y-1">
                        {casa.alerts
                          .filter(a => a.type === 'battery_low' || a.type === 'battery_critical')
                          .map(a => (
                            <li key={a.deviceId} className={`text-xs leading-snug ${a.type === 'battery_critical' ? 'text-danger font-medium' : 'text-danger/80'}`}>
                              • {a.label}
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Banner meteo ── */}
            {weather && <WeatherBanner weather={weather} />}

            {/* ── Notifiche — sempre visibili in cima ── */}
            {projectId && (
              <NotificationCenter
                projectId={projectId}
                audience={installerMode ? 'installer' : 'client'}
              />
            )}
            {projectId && <PushEnableBanner projectId={projectId} />}

            {/* Widget Meteo */}
            {weather && (
              <div className="rounded-[24px] border border-sky-500/20 bg-sky-500/[0.04] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-500/80">
                    {weather.city ?? 'Meteo'}
                  </div>
                  <span className="text-[10px] text-text-2">Open-Meteo</span>
                </div>
                <div className="flex items-end gap-4">
                  <div>
                    <div className="text-3xl font-semibold text-text">
                      {weather.temperature !== null ? `${Math.round(weather.temperature)}°` : '—'}
                    </div>
                    {weather.condition && (
                      <div className="mt-0.5 text-xs text-text-2">{weather.condition}</div>
                    )}
                  </div>
                  <div className="flex-1 space-y-0.5 text-xs text-text-2">
                    {weather.feels_like !== null && (
                      <div>Percepita {Math.round(weather.feels_like)}°</div>
                    )}
                    {weather.temp_max !== null && weather.temp_min !== null && (
                      <div>↑{Math.round(weather.temp_max)}° ↓{Math.round(weather.temp_min)}°</div>
                    )}
                    {weather.rain_prob_day !== null && (
                      <div>Pioggia {weather.rain_prob_day}%</div>
                    )}
                    {weather.humidity !== null && (
                      <div>Umidità {weather.humidity}%</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Brain NL Command Bar */}
            {projectId && (
              <NLCommandBar projectId={projectId} devices={devices ?? []} />
            )}

            {/* Dispositivi offline */}
            {(() => {
              const offline = (devices ?? []).filter((d) => !d.online);
              if (offline.length === 0) return null;
              return (
                <div className="rounded-[24px] border border-danger/20 bg-danger/[0.05] p-4">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-danger/80">
                    Offline ({offline.length})
                  </div>
                  <div className="space-y-2">
                    {offline.slice(0, 4).map((d) => (
                      <div key={d.id} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-danger shrink-0" />
                        <span className="flex-1 text-sm text-text-2 truncate">{d.name}</span>
                      </div>
                    ))}
                    {offline.length > 4 && (
                      <Link href="/devices" className="text-xs text-text-2">
                        +{offline.length - 4} altri →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Dispositivi accesi ora */}
            {(() => {
              // switch_relay: i relè (Luce Cucina, Dispositivo Corridoio) — fino al 21/10/2026 mancavano, e un relè acceso non compariva qui.
              const ACTIVE_TYPES = new Set(['light', 'rgb_light', 'switch', 'switch_relay', 'plug', 'ev_charger']);
              const active = (devices ?? []).filter(
                (d) => ACTIVE_TYPES.has(d.type) && (d.state as Record<string, unknown>)?.on === true,
              );
              if (active.length === 0) return null;
              return (
                <div className="rounded-[24px] border border-success/20 bg-success/[0.05] p-4">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-success/80">
                    Accesi ora ({active.length})
                  </div>
                  <div className="space-y-2">
                    {active.slice(0, 5).map((d) => (
                      <div key={d.id} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />
                        <span className="flex-1 text-sm text-text truncate">{d.name}</span>
                      </div>
                    ))}
                    {active.length > 5 && (
                      <Link href="/devices" className="text-xs text-text-2">
                        +{active.length - 5} altri →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Stanze */}
            {roomStates.length > 0 && (
              <SectionCard
                title="Stanze"
                action={
                  <Link href="/rooms" className="text-xs text-text-2 active:text-text">
                    Gestisci →
                  </Link>
                }
              >
                <div className="grid grid-cols-2 gap-3">
                  {roomStates.map(({ room, temperature, lux, motionActive, lightsOn, lightsTotal }) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      temperature={temperature}
                      lux={lux}
                      motionActive={motionActive}
                      lightsOn={lightsOn}
                      lightsTotal={lightsTotal}
                    />
                  ))}
                </div>
              </SectionCard>
            )}

          </>
        )}

        {/* Azioni rapide */}
        <div className="grid grid-cols-2 gap-3 pb-4">
          <Link
            href="/security"
            className="flex flex-col gap-2 rounded-[22px] border border-border bg-surface px-4 py-5 active:bg-surface-2"
          >
            <Shield className="h-6 w-6 text-text-2" />
            <div className="font-medium text-text">Sicurezza</div>
            <div className="text-xs text-text-2">Stato e allarmi</div>
          </Link>
          {installerMode && (
            <>
              <Link
                href="/onboarding"
                className="flex flex-col gap-2 rounded-[22px] border border-primary/25 bg-primary/10 px-4 py-5 active:bg-primary/20"
              >
                <PlusCircle className="h-6 w-6 text-primary" />
                <div className="font-medium text-text">Aggiungi</div>
                <div className="text-xs text-text-2">Nuovo dispositivo</div>
              </Link>
              <Link
                href="/devices"
                className="flex flex-col gap-2 rounded-[22px] border border-border bg-surface px-4 py-5 active:bg-surface-2"
              >
                <Smartphone className="h-6 w-6 text-text-2" />
                <div className="font-medium text-text">Dispositivi</div>
                <div className="text-xs text-text-2">{devices?.length ?? 0} totali</div>
              </Link>
            </>
          )}
        </div>

      </main>
    </>
  );
}
