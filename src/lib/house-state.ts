import type { Device, Room } from './hub-types';

export interface Alert {
  type: 'battery_low' | 'battery_critical' | 'tamper' | 'gas' | 'offline';
  deviceId: string;
  label: string;
}

export interface CasaState {
  temperature: number | null;
  lux: number | null;
  motionActive: boolean;
  batteryWarnings: number;
  alerts: Alert[];
}

export interface RoomState {
  room: Room;
  temperature: number | null;
  lux: number | null;
  motionActive: boolean;
  lightsOn: number;
  lightsTotal: number;
}

function num(s: Record<string, unknown>, k: string): number | null {
  const v = s[k];
  return typeof v === 'number' ? v : null;
}

function bool(s: Record<string, unknown>, k: string): boolean | null {
  const v = s[k];
  return typeof v === 'boolean' ? v : null;
}

function deviceRoomId(d: Device): string | null {
  return d.room_id ?? (d as unknown as { room?: string | null }).room ?? null;
}

export function computeHouseState(devices: Device[]): CasaState {
  let temperature: number | null = null;
  let lux: number | null = null;
  let motionActive = false;
  let batteryWarnings = 0;
  const alerts: Alert[] = [];

  for (const d of devices) {
    const s = d.state ?? {};
    if (temperature === null) temperature = num(s, 'temperature');
    if (lux === null) lux = num(s, 'lux');
    if (bool(s, 'motion') === true) motionActive = true;

    const battery = num(s, 'battery');
    if (battery !== null && battery < 30) {
      batteryWarnings++;
      alerts.push({
        type: battery < 10 ? 'battery_critical' : 'battery_low',
        deviceId: d.id,
        label: `${d.name}: batteria ${battery}%`,
      });
    }
    if (bool(s, 'tamper') === true) {
      alerts.push({ type: 'tamper', deviceId: d.id, label: `${d.name}: manomissione` });
    }
    if (bool(s, 'gas') === true) {
      alerts.push({ type: 'gas', deviceId: d.id, label: `${d.name}: gas rilevato` });
    }
    if (!d.online && ['light', 'switch', 'plug', 'cover'].includes(d.type)) {
      alerts.push({ type: 'offline', deviceId: d.id, label: `${d.name}: non in linea` });
    }
  }

  return { temperature, lux, motionActive, batteryWarnings, alerts };
}

export function computeRoomStates(devices: Device[], rooms: Room[]): RoomState[] {
  return rooms.map((room) => {
    const devs = devices.filter((d) => deviceRoomId(d) === room.id);
    let temperature: number | null = null;
    let lux: number | null = null;
    let motionActive = false;
    let lightsOn = 0;
    let lightsTotal = 0;

    for (const d of devs) {
      const s = d.state ?? {};
      if (temperature === null) temperature = num(s, 'temperature');
      if (lux === null) lux = num(s, 'lux');
      if (bool(s, 'motion') === true) motionActive = true;
      if (['light', 'switch', 'plug'].includes(d.type)) {
        lightsTotal++;
        if (bool(s, 'on') === true) lightsOn++;
      }
    }

    return { room, temperature, lux, motionActive, lightsOn, lightsTotal };
  });
}
