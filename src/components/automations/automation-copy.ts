export const AUTOMATION_COPY = {
  pageTitle: 'Automazioni',
  newButton: '+ Nuova Automazione',
  empty: 'Nessuna automazione configurata.',
  emptyInstaller: 'Crea la prima automazione con il pulsante qui sopra.',
  loading: 'Caricamento automazioni…',
  errorLoad: 'Impossibile caricare le automazioni.',
  deleteConfirm: 'Eliminare questa automazione?',
  deleteError: 'Eliminazione fallita.',
  toggleError: 'Modifica stato fallita.',
  saveError: 'Salvataggio fallito.',

  // Wizard steps
  wizardTitle: 'Nuova Automazione',
  step1Title: 'Quando?',
  step2Title: 'Quale evento?',
  step3Title: 'Cosa fa?',
  step4Title: 'Dai un nome',
  next: 'Avanti',
  back: 'Indietro',
  save: 'Salva',
  cancel: 'Annulla',

  // Trigger types
  triggerSchedule: 'Ad un orario fisso',
  triggerMotion: 'Quando rileva movimento',
  triggerManual: 'Manualmente',

  // Motion states
  motionDetected: 'rilevato',
  motionAbsent: 'assente',

  // Action types
  actionTurnOn: 'Accendi un dispositivo',
  actionTurnOff: 'Spegni un dispositivo',

  // Days
  days: ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'],

  // Card labels
  when: 'Quando',
  does: 'Cosa fa',
  enabled: 'Attiva',
  disabled: 'Disattivata',
};

/**
 * Converte un trigger in testo leggibile.
 * deviceNames: mappa device_id → nome dispositivo
 */
export function triggerToText(
  trigger: Record<string, unknown>,
  deviceNames: Map<string, string>,
): string {
  const type = trigger.type as string;

  if (type === 'device_state') {
    const property = trigger.property as string;
    const value = trigger.value;
    const deviceId = trigger.device_id as string;
    const devName = deviceNames.get(String(deviceId)) ?? `Dispositivo ${deviceId}`;

    if (property === 'motion') {
      return value === true
        ? `Movimento rilevato (${devName})`
        : `Nessun movimento (${devName})`;
    }
    return `Stato ${property} cambia su ${devName}`;
  }

  if (type === 'schedule') {
    const cron = trigger.cron as string | undefined;
    if (cron) {
      const parsed = parseCron(cron);
      if (parsed) return parsed;
    }
    return `Programmato (${cron ?? '?'})`;
  }

  if (type === 'bus_event') {
    const deviceId = trigger.device_id as string | undefined;
    const devName = deviceId ? (deviceNames.get(String(deviceId)) ?? `Sensore ${deviceId}`) : 'Sensore';
    return `Evento sensore (${devName})`;
  }

  return `Trigger: ${type}`;
}

/**
 * Converte un array di azioni in testo leggibile.
 */
export function actionsToText(
  actions: Record<string, unknown>[],
  deviceNames: Map<string, string>,
): string {
  if (!actions || actions.length === 0) return 'Nessuna azione';
  return actions
    .map((a) => {
      const deviceId = a.device_id as string | undefined;
      const command = a.command as string | undefined;
      const devName = deviceId
        ? (deviceNames.get(String(deviceId)) ?? `Dispositivo ${deviceId}`)
        : '';
      if (command === 'turn_on') return `Accendi ${devName}`.trim();
      if (command === 'turn_off') return `Spegni ${devName}`.trim();
      return command ?? 'Azione sconosciuta';
    })
    .join(', ');
}

function parseCron(cron: string): string | null {
  // "0 23 * * *"  → "Ogni giorno alle 23:00"
  // "0 23 * * 1-5" → "Nei giorni feriali alle 23:00"
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [min, hour, , , dow] = parts;
  if (isNaN(Number(min)) || isNaN(Number(hour))) return null;
  const time = `${String(Number(hour)).padStart(2, '0')}:${String(Number(min)).padStart(2, '0')}`;
  if (dow === '1-5') return `Nei giorni feriali alle ${time}`;
  if (dow === '*') return `Ogni giorno alle ${time}`;
  return `Alle ${time} (${dow})`;
}
