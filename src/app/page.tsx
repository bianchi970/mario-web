'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  Cpu,
  Lightbulb,
  Plug,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Workflow,
  Zap,
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { useProjectId } from '@/hooks/useProjectId';
import { useProject } from '@/context/ProjectContext';
import { ApiClientError, fetchAPI } from '@/lib/api/client';
import { listDevices } from '@/lib/api/devices';
import { listRooms } from '@/lib/api/rooms';
import { listScenarios, listScenarioAudit, setScenarioEnabled } from '@/lib/api/scenarios';
import type { ScenarioRecord, ScenarioAuditItem } from '@/lib/api/scenarios';
import type { Device, Room, SystemInfo } from '@/lib/hub-types';

type SystemPayload = { success?: boolean; data?: SystemInfo } | SystemInfo;

function unwrapSystem(payload: SystemPayload): SystemInfo {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: SystemInfo }).data;
  }
  return payload as SystemInfo;
}

function serviceDot(ok: boolean) {
  return ok
    ? 'bg-emerald-400 shadow shadow-emerald-500/40'
    : 'bg-red-400 shadow shadow-red-500/40';
}

function DeviceGlyph({ type }: { type: string }) {
  if (type === 'light') return <Lightbulb className="h-5 w-5" />;
  if (type === 'plug' || type === 'switch') return <Plug className="h-5 w-5" />;
  if (type === 'cover') return <Workflow className="h-5 w-5" />;
  if (type === 'lock') return <ShieldCheck className="h-5 w-5" />;
  return <Cpu className="h-5 w-5" />;
}

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
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
          {subtitle ? <div className="mt-1 text-sm text-white/55">{subtitle}</div> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatCard({
  title,
  value,
  note,
  tone,
}: {
  title: string;
  value: string | number;
  note: string;
  tone: 'blue' | 'green' | 'violet' | 'amber';
}) {
  const toneClass =
    tone === 'blue'
      ? 'text-sky-300'
      : tone === 'green'
        ? 'text-emerald-300'
        : tone === 'violet'
          ? 'text-violet-300'
          : 'text-amber-300';

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur-sm">
      <div className="text-sm text-white/60">{title}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</div>
      <div className={`mt-2 text-sm ${toneClass}`}>{note}</div>
    </div>
  );
}

export default function DashboardPage() {
  const projectId = useProjectId();
  const { setProjectId } = useProject();
  const [mounted, setMounted] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [system, setSystem] = useState<SystemInfo | null>(null);
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
      setSystem(null);
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
        const [systemPayload, deviceItems, roomItems] = await Promise.all([
          fetchAPI<SystemPayload>('/api/hub/system', { signal: controller.signal }),
          listDevices(projectId!, controller.signal),
          listRooms(projectId!, controller.signal),
        ]);

        if (controller.signal.aborted) return;
        setSystem(unwrapSystem(systemPayload));
        setDevices(deviceItems);
        setRooms(roomItems);

        // Brain data — isolato, non blocca Hub se non disponibile
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
        setSystem(null);
        setDevices(null);
        setRooms(null);
        setScenarios(null);
        setBrainOnline(false);
        if (err instanceof ApiClientError && (err.status === 500 || err.status === 502)) {
          setError('Hub non disponibile');
        } else {
          setError('Errore caricamento dashboard');
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
      // silent — stato rimane invariato
    } finally {
      setTogglingScenario(null);
    }
  }

  const effectiveProjectId = mounted ? projectId : undefined;
  const hubOnline = !error && !loading && system !== null;
  const onlineCount = devices?.filter((d) => d.online).length ?? 0;
  const enabledScenarios = scenarios?.filter((s) => s.enabled).length ?? 0;
  const hasData = !loading && !error && devices !== null;

  return (
    <>
      <TopBar title="Dashboard" />
      <main className="flex-1 space-y-6 px-5 py-6 text-white xl:px-8">

        {/* Header con status servizi */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-blue-300/80">MARIO Web</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
              {effectiveProjectId ?? 'Nessun progetto selezionato'}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {(
              [
                ['Hub', hubOnline],
                ['Brain', brainOnline],
                ['Web', true],
              ] as [string, boolean][]
            ).map(([name, ok]) => (
              <div
                key={name}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2"
              >
                <span className={`h-2.5 w-2.5 rounded-full ${serviceDot(ok)}`} />
                <span className="text-sm text-white/85">{name}</span>
                <span className={`text-xs ${ok ? 'text-emerald-300' : 'text-red-300'}`}>
                  {ok ? 'online' : 'offline'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Banner: nessun progetto */}
        {!effectiveProjectId ? (
          <div className="flex items-start gap-3 rounded-[24px] border border-amber-500/25 bg-amber-500/10 p-5 text-amber-100">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <div className="font-medium">Seleziona un progetto.</div>
              <div className="mt-1 text-sm text-amber-100/80">
                Dispositivi e scenari non si caricano senza un progetto.
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
                  className="flex-1 rounded-xl border border-amber-500/30 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-amber-100/50 focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (searchInput.trim()) setProjectId(searchInput.trim());
                  }}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/20 px-4 py-2 text-sm text-amber-100 hover:bg-amber-500/30"
                >
                  Carica
                </button>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 text-sm text-white/60">
            Caricamento sistema...
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-[24px] border border-red-500/25 bg-red-500/10 p-5 text-red-100">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span className="flex-1 text-sm">{error}</span>
            <button
              onClick={() => setRetryCount((c) => c + 1)}
              className="rounded-xl border border-red-500/30 bg-red-500/20 px-3 py-1.5 text-sm hover:bg-red-500/30"
            >
              Riprova
            </button>
          </div>
        ) : null}

        {/* Statistiche */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Dispositivi"
            value={devices?.length ?? '—'}
            note={`${onlineCount} online`}
            tone="blue"
          />
          <StatCard
            title="Uscite attive"
            value={devices?.filter((d) => d.online).length ?? '—'}
            note="stato runtime Hub"
            tone="green"
          />
          <StatCard
            title="Scenari abilitati"
            value={enabledScenarios}
            note={`${scenarios?.length ?? 0} totali`}
            tone="violet"
          />
          <StatCard
            title="Adattatori"
            value={system?.active_adapters ?? '—'}
            note={
              system
                ? `${Math.floor((system.uptime_s ?? 0) / 60)}m uptime`
                : 'Hub offline'
            }
            tone="amber"
          />
        </div>

        {/* Griglia principale */}
        {hasData && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">

            {/* Colonna sinistra (8/12) */}
            <div className="space-y-6 xl:col-span-8">

              {/* Dispositivi */}
              <SectionCard
                title="Dispositivi"
                subtitle="Stato online/offline del progetto attivo"
                action={
                  <Link
                    href="/devices"
                    className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-sm text-blue-300 hover:bg-blue-500/20"
                  >
                    Apri pagina
                  </Link>
                }
              >
                <div className="space-y-3">
                  {devices && devices.length > 0 ? (
                    devices.slice(0, 6).map((device) => (
                      <div
                        key={device.id}
                        className="flex items-center justify-between rounded-[22px] border border-white/8 bg-black/10 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-white/80">
                            <DeviceGlyph type={device.type ?? ''} />
                          </div>
                          <div>
                            <div className="font-medium text-white">{device.name}</div>
                            <div className="text-sm text-white/50">{device.protocol}</div>
                          </div>
                        </div>
                        <span
                          className={`text-sm ${device.online ? 'text-emerald-300' : 'text-red-300'}`}
                        >
                          {device.online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="py-2 text-sm text-white/50">Nessun dispositivo trovato</p>
                  )}
                  {devices && devices.length > 6 && (
                    <Link
                      href="/devices"
                      className="block pt-1 text-center text-sm text-blue-300 hover:underline"
                    >
                      +{devices.length - 6} altri →
                    </Link>
                  )}
                </div>
              </SectionCard>

              {/* Scenari */}
              <SectionCard
                title="Scenari"
                subtitle="Lista scenari del progetto — abilita o disabilita"
                action={
                  <Link
                    href="/scenarios"
                    className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-sm text-blue-300 hover:bg-blue-500/20"
                  >
                    Apri pagina
                  </Link>
                }
              >
                <div className="space-y-3">
                  {scenarios && scenarios.length > 0 ? (
                    scenarios.slice(0, 5).map((scenario) => (
                      <div
                        key={scenario.id}
                        className="flex items-center justify-between rounded-[22px] border border-white/8 bg-black/10 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-white/80">
                            <Zap className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium text-white">{scenario.name}</div>
                            <div className="text-sm text-white/50">
                              {String(
                                (scenario.trigger as { cron?: string })?.cron ?? 'Manuale',
                              )}
                            </div>
                          </div>
                        </div>
                        <ScenarioSwitch
                          checked={scenario.enabled}
                          onClick={() =>
                            void handleToggleScenario(scenario.id, !scenario.enabled)
                          }
                          disabled={togglingScenario === scenario.id}
                        />
                      </div>
                    ))
                  ) : (
                    <p className="py-2 text-sm text-white/50">
                      {scenarios === null ? 'Brain non raggiungibile' : 'Nessuno scenario'}
                    </p>
                  )}
                </div>
              </SectionCard>

              {/* Attività recenti */}
              <SectionCard
                title="Attività recenti"
                subtitle="Esecuzioni scenari e audit Brain"
              >
                <div className="space-y-3">
                  {auditItems.length > 0 ? (
                    auditItems.slice(0, 6).map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-[22px] border border-white/8 bg-black/10 px-4 py-3"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 shrink-0 text-sm text-white/50">
                            {item.executed_at
                              ? new Date(item.executed_at).toLocaleTimeString('it-IT', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </div>
                          <div className="text-white">{item.scenario_name}</div>
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs ${
                            item.status === 'executed'
                              ? 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300'
                              : 'border-red-500/20 bg-red-500/15 text-red-300'
                          }`}
                        >
                          {item.status === 'executed' ? 'OK' : 'Errore'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="py-2 text-sm text-white/50">Nessuna attività recente</p>
                  )}
                </div>
              </SectionCard>
            </div>

            {/* Colonna destra (4/12) */}
            <div className="space-y-6 xl:col-span-4">

              {/* Progetto attivo */}
              <SectionCard
                title="Progetto attivo"
                subtitle="Fonte unica di contesto per dispositivi e scenari"
              >
                <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(59,130,246,0.16),rgba(15,23,42,0.15))] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xl font-semibold text-white">{projectId}</div>
                      {system && (
                        <div className="mt-1 text-sm text-white/55">
                          {system.hostname} · {system.platform}
                        </div>
                      )}
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-300">
                      attivo
                    </span>
                  </div>
                  {system && (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/50">
                      <div>
                        Memoria:{' '}
                        <span className="text-white/80">{system.memory_mb} MB</span>
                      </div>
                      <div>
                        Adattatori:{' '}
                        <span className="text-white/80">{system.active_adapters}</span>
                      </div>
                    </div>
                  )}
                  <Link
                    href="/settings"
                    className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-500"
                  >
                    Vai alle impostazioni
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </SectionCard>

              {/* Zone */}
              <SectionCard
                title="Zone"
                subtitle={`${rooms?.length ?? 0} configurate nel progetto`}
              >
                <div className="space-y-2">
                  {rooms && rooms.length > 0 ? (
                    rooms.slice(0, 5).map((room) => (
                      <div
                        key={room.id}
                        className="flex items-center justify-between rounded-[18px] border border-white/8 bg-black/10 px-4 py-3"
                      >
                        <span className="text-sm text-white">{room.name}</span>
                        {room.floor && (
                          <span className="text-xs text-white/40">Piano {room.floor}</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="py-2 text-sm text-white/50">Nessuna zona</p>
                  )}
                  {rooms && rooms.length > 5 && (
                    <Link
                      href="/rooms"
                      className="block pt-1 text-center text-sm text-blue-300 hover:underline"
                    >
                      +{rooms.length - 5} altre →
                    </Link>
                  )}
                </div>
              </SectionCard>

              {/* Azioni rapide */}
              <SectionCard title="Azioni rapide">
                <div className="grid grid-cols-1 gap-3">
                  <Link
                    href="/devices"
                    className="rounded-[22px] border border-sky-500/20 bg-sky-500/10 px-4 py-4 text-sky-300 transition-colors hover:bg-sky-500/20"
                  >
                    <Smartphone className="mb-2 h-5 w-5" />
                    <div className="font-medium">Dispositivi</div>
                    <div className="mt-0.5 text-xs text-sky-300/60">
                      {devices?.length ?? 0} totali, {onlineCount} online
                    </div>
                  </Link>
                  <Link
                    href="/scenarios"
                    className="rounded-[22px] border border-violet-500/20 bg-violet-500/10 px-4 py-4 text-violet-300 transition-colors hover:bg-violet-500/20"
                  >
                    <Zap className="mb-2 h-5 w-5" />
                    <div className="font-medium">Scenari</div>
                    <div className="mt-0.5 text-xs text-violet-300/60">
                      {enabledScenarios} attivi
                    </div>
                  </Link>
                  <Link
                    href="/settings"
                    className="rounded-[22px] border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-amber-300 transition-colors hover:bg-amber-500/20"
                  >
                    <Settings className="mb-2 h-5 w-5" />
                    <div className="font-medium">Impostazioni</div>
                    <div className="mt-0.5 text-xs text-amber-300/60">
                      Progetto e configurazione
                    </div>
                  </Link>
                </div>
              </SectionCard>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
