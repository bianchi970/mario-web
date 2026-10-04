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

// Nodo radice Z-Wave: "4-ep1" → "4", "4-ep2" → "4", "4" → "4"
function rootNodeId(id: string): string {
  return id.replace(/-ep\d+$/, '');
}

export function computeHouseState(devices: Device[]): CasaState {
  let temperature: number | null = null;
  let lux: number | null = null;
  let motionActive = false;
  let batteryWarnings = 0;
  const alerts: Alert[] = [];
  const seenBatteryNodes = new Set<string>(); // dedup per nodo fisico

  for (const d of devices) {
    const s = d.state ?? {};
    if (temperature === null) temperature = num(s, 'temperature');
    if (lux === null) lux = num(s, 'lux');
    if (bool(s, 'motion') === true) motionActive = true;

    const battery = num(s, 'battery');
    const rootId = rootNodeId(d.id);
    if (battery !== null && battery < 30 && !seenBatteryNodes.has(rootId)) {
      seenBatteryNodes.add(rootId);
      batteryWarnings++;
      // Il nome e quello del NODO RADICE, non del primo endpoint incontrato.
      //
      // La batteria e una sola e sta nel dispositivo fisico; gli endpoint la
      // ripetono. Il dedup per nodo era gia corretto, ma l'avviso prendeva il
      // nome di `d`, cioe del primo che capitava nell'elenco — e il 2026-10-04
      // sulla casa vera diceva «Dispositivo Z-Wave 4ep1: batteria 0%», un nome
      // che MARIO si era dato da solo, al posto di «Riscaldamento Studio».
      //
      // Un endpoint non e una cosa per chi abita: se la radice c'e, parla lei.
      const root = devices.find((x) => x.id === rootId);
      const displayName = ((root ?? d).name).replace(/\s*\(controllo\)|\s*\(sensore\)/g, '').trim();
      alerts.push({
        type: battery < 10 ? 'battery_critical' : 'battery_low',
        deviceId: d.id,
        label: `${displayName}: batteria ${battery}%`,
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
