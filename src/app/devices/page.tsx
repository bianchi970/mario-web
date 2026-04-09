import TopBar from '@/components/layout/TopBar';
import Badge from '@/components/ui/Badge';
import DeviceList from '@/components/devices/DeviceList';
import { getDevices, getDefaultProjectId } from '@/lib/hub-client';
import type { Device } from '@/lib/hub-types';

export const dynamic = 'force-dynamic';

export default async function DevicesPage() {
  const projectId = getDefaultProjectId();
  let devices: Device[] = [];
  let hubOffline = false;

  try {
    const res = await getDevices(projectId);
    devices = res.devices;
  } catch {
    hubOffline = true;
  }

  return (
    <>
      <TopBar title="Devices" />
      <main className="flex-1 p-5">
        {hubOffline ? (
          <div className="card py-16 text-center text-hub-muted">
            <div className="mb-3 flex justify-center">
              <Badge variant="red">Offline</Badge>
            </div>
            <p className="text-sm text-hub-text">Hub not reachable.</p>
            <p className="mt-1 text-xs">Offline</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="card text-center py-16 text-hub-muted">
            <p className="text-4xl mb-3">◈</p>
            <p className="text-sm">No devices found.</p>
            <p className="text-xs mt-1">Make sure mario-hub is running and devices are discovered.</p>
          </div>
        ) : (
          <DeviceList devices={devices} projectId={projectId} />
        )}
      </main>
    </>
  );
}
