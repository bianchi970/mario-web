'use client';

import { useMemo, useState } from 'react';
import type { Device } from '@/lib/hub-types';
import DeviceCard from './DeviceCard';

type Filter = 'all' | 'online' | 'offline';

export default function DeviceList({ devices }: { devices: Device[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const types = useMemo(
    () => ['all', ...Array.from(new Set(devices.map((device) => device.type))).sort()],
    [devices],
  );

  const filtered = useMemo(() => {
    return devices.filter((device) => {
      if (filter === 'online' && !device.online) return false;
      if (filter === 'offline' && device.online) return false;
      if (typeFilter !== 'all' && device.type !== typeFilter) return false;
      if (search && !device.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [devices, filter, typeFilter, search]);

  const onlineCount = devices.filter((device) => device.online).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="search"
          placeholder="Cerca dispositivi..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="bg-hub-surface border border-hub-border rounded-lg px-3 py-1.5 text-sm text-hub-text placeholder-hub-muted focus:outline-none focus:border-hub-accent w-48"
        />
        <div className="flex gap-1">
          {(['all', 'online', 'offline'] as Filter[]).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === value
                  ? 'bg-hub-accent text-white'
                  : 'bg-hub-surface text-hub-muted border border-hub-border hover:text-hub-text'
              }`}
            >
              {value === 'all'
                ? `Tutti (${devices.length})`
                : value === 'online'
                  ? `In linea (${onlineCount})`
                  : `Non in linea (${devices.length - onlineCount})`}
            </button>
          ))}
        </div>
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="bg-hub-surface border border-hub-border rounded-lg px-3 py-1.5 text-sm text-hub-text focus:outline-none focus:border-hub-accent"
        >
          {types.map((type) => (
            <option key={type} value={type}>
              {type === 'all' ? 'Tutti i tipi' : type}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12 text-hub-muted">Nessun dispositivo corrisponde ai filtri</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      )}
    </div>
  );
}
