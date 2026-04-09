import TopBar from '@/components/layout/TopBar';
import EnergySummaryCard from '@/components/energy/EnergySummaryCard';
import TopDevices from '@/components/energy/TopDevices';
import HourlyChart from '@/components/energy/HourlyChart';
import { getEnergySummary, getEnergyByDevice, getEnergyHourlyChart, getDefaultProjectId } from '@/lib/hub-client';

export const dynamic = 'force-dynamic';

export default async function EnergyPage() {
  const projectId = getDefaultProjectId();

  const [summaryRes, devicesRes, chartRes] = await Promise.allSettled([
    getEnergySummary(projectId),
    getEnergyByDevice(projectId),
    getEnergyHourlyChart(projectId, 24),
  ]);

  const summary = summaryRes.status === 'fulfilled' && summaryRes.value.ok ? summaryRes.value : null;
  const devices = devicesRes.status === 'fulfilled' && devicesRes.value.ok ? devicesRes.value.devices : null;
  const slots   = chartRes.status   === 'fulfilled' && chartRes.value.ok   ? chartRes.value.slots   : null;

  return (
    <>
      <TopBar title="Energia" />
      <main className="flex-1 p-5 space-y-6">
        <EnergySummaryCard data={summary} />
        <TopDevices devices={devices} />
        <HourlyChart slots={slots} />
      </main>
    </>
  );
}
