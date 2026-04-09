import TopBar from '@/components/layout/TopBar';
import StatsRow from '@/components/dashboard/StatsRow';
import EventFeed from '@/components/dashboard/EventFeed';
import Badge from '@/components/ui/Badge';
import { getSystem, getDevices, getRooms, getEvents, getDefaultProjectId } from '@/lib/hub-client';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const projectId = getDefaultProjectId();

  const [system, devicesRes, roomsRes, eventsRes] = await Promise.allSettled([
    getSystem(),
    getDevices(projectId),
    getRooms(projectId),
    getEvents(projectId, 20),
  ]);

  const sys     = system.status     === 'fulfilled' ? system.value     : null;
  const devices = devicesRes.status === 'fulfilled' ? devicesRes.value.devices : null;
  const rooms   = roomsRes.status   === 'fulfilled' ? roomsRes.value.rooms     : null;
  const events  = eventsRes.status  === 'fulfilled' ? eventsRes.value.events   : [];

  const onlineCount = devices?.filter((d) => d.online).length ?? null;
  const hubOffline = !sys && !devices && !rooms && eventsRes.status !== 'fulfilled';

  return (
    <>
      <TopBar title="Dashboard" />
      <main className="flex-1 p-5 space-y-6">
        {hubOffline && (
          <div className="card">
            <div className="mb-3 flex justify-start">
              <Badge variant="red">Offline</Badge>
            </div>
            <p className="text-sm text-hub-text">Hub not reachable.</p>
            <p className="mt-1 text-xs text-hub-muted">Offline</p>
          </div>
        )}

        {/* Stats */}
        <StatsRow
          totalDevices={devices?.length ?? null}
          onlineDevices={onlineCount}
          totalRooms={rooms?.length ?? null}
          activeAdapters={sys?.active_adapters ?? null}
          uptime={sys?.uptime_s}
        />

        {/* System info */}
        {sys && (
          <div className="card">
            <h2 className="text-sm font-medium text-hub-text mb-3">Hub System</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { k: 'Hostname', v: sys.hostname },
                { k: 'Platform', v: `${sys.platform} / ${sys.arch}` },
                { k: 'Memory',   v: `${sys.memory_mb} MB` },
                { k: 'Project',  v: sys.default_project_id },
              ].map(({ k, v }) => (
                <div key={k}>
                  <span className="text-hub-muted block">{k}</span>
                  <span className="text-hub-text font-mono">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Devices quick list */}
        {devices && devices.length > 0 && (
          <div className="card">
            <h2 className="text-sm font-medium text-hub-text mb-3">
              Devices <span className="text-hub-muted text-xs">({devices.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {devices.slice(0, 9).map((d) => (
                <div key={d.id} className="flex items-center gap-2 p-2 rounded-lg bg-hub-bg border border-hub-border/50 text-xs">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${d.online ? 'bg-hub-green' : 'bg-hub-red'}`} />
                  <span className="flex-1 truncate text-hub-text">{d.name}</span>
                  {!d.online && <Badge variant="red">Offline</Badge>}
                  <span className="text-hub-muted font-mono">{d.protocol}</span>
                </div>
              ))}
              {devices.length > 9 && (
                <div className="flex items-center justify-center p-2 rounded-lg border border-hub-border/50 border-dashed text-hub-muted text-xs">
                  +{devices.length - 9} more
                </div>
              )}
            </div>
          </div>
        )}
        {devices === null && (
          <div className="card">
            <div className="mb-3 flex justify-start">
              <Badge variant="red">Offline</Badge>
            </div>
            <p className="text-sm text-hub-text">Device inventory not reachable.</p>
            <p className="mt-1 text-xs text-hub-muted">Offline</p>
          </div>
        )}

        {/* Event feed */}
        <EventFeed
          projectId={projectId}
          initialEvents={events}
          initialUnavailable={eventsRes.status !== 'fulfilled'}
        />
      </main>
    </>
  );
}
