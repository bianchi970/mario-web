'use client';

import { useState, useMemo } from 'react';
import type { Device } from '@/lib/hub-types';
import DeviceCard from './DeviceCard';

type Filter = 'all' | 'online' | 'offline';

interface Props {
  devices: Device[];
  projectId: string;
}

export default function DeviceList({ devices, projectId }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const types = useMemo(
    () => ['all', ...Array.from(new Set(devices.map((d) => d.type))).sort()],
    [devices]
  );

  const filtered = useMemo(() => {
    return devices.filter((d) => {
      if (filter === 'online'  && !d.online)  return false;
      if (filter === 'offline' &&  d.online)  return false;
      if (typeFilter !== 'all' && d.type !== typeFilter) return false;
      if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [devices, filter, typeFilter, search]);

  const onlineCount = devices.filter((d) => d.online).length;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="search"
          placeholder="Search devices…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-hub-surface border border-hub-border rounded-lg px-3 py-1.5 text-sm text-hub-text placeholder-hub-muted focus:outline-none focus:border-hub-accent w-48"
        />
        <div className="flex gap-1">
          {(['all', 'online', 'offline'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-hub-accent text-white'
                  : 'bg-hub-surface text-hub-muted border border-hub-border hover:text-hub-text'
              }`}
            >
              {f === 'all' ? `All (${devices.length})` :
               f === 'online' ? `Online (${onlineCount})` :
               `Offline (${devices.length - onlineCount})`}
            </button>
          ))}
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-hub-surface border border-hub-border rounded-lg px-3 py-1.5 text-sm text-hub-text focus:outline-none focus:border-hub-accent"
        >
          {types.map((t) => (
            <option key={t} value={t}>{t === 'all' ? 'All types' : t}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12 text-hub-muted">No devices match filters</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((d) => (
            <DeviceCard key={d.id} device={d} projectId={projectId} />
          ))}
        </div>
      )}
    </div>
  );
}
