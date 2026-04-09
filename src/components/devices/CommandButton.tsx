'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import type { Device } from '@/lib/hub-types';

const COMMANDS: Record<string, { action: string; label: string }[]> = {
  light:       [{ action: 'turn_on', label: 'On' }, { action: 'turn_off', label: 'Off' }],
  rgb_light:   [{ action: 'turn_on', label: 'On' }, { action: 'turn_off', label: 'Off' }],
  cover:       [{ action: 'turn_on', label: 'Open' }, { action: 'turn_off', label: 'Close' }],
  blind:       [{ action: 'turn_on', label: 'Open' }, { action: 'turn_off', label: 'Close' }],
  awning:      [{ action: 'turn_on', label: 'Open' }, { action: 'turn_off', label: 'Close' }],
  switch:      [{ action: 'turn_on', label: 'On' }, { action: 'turn_off', label: 'Off' }],
  plug:        [{ action: 'turn_on', label: 'On' }, { action: 'turn_off', label: 'Off' }],
  thermostat:  [{ action: 'set_temperature', label: 'Set Temp' }],
  alarm_panel: [{ action: 'arm', label: 'Arm' }, { action: 'disarm', label: 'Disarm' }],
  ev_charger:  [{ action: 'turn_on', label: 'Start' }, { action: 'turn_off', label: 'Stop' }],
};

const DEFAULT_CMDS = [{ action: 'turn_on', label: 'On' }, { action: 'turn_off', label: 'Off' }];

interface Props {
  device: Device;
  projectId: string;
}

export default function CommandButton({ device, projectId }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<'ok' | 'error' | null>(null);

  const cmds = COMMANDS[device.type] ?? DEFAULT_CMDS;

  async function dispatch(action: string) {
    setLoading(action);
    setResult(null);
    try {
      const res = await fetch(`/api/hub/devices/${encodeURIComponent(device.id)}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, action, params: {} }),
      });
      setResult(res.ok ? 'ok' : 'error');
    } catch {
      setResult('error');
    } finally {
      setLoading(null);
      setTimeout(() => setResult(null), 2000);
    }
  }

  if (!device.online) {
    return (
      <Button size="sm" variant="danger" disabled>
        Offline
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {cmds.map(({ action, label }) => (
        <Button
          key={action}
          size="sm"
          variant={result === 'ok' ? 'ghost' : result === 'error' ? 'danger' : 'secondary'}
          loading={loading === action}
          onClick={() => dispatch(action)}
        >
          {result === 'ok' && loading !== action ? '✓' : label}
        </Button>
      ))}
    </div>
  );
}
