'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Battery,
  Eye,
  PlusCircle,
  Settings,
  Shield,
  ShieldAlert,
  Smartphone,
  Sun,
  Thermometer,
  Zap,
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { useProjectId } from '@/hooks/useProjectId';
import { useProject } from '@/context/ProjectContext';
import { ApiClientError } from '@/lib/api/client';
import { listDevices } from '@/lib/api/devices';
import { listRooms } from '@/lib/api/rooms';
import { listScenarios, listScenarioAudit, setScenarioEnabled } from '@/lib/api/scenarios';
import type { ScenarioRecord, ScenarioAuditItem } from '@/lib/api/scenarios';
import type { Device, Room } from '@/lib/hub-types';
import { computeHouseState, computeRoomStates } from '@/lib/house-state';
import type { Alert } from '@/lib/house-state';

/* ─── helpers ─────────────────────────────────────────── */

function serviceDot(ok: boolean) {
  return ok
    ? 'bg-emerald-400 shadow shadow-emerald-500/40'
    : 'bg-red-400 shadow shadow-red-500/40';
}

/* ─── componenti ──────────────────────────────────────── */

function ScenarioSwitch({
  checked,
  onClick,
  disabled = false,
}: {
  checked: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
        checked ? 'border-blue-400/60 bg-blue-500/80' : 'border-white/10 bg-white/10'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

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
    <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/60">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  const critical = alert.type === 'tamper' || alert.type === 'gas' || alert.type === 'battery_critical';
  return (
    <div
      className={`flex items-center gap-3 rounded-[18px] border px-4 py-3 text-sm ${
        critical
          ? 'border-red-500/30 bg-red-500/10 text-red-200'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
      }`}
    >
      <AlertTriangle className={`h-4 w-4 shrink-0 ${critical ? 'text-red-400' : 'text-amber-400'}`} />
      <span>{alert.label}</span>
    </div>
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
  return (
    <div className="rounded-[22px] border border-white/8 bg-black/15 p-4">
      <div className="mb-3 font-medium text-white">{room.name}</div>
      {hasData ? (
        <div className="space-y-1.5 text-sm text-white/70">
          {temperature !== null && (
            <div className="flex items-center gap-2">
              <Thermometer className="h-3.5 w-3.5 text-sky-400 shrink-0" />
              <span>{temperature.toFixed(1)}°</span>
            </div>
          )}
          {lux !== null && (
            <div className="flex items-center gap-2">
              <Sun className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>{Math.round(lux)} lux</span>
            </div>
          )}
          {motionActive && (
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-orange-400 shrink-0" />
              <span className="text-orange-300">Movimento</span>
            </div>
          )}
          {lightsTotal > 0 && (
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-violet-400 shrink-0" />
              <span>{lightsOn}/{lightsTotal} luci</span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-white/30">Nessun sensore</div>
      )}
    </div>
  );
}

/* ─── pagina principale ───────────────────────────────── */

export default function DashboardPage() {
  const projectId = useProjectId();
  const { setProjectId } = useProject();
  const [mounted, setMounted] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioRecord[] | null>(null);
  const [auditItems, setAuditItems] = useState<ScenarioAuditItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brainOnline, setBrainOnline] = useState(false);
  const [togglingScenario, setTogglingScenario] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!projectId) {
      setDevices(null);
      setRooms(null);
      setScenarios(null);
      setAuditItems([]);
      setError(null);
      setLoading(false);
      setBrainOnline(false);
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

        try {
          const [scenarioItems, auditData] = await Promise.all([
            listScenarios(projectId!),
            listScenarioAudit(projectId!),
          ]);
          if (!controller.signal.aborted) {
            setScenarios(scenarioItems ?? []);
            setAuditItems(auditData ?? []);
            setBrainOnline(true);
          }
        } catch {
          // Brain non disponibile — Hub rimane visibile
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setDevices(null);
        setRooms(null);
        setScenarios(null);
        setBrainOnline(false);
        if (err instanceof ApiClientError && (err.status === 500 || err.status === 502)) {
          setError('Hub non disponibile');
        } else {
          setError('Errore caricamento');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [projectId, retryCount]);

  async function handleToggleScenario(scenarioId: string, enabled: boolean) {
    if (!projectId) return;
    setTogglingScenario(scenarioId);
    try {
      await setScenarioEnabled(scenarioId, enabled, projectId);
      setScenarios((prev) =>
        prev ? prev.map((s) => (s.id === scenarioId ? { ...s, enabled } : s)) : prev,
      );
    } catch {
      // silent
    } finally {
      setTogglingScenario(null);
    }
  }

  const effectiveProjectId = mounted ? projectId : undefined;
  const hubOnline = !error && !loading && devices !== null;
  const hasData = !loading && !error && devices !== null;
  const enabledScenarios = scenarios?.filter((s) => s.enabled).length ?? 0;

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
      <main className="flex-1 space-y-5 px-4 py-5 text-white xl:px-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/40">MARIO</div>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-white">
              {effectiveProjectId ?? 'Nessun progetto'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {(
              [
                ['Hub', hubOnline],
                ['Brain', brainOnline],
              ] as [string, boolean][]
            ).map(([name, ok]) => (
              <div
                key={name}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
              >
                <span className={`h-2 w-2 rounded-full ${serviceDot(ok)}`} />
                <span className="text-xs text-white/70">{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Banner: nessun progetto */}
        {!effectiveProjectId ? (
          <div className="flex items-start gap-3 rounded-[22px] border border-amber-500/25 bg-amber-500/10 p-5 text-amber-100">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <div className="font-medium">Seleziona un progetto.</div>
              <div className="mt-1 text-sm text-amber-100/70">
                Dispositivi e scenari non si caricano senza un progetto attivo.
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
                  className="flex-1 rounded-xl border border-amber-500/30 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-amber-100/40 focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (searchInput.trim()) setProjectId(searchInput.trim());
                  }}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/20 px-4 py-2 text-sm text-amber-100 active:bg-amber-500/30"
                >
                  Carica
                </button>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="rounded-[22px] border border-white/10 bg-white/5 p-5 text-sm text-white/50">
            Caricamento...
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-[22px] border border-red-500/25 bg-red-500/10 p-4 text-red-100">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span className="flex-1 text-sm">{error}</span>
            <button
              onClick={() => setRetryCount((c) => c + 1)}
              className="rounded-xl border border-red-500/30 bg-red-500/20 px-3 py-1.5 text-sm active:bg-red-500/30"
            >
              Riprova
            </button>
          </div>
        ) : null}

        {hasData && casa && (
          <>
            {/* SEZIONE 1 — Hero Stato Casa */}
            <div className="rounded-[28px] border border-white/12 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-6 backdrop-blur-sm">
              <div className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                Stato Casa
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Temperatura */}
                <div>
                  <div className="flex items-center gap-2 text-sky-300">
                    <Thermometer className="h-5 w-5" />
                    <span className="text-2xl font-semibold text-white">
                      {casa.temperature !== null ? `${casa.temperature.toFixed(1)}°` : '—'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-white/40">Temperatura</div>
                </div>

                {/* Luminosità */}
                <div>
                  <div className="flex items-center gap-2 text-amber-300">
                    <Sun className="h-5 w-5" />
                    <span className="text-2xl font-semibold text-white">
                      {casa.lux !== null ? `${Math.round(casa.lux)}` : '—'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-white/40">
                    {casa.lux !== null ? 'lux' : 'Luminosità'}
                  </div>
                </div>

                {/* Movimento */}
                <div>
                  <div className={`flex items-center gap-2 ${casa.motionActive ? 'text-orange-300' : 'text-white/40'}`}>
                    <Eye className="h-5 w-5" />
                    <span className={`text-lg font-semibold ${casa.motionActive ? 'text-orange-200' : 'text-white/60'}`}>
                      {casa.motionActive ? 'Rilevato' : 'Assente'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-white/40">Movimento</div>
                </div>

                {/* Batterie */}
                <div>
                  <div className={`flex items-center gap-2 ${casa.batteryWarnings > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                    <Battery className="h-5 w-5" />
                    <span className={`text-lg font-semibold ${casa.batteryWarnings > 0 ? 'text-red-200' : 'text-white/60'}`}>
                      {casa.batteryWarnings > 0 ? `${casa.batteryWarnings} basse` : 'OK'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-white/40">Batterie</div>
                </div>
              </div>
            </div>

            {/* SEZIONE 3 — Alert critici */}
            {casa.alerts.length > 0 && (
              <div className="space-y-2">
                <div className="px-1 text-xs font-semibold uppercase tracking-[0.15em] text-red-400/80">
                  Alert
                </div>
                {casa.alerts.map((alert, i) => (
                  <AlertRow key={i} alert={alert} />
                ))}
              </div>
            )}

            {/* SEZIONE 2 — Stanze */}
            {roomStates.length > 0 && (
              <SectionCard
                title="Stanze"
                action={
                  <Link
                    href="/rooms"
                    className="text-xs text-white/40 active:text-white/70"
                  >
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

            {/* Scenari */}
            {scenarios !== null && (
              <SectionCard
                title="Scenari"
                action={
                  <Link href="/scenarios" className="text-xs text-white/40 active:text-white/70">
                    Tutti →
                  </Link>
                }
              >
                <div className="space-y-2">
                  {scenarios.length > 0 ? (
                    scenarios.slice(0, 5).map((scenario) => (
                      <div
                        key={scenario.id}
                        className="flex items-center justify-between rounded-[18px] border border-white/8 bg-black/10 px-4 py-3"
                      >
                        <div>
                          <div className="font-medium text-white">{scenario.name}</div>
                          <div className="mt-0.5 text-xs text-white/40">
                            {String((scenario.trigger as { cron?: string })?.cron ?? 'Manuale')}
                          </div>
                        </div>
                        <ScenarioSwitch
                          checked={scenario.enabled}
                          onClick={() => void handleToggleScenario(scenario.id, !scenario.enabled)}
                          disabled={togglingScenario === scenario.id}
                        />
                      </div>
                    ))
                  ) : (
                    <p className="py-2 text-sm text-white/40">Nessuno scenario</p>
                  )}
                </div>
              </SectionCard>
            )}
          </>
        )}

        {/* SEZIONE 4 — Azioni rapide (sempre visibili) */}
        <div className="grid grid-cols-2 gap-3 pb-4">
          <Link
            href="/onboarding"
            className="flex flex-col gap-2 rounded-[22px] border border-blue-500/25 bg-blue-500/10 px-4 py-5 active:bg-blue-500/20"
          >
            <PlusCircle className="h-6 w-6 text-blue-400" />
            <div className="font-medium text-white">Aggiungi</div>
            <div className="text-xs text-white/40">Nuovo dispositivo</div>
          </Link>
          <Link
            href="/settings"
            className="flex flex-col gap-2 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-5 active:bg-white/[0.07]"
          >
            <Shield className="h-6 w-6 text-white/50" />
            <div className="font-medium text-white">Sicurezza</div>
            <div className="text-xs text-white/40">Stato e allarmi</div>
          </Link>
          <Link
            href="/scenarios"
            className="flex flex-col gap-2 rounded-[22px] border border-violet-500/25 bg-violet-500/10 px-4 py-5 active:bg-violet-500/20"
          >
            <Zap className="h-6 w-6 text-violet-400" />
            <div className="font-medium text-white">Scenari</div>
            <div className="text-xs text-white/40">{enabledScenarios} attivi</div>
          </Link>
          <Link
            href="/devices"
            className="flex flex-col gap-2 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-5 active:bg-white/[0.07]"
          >
            <Smartphone className="h-6 w-6 text-white/50" />
            <div className="font-medium text-white">Dispositivi</div>
            <div className="text-xs text-white/40">{devices?.length ?? 0} totali</div>
          </Link>
        </div>

      </main>
    </>
  );
}
