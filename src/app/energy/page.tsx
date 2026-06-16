'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import EnergySummaryCard from '@/components/energy/EnergySummaryCard';
import TopDevices from '@/components/energy/TopDevices';
import HourlyChart from '@/components/energy/HourlyChart';
import { useProjectId } from '@/hooks/useProjectId';
import { fetchAPI } from '@/lib/api/client';
import type {
  EnergySummary,
  EnergyByDeviceResult,
  EnergyHourlyChart,
} from '@/lib/hub-client';

export default function EnergyPage() {
  const projectId = useProjectId();

  const [summary,  setSummary]  = useState<EnergySummary | null>(null);
  const [devices,  setDevices]  = useState<EnergyByDeviceResult['devices'] | null>(null);
  const [slots,    setSlots]    = useState<EnergyHourlyChart['slots'] | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setSummary(null); setDevices(null); setSlots(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.allSettled([
      fetchAPI<EnergySummary>(`/api/hub/energy/${encodeURIComponent(projectId)}/summary`),
      fetchAPI<EnergyByDeviceResult>(`/api/hub/energy/${encodeURIComponent(projectId)}/by-device`),
      fetchAPI<EnergyHourlyChart>(`/api/hub/energy/${encodeURIComponent(projectId)}/hourly-chart?hours=24`),
    ]).then(([summaryRes, devicesRes, chartRes]) => {
      if (cancelled) return;
      setLoading(false);
      setSummary(summaryRes.status === 'fulfilled' && (summaryRes.value as { ok?: boolean }).ok !== false ? summaryRes.value : null);
      setDevices(devicesRes.status === 'fulfilled' ? (devicesRes.value as EnergyByDeviceResult).devices ?? null : null);
      setSlots(chartRes.status   === 'fulfilled' ? (chartRes.value   as EnergyHourlyChart).slots   ?? null : null);
      if (summaryRes.status === 'rejected' && devicesRes.status === 'rejected' && chartRes.status === 'rejected') {
        setError('Hub non raggiungibile');
      }
    });

    return () => { cancelled = true; };
  }, [projectId]);

  return (
    <>
      <TopBar title="Energia" />
      <main className="flex-1 p-5 space-y-6">

        {!projectId && (
          <div className="card text-center py-12 text-hub-muted">
            <p className="text-sm text-hub-text">Seleziona un progetto nelle Impostazioni.</p>
          </div>
        )}

        {loading && (
          <div className="card text-center py-12 text-hub-muted">
            <p className="text-sm">Caricamento dati energetici...</p>
          </div>
        )}

        {!loading && error && (
          <div className="card text-center py-8">
            <p className="text-sm text-hub-text">{error}</p>
            <p className="mt-1 text-xs text-hub-muted">Verifica che l&apos;Hub sia attivo.</p>
          </div>
        )}

        {!loading && !error && projectId && (
          <>
            <EnergySummaryCard data={summary} />
            <TopDevices devices={devices} />
            <HourlyChart slots={slots} />
          </>
        )}

      </main>
    </>
  );
}
